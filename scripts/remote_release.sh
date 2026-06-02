#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# remote_release.sh -- applied on the VPS by scripts/release.ps1.
#
# Pipeline executed on the VPS (idempotent + automatic rollback):
#
#   1. Detect the previous release (symlink) or migrate a legacy flat layout.
#   2. Backup DB + uploads into /var/backups/meridian/<TS> (retention 14d).
#   3. Extract the new tarball into releases/<TS>_<TAG>/ -- never overwrites
#      the running folder so we can roll back by flipping a symlink.
#   4. Copy `.env.prod` from the previous release (secrets stay constant).
#   5. Build images, then `up -d` backend + frontend (postgres stays up).
#   6. Health checks (postgres + frontend healthcheck, backend /api/health).
#   7. Pre-migration DB snapshot (kept: last 10).
#   8. Apply DB migrations — tracked via `schema_migrations` table, only
#      runs SQL files never seen before. Each file runs in a transaction;
#      a failure aborts the script and triggers ERR rollback.
#   9. Smoke test (backend health JSON + frontend HTTP 200).
#  10. On success: atomic symlink swap `current -> releases/<NEW>` + prune
#      (keep last 5 release dirs).
#      On failure: ERR trap restarts the previous release and removes the
#      half-built one. DB restore is manual (path printed).
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

# Forward-declare để rollback trap có thể đọc kể cả khi script die sớm.
PREV_RELEASE=""
SAFETY_ARMED=0   # set=1 khi bước Build/Start đã chạy → có gì để rollback

# Rollback: rebuild + recreate containers từ PREV_RELEASE source, drop NEW_RELEASE.
# CHẠY VIA `trap ... EXIT` để bắt được cả `die`/`exit 1` lẫn ERR thật.
rollback() {
  local rc=$?
  trap - EXIT ERR
  # Không rollback nếu script thành công hoặc chưa từng arm safety
  if [[ "$rc" -eq 0 || "$SAFETY_ARMED" -eq 0 ]]; then
    exit "$rc"
  fi

  warn "ROLLBACK (exit=$rc): previous release = ${PREV_RELEASE:-<none>}"
  warn "If migration ran and failed, restore DB manually:"
  warn "  pg_restore -U \$POSTGRES_USER -d \$POSTGRES_DB -c /var/backups/meridian/pre-migrate_*/meridian_pre_migrate.dump"

  if [[ -n "$PREV_RELEASE" && -d "$PREV_RELEASE" ]]; then
    pushd "$PREV_RELEASE" >/dev/null || true
    export COMPOSE_PROJECT_NAME="meridian-mcn"
    # Image latest đã bị build mới đè lên — bắt buộc rebuild từ source cũ
    # rồi force recreate container, nếu không FE/BE vẫn chạy code mới.
    warn "rebuilding images from PREV_RELEASE source..."
    docker compose -f "$COMPOSE_FILE" --env-file .env.prod build backend frontend || warn "prev rebuild had errors"
    docker compose -f "$COMPOSE_FILE" --env-file .env.prod up -d --force-recreate backend frontend || warn "prev recreate had errors"
    popd >/dev/null || true
    warn "rollback done — containers reverted to: $PREV_RELEASE"
  else
    warn "no PREV_RELEASE to roll back to — leaving containers as-is"
  fi
  rm -rf "$NEW_RELEASE"
  exit "$rc"
}
# EXIT trap firs cho mọi đường thoát (die/exit/ERR/Ctrl+C)
trap rollback EXIT

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

# From here on, any error → rollback EXIT trap sẽ revert containers.
SAFETY_ARMED=1

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

# 6. Pre-migration DB snapshot + Apply migrations (idempotent)
step "Pre-migration DB snapshot"
PRE_MIG_BACKUP="/var/backups/meridian/pre-migrate_$RELEASE_ID"
mkdir -p "$PRE_MIG_BACKUP"
# Read DB creds from .env.prod
set -a; source "$NEW_RELEASE/.env.prod"; set +a
docker exec meridian-postgres pg_dump \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c \
  > "$PRE_MIG_BACKUP/meridian_pre_migrate.dump" \
  && ok "pre-migration snapshot saved: $PRE_MIG_BACKUP/meridian_pre_migrate.dump" \
  || warn "pre-migration snapshot failed (continuing, but TAKE CARE)"

