#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Meridian MCN — restore Postgres + uploads from a snapshot produced by
# `backup.sh`.
#
# Usage:
#   ./restore.sh /var/backups/meridian/2026-05-11_02-00
#
# The directory must contain:
#   - meridian.dump        (pg_dump -F c)
#   - uploads.tar.gz       (tar -czf uploads)
#   - SHA256SUMS           (optional, used for verification)
#
# WARNING: this DROPS the existing public schema before restoring. Make sure
# nothing else writes to the DB while restore is in progress.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SRC="${1:-}"
if [[ -z "$SRC" || ! -d "$SRC" ]]; then
  echo "Usage: $0 <backup-folder>" >&2
  exit 1
fi

PG_CONTAINER="${PG_CONTAINER:-meridian-postgres}"
BE_CONTAINER="${BE_CONTAINER:-meridian-backend}"
ENV_FILE="${ENV_FILE:-$(dirname "$0")/../.env.prod}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi
: "${POSTGRES_DB:?POSTGRES_DB not set}"
: "${POSTGRES_USER:?POSTGRES_USER not set}"

# Optional integrity check before touching anything.
if [[ -f "$SRC/SHA256SUMS" ]]; then
  echo "[restore] verifying checksums…"
  ( cd "$SRC" && sha256sum -c SHA256SUMS )
fi

echo "[restore] WARNING: about to wipe and restore database $POSTGRES_DB"
read -r -p "Type 'YES' to continue: " ack
[[ "$ack" == "YES" ]] || { echo "aborted"; exit 1; }

# 1) Postgres — drop & recreate the public schema, then pg_restore.
echo "[restore] dropping schema public…"
docker exec -i "$PG_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

echo "[restore] pg_restore meridian.dump…"
docker exec -i "$PG_CONTAINER" pg_restore \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges \
  < "$SRC/meridian.dump"

# 2) Uploads — extract directly into the backend container's /app/uploads.
if [[ -f "$SRC/uploads.tar.gz" ]]; then
  echo "[restore] extracting uploads…"
  docker exec -i "$BE_CONTAINER" sh -c 'rm -rf /app/uploads && mkdir -p /app && tar -C /app -xzf -' \
    < "$SRC/uploads.tar.gz"
fi

echo "[restore] done. Restart backend to clear any cached state:"
echo "   docker compose -f docker-compose.prod.yml restart backend"
