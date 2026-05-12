#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# remote_release.sh -- applied on the VPS by scripts/release.ps1.
#
# Pipeline executed on the VPS (idempotent + automatic rollback):
#
#   1. Detect the previous release (symlink) or migrate a legacy flat layout.
#   2. Backup DB + uploads into /var/backups/meridian/<TS>.
#   3. Extract the new tarball into releases/<TS>_<TAG>/ -- never overwrites
#      the running folder so we can roll back by flipping a symlink.
#   4. Copy `.env.prod` from the previous release (secrets stay constant).
#   5. Build images, then `up -d` backend + frontend (postgres stays up).
#   6. Smoke test:
#        - meridian-postgres / meridian-frontend healthcheck = healthy
#        - backend GET /api/health -> 200 with `"ok":true`
#        - frontend GET / -> 200
#   7. On success: atomic symlink swap `current -> releases/<NEW>` + prune.
#      On failure: ERR trap restarts the previous release and removes the
#      half-built one.
#
# Environment expected:
#   RELEASE_ID    required, e.g. 2026-05-11_14-30-00_abc1234
#   DEPLOY_DIR    required, e.g. /opt/meridian-mcn
#   --skip-backup  optional
# -----------------------------------------------------------------------------
set -euo pipefail

SKIP_BACKUP=0
for arg in "$@"; do
  case "$arg" in
    --skip-backup) SKIP_BACKUP=1 ;;
  esac
done

: "${RELEASE_ID:?RELEASE_ID required}"
: "${DEPLOY_DIR:?DEPLOY_DIR required}"

RELEASES_DIR="$DEPLOY_DIR/releases"
CURRENT_LINK="$DEPLOY_DIR/current"
NEW_RELEASE="$RELEASES_DIR/$RELEASE_ID"
TARBALL="/tmp/release-$RELEASE_ID.tar.gz"
COMPOSE_FILE="docker-compose.prod.yml"

step()  { printf '\n\033[1;36m>>> %s\033[0m\n' "$*"; }
ok()    { printf '\033[1;32m   OK %s\033[0m\n' "$*"; }
warn()  { printf '\033[1;33m   !! %s\033[0m\n' "$*"; }
die()   { printf '\033[1;31mERR %s\033[0m\n' "$*"; exit 1; }

# Forward-declare PREV_RELEASE so the rollback trap can read it even if we
# die before the discovery step assigns it.
PREV_RELEASE=""

# Rollback: bring the previous release back up and drop the half-built one.
# Triggered automatically by `trap ... ERR` from the build/start step onward.
rollback() {
  local rc=$?
  warn "ROLLBACK (exit=$rc): previous release = ${PREV_RELEASE:-<none>}"
  if [[ -n "$PREV_RELEASE" && -d "$PREV_RELEASE" ]]; then
    pushd "$PREV_RELEASE" >/dev/null || true
    export COMPOSE_PROJECT_NAME="meridian-mcn"
    docker compose -f "$COMPOSE_FILE" --env-file .env.prod up -d backend frontend || true
    popd >/dev/null || true
  fi
  rm -rf "$NEW_RELEASE"
  exit "$rc"
}

mkdir -p "$RELEASES_DIR"

# 0. Detect previous release (for rollback)
#
# Two layouts are supported:
#   * Releases layout:   $DEPLOY_DIR/current -> $DEPLOY_DIR/releases/<ID>
#   * Legacy flat layout: source files live directly under $DEPLOY_DIR
#
# On the first release we migrate the legacy layout by copying it into
# releases/_legacy so we have something to roll back to.
if [[ -L "$CURRENT_LINK" ]]; then
  PREV_RELEASE="$(readlink -f "$CURRENT_LINK")"
  ok "previous release (symlinked): $PREV_RELEASE"
elif [[ -f "$DEPLOY_DIR/$COMPOSE_FILE" ]]; then
  warn "legacy flat layout detected -- snapshotting it as releases/_legacy"
  LEGACY_REL="$RELEASES_DIR/_legacy"
  rm -rf "$LEGACY_REL"
  mkdir -p "$LEGACY_REL"
  ( cd "$DEPLOY_DIR" && find . -mindepth 1 -maxdepth 1 \
      ! -name 'releases' ! -name 'current' \
      -exec cp -a {} "$LEGACY_REL/" \; )
  PREV_RELEASE="$LEGACY_REL"
  ok "legacy snapshot saved at $PREV_RELEASE"
fi

# 1. Backup
if [[ $SKIP_BACKUP -eq 0 ]]; then
  step "Backup DB + uploads"
  if [[ -x "$DEPLOY_DIR/scripts/backup.sh" ]]; then
    "$DEPLOY_DIR/scripts/backup.sh" || die "backup failed"
  elif [[ -n "$PREV_RELEASE" && -x "$PREV_RELEASE/scripts/backup.sh" ]]; then
    "$PREV_RELEASE/scripts/backup.sh" || die "backup failed"
  else
    warn "no backup script found, skipping (first release?)"
  fi
