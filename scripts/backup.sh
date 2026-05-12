#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Meridian MCN — daily backup of Postgres + uploads.
#
#   • pg_dump → custom format (.dump) to allow selective restore later.
#   • /app/uploads → tar.gz of the entire uploads volume.
#   • Both files land in $BACKUP_DIR/$DATE/.
#   • Retention: any folder older than $RETENTION_DAYS is removed.
#
# Designed to be invoked from cron, eg.:
#   0 2 * * * /opt/meridian-mcn/scripts/backup.sh >> /var/log/meridian-backup.log 2>&1
#
# Env vars (defaults shown):
#   BACKUP_DIR=/var/backups/meridian
#   RETENTION_DAYS=14
#   PG_CONTAINER=meridian-postgres
#   BE_CONTAINER=meridian-backend
#   ENV_FILE=/opt/meridian-mcn/.env.prod
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/meridian}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
PG_CONTAINER="${PG_CONTAINER:-meridian-postgres}"
BE_CONTAINER="${BE_CONTAINER:-meridian-backend}"
ENV_FILE="${ENV_FILE:-$(dirname "$0")/../.env.prod}"

# Pull DB credentials from the production env file so we don't hard-code them.
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi
: "${POSTGRES_DB:?POSTGRES_DB not set (check $ENV_FILE)}"
: "${POSTGRES_USER:?POSTGRES_USER not set (check $ENV_FILE)}"

DATE="$(date +%F_%H-%M)"
DEST="$BACKUP_DIR/$DATE"
mkdir -p "$DEST"

echo "[$(date -Is)] backup → $DEST"

# 1) Postgres custom-format dump (small, supports pg_restore --jobs).
docker exec "$PG_CONTAINER" pg_dump \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c \
  > "$DEST/meridian.dump"

# 2) Uploads tarball — stream from inside the backend container so we don't
#    depend on knowing the docker volume mount-point on the host.
docker exec "$BE_CONTAINER" tar -C /app -czf - uploads \
  > "$DEST/uploads.tar.gz"

# 3) Snapshot of the env file (perms preserved); useful when restoring on a
#    fresh host so secrets aren't lost. Excluded from retention pruning.
if [[ -f "$ENV_FILE" ]]; then
  cp -p "$ENV_FILE" "$DEST/env.prod.bak"
fi

# Compute checksums so we can verify the backup later.
( cd "$DEST" && sha256sum meridian.dump uploads.tar.gz > SHA256SUMS )

# 4) Retention — drop folders older than N days. Use -mindepth so we never
#    delete $BACKUP_DIR itself.
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime "+$RETENTION_DAYS" -print -exec rm -rf {} +

echo "[$(date -Is)] ok  ($(du -sh "$DEST" | cut -f1))"