step "Apply DB migrations (tracked via schema_migrations)"
MIGRATIONS_DIR="$NEW_RELEASE/backend/migrations"
if [[ -d "$MIGRATIONS_DIR" ]]; then
  # Đảm bảo bảng tracking tồn tại — chỉ chạy file CHƯA được apply trước đó.
  docker exec meridian-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      checksum TEXT
    );" >/dev/null

  # ── Bootstrap: nếu DB đã có schema cũ (bảng `cms` tồn tại) nhưng
  #    schema_migrations còn trống → backfill toàn bộ file hiện có là
  #    "đã apply". Chỉ apply migrate mới (file thêm sau lần deploy này).
  schema_existed="$(docker exec meridian-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT to_regclass('public.cms') IS NOT NULL" 2>/dev/null | tr -d ' ' || echo "f")"
  migrations_count="$(docker exec meridian-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "SELECT COUNT(*) FROM schema_migrations" 2>/dev/null | tr -d ' ' || echo "0")"
  if [[ "$schema_existed" == "t" && "$migrations_count" == "0" ]]; then
    warn "Detected legacy DB without tracking — backfilling schema_migrations"
    for sql_file in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
      [[ -f "$sql_file" ]] || continue
      fname="$(basename "$sql_file")"
      checksum="$(sha256sum "$sql_file" | cut -d' ' -f1)"
      docker exec meridian-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c \
        "INSERT INTO schema_migrations (filename, checksum) VALUES ('$fname', '$checksum') ON CONFLICT DO NOTHING" >/dev/null
    done
    ok "backfill complete — existing migrations marked as applied"
  fi

  applied_count=0
  skipped_count=0
  for sql_file in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
    [[ -f "$sql_file" ]] || continue
    fname="$(basename "$sql_file")"

    # Skip nếu đã có trong schema_migrations
    already="$(docker exec meridian-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
      "SELECT 1 FROM schema_migrations WHERE filename='$fname'" 2>/dev/null || echo "")"
    if [[ "$already" == "1" ]]; then
      ((skipped_count++)) || true
      continue
    fi

    docker cp "$sql_file" meridian-postgres:/tmp/"$fname"
    checksum="$(sha256sum "$sql_file" | cut -d' ' -f1)"

    # Chạy trong transaction: SQL fail → tự rollback, không ghi vào schema_migrations
    if ! docker exec meridian-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -v ON_ERROR_STOP=1 --single-transaction -f /tmp/"$fname" 2>&1 \
        | grep -v "^$" | sed "s/^/    [$fname] /"; then
      die "migration $fname FAILED. Restore DB: pg_restore -U $POSTGRES_USER -d $POSTGRES_DB -c $PRE_MIG_BACKUP/meridian_pre_migrate.dump"
    fi

    # Đánh dấu đã apply
    docker exec meridian-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c \
      "INSERT INTO schema_migrations (filename, checksum) VALUES ('$fname', '$checksum')" >/dev/null
    ((applied_count++)) || true
    ok "$fname applied"
  done
  ok "migrations summary: applied=$applied_count skipped=$skipped_count"
else
  warn "no migrations directory found, skipping"
fi

# Cleanup pre-migrate snapshots — keep last 10
step "Prune pre-migrate snapshots (keep last 10)"
ls -1dt /var/backups/meridian/pre-migrate_* 2>/dev/null | tail -n +11 | while read -r old_snap; do
  [[ -d "$old_snap" ]] || continue
  warn "removing old pre-migrate snapshot: $old_snap"
  rm -rf "$old_snap"
done

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

# Disarm rollback — release đã thành công
SAFETY_ARMED=0

step "DONE -- $RELEASE_ID is live"
docker compose -f "$NEW_RELEASE/$COMPOSE_FILE" ps
exit 0