else
  warn "skipping backup (--skip-backup)"
fi

# 2. Extract new release
step "Extract new release -> $NEW_RELEASE"
[[ -f "$TARBALL" ]] || die "tarball not found at $TARBALL"
rm -rf "$NEW_RELEASE"
mkdir -p "$NEW_RELEASE"
tar -xzf "$TARBALL" -C "$NEW_RELEASE"
ok "extracted"

# 3. Wire up shared state (.env.prod) from previous release.
step "Wire shared state (.env.prod from previous release)"
ENV_SRC=""
if [[ -f "$DEPLOY_DIR/.env.prod" ]]; then
  ENV_SRC="$DEPLOY_DIR/.env.prod"
elif [[ -n "$PREV_RELEASE" && -f "$PREV_RELEASE/.env.prod" ]]; then
  ENV_SRC="$PREV_RELEASE/.env.prod"
fi
[[ -n "$ENV_SRC" ]] || die ".env.prod not found in deploy dir or previous release"
cp "$ENV_SRC" "$NEW_RELEASE/.env.prod"
chmod 600 "$NEW_RELEASE/.env.prod"
ok "copied .env.prod from $ENV_SRC"

chmod +x "$NEW_RELEASE/scripts/"*.sh 2>/dev/null || true

# From here on, any error should trigger automatic rollback.
trap rollback ERR

# 4. Build + start new stack
step "Build images for new release"
cd "$NEW_RELEASE"
docker compose -f "$COMPOSE_FILE" --env-file .env.prod build

step "Recreate backend + frontend (postgres untouched)"
# Pin the compose project name so all releases share the same named volumes
# (pgdata, uploads_data) and we don't end up with multiple parallel DBs.
export COMPOSE_PROJECT_NAME="meridian-mcn"
docker compose -f "$COMPOSE_FILE" --env-file .env.prod up -d --build --remove-orphans backend frontend
docker compose -f "$COMPOSE_FILE" --env-file .env.prod up -d postgres

# 5. Wait for healthy
wait_healthy() {
  local name="$1" timeout="${2:-60}" i=0
  while (( i < timeout )); do
    local state
    state="$(docker inspect -f '{{.State.Health.Status}}' "$name" 2>/dev/null || echo missing)"
    if [[ "$state" == "healthy" ]]; then ok "$name healthy"; return 0; fi
    sleep 1; ((i++))
  done
  return 1
}

step "Wait for healthchecks"
wait_healthy meridian-postgres 60 || die "postgres not healthy"
wait_healthy meridian-frontend 90 || die "frontend not healthy"

# Backend image has no healthcheck declared -- probe its endpoint instead.
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:4010/api/health; then
    ok "backend /api/health reachable"
    break
  fi
  sleep 1
done

# 6. Apply DB migrations (idempotent — safe to run on every release)
step "Apply DB migrations"
MIGRATIONS_DIR="$NEW_RELEASE/backend/migrations"
if [[ -d "$MIGRATIONS_DIR" ]]; then
  for sql_file in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$sql_file" ]] || continue
    fname="$(basename "$sql_file")"
    docker cp "$sql_file" meridian-postgres:/tmp/"$fname"
    docker exec meridian-postgres psql -U meridian -d meridian \
      -v ON_ERROR_STOP=0 -f /tmp/"$fname" 2>&1 \
      | grep -v "^$" | sed "s/^/    [$fname] /" || true
    ok "$fname applied"
  done
else
  warn "no migrations directory found, skipping"
fi

# 7. Smoke test
step "Smoke test"
hc="$(curl -fsS --max-time 5 http://127.0.0.1:4010/api/health || echo '')"
echo "    backend /api/health -> $hc"
case "$hc" in
  *'"ok":true'*) ok "backend health OK" ;;
  *)             die "backend health JSON unexpected: $hc" ;;
esac

fe_code="$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' http://127.0.0.1:8080/)"
[[ "$fe_code" == "200" ]] || die "frontend HTTP=$fe_code (expected 200)"
ok "frontend HTTP 200"

# 7. Activate (atomic symlink swap)
step "Activate new release"
ln -sfn "$NEW_RELEASE" "$CURRENT_LINK.new"
mv -Tf "$CURRENT_LINK.new" "$CURRENT_LINK"
ok "symlink current -> $NEW_RELEASE"

# 8. Prune old releases (keep last 5)
step "Prune old releases (keep last 5)"
cd "$RELEASES_DIR"
ls -1tr | head -n -5 | while read -r old; do
  [[ -n "$old" && -d "$old" && "$old" != "$RELEASE_ID" ]] || continue
  warn "removing old release: $old"
  rm -rf "$old"
done

docker image prune -f >/dev/null 2>&1 || true
rm -f "$TARBALL"
date -Iseconds > "$DEPLOY_DIR/.last_release"
echo "$RELEASE_ID" >> "$DEPLOY_DIR/.last_release"

trap - ERR

step "DONE -- $RELEASE_ID is live"
docker compose -f "$NEW_RELEASE/$COMPOSE_FILE" ps
exit 0
