#!/usr/bin/env sh
# Stellt die zuvor exportierten SQL-Dumps (roles, schema, data) in der Self-Hosted-DB wieder her.
# Nutzung: SELFHOST_DB_URL="postgres://..." ./scripts/restore-to-selfhost.sh
# Erwartet: migration-dumps/roles.sql, schema.sql, data.sql

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${REPO_ROOT}/migration-dumps"

if [ -z "$SELFHOST_DB_URL" ]; then
  echo "Fehler: SELFHOST_DB_URL nicht gesetzt." >&2
  echo "  Format: postgres://postgres.POOLER_TENANT_ID:POSTGRES_PASSWORD@HOST:5432/postgres" >&2
  echo "  Werte aus supabase-selfhost/.env (POOLER_TENANT_ID, POSTGRES_PASSWORD); HOST = Server oder localhost." >&2
  exit 1
fi

for f in roles.sql schema.sql data.sql; do
  if [ ! -f "$OUT_DIR/$f" ]; then
    echo "Fehler: $OUT_DIR/$f fehlt. Zuerst scripts/export-platform-db.sh ausführen." >&2
    exit 1
  fi
done

echo "Restore nach Self-Hosted-DB..."
psql "$SELFHOST_DB_URL" \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "$OUT_DIR/roles.sql" \
  --file "$OUT_DIR/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$OUT_DIR/data.sql"

echo "Fertig. Prüfen mit: psql \"\$SELFHOST_DB_URL\" -c \"\\dt public.*\" -c \"SELECT count(*) FROM auth.users;\""
