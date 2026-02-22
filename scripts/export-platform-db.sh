#!/usr/bin/env sh
# Exportiert die Datenbank des Supabase-Cloud-Projekts in 3 SQL-Dateien.
# Nutzung: PLATFORM_DB_URL="postgresql://..." ./scripts/export-platform-db.sh
# Ausgabe: migration-dumps/roles.sql, schema.sql, data.sql

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

OUT_DIR="${REPO_ROOT}/migration-dumps"
mkdir -p "$OUT_DIR"
cd "$OUT_DIR"

if [ -z "$PLATFORM_DB_URL" ]; then
  echo "Fehler: PLATFORM_DB_URL nicht gesetzt." >&2
  echo "  Connection String aus Supabase Dashboard → Connect kopieren (Session Pooler oder Direct)." >&2
  echo "  Beispiel: export PLATFORM_DB_URL=\"postgresql://postgres.[REF]:[PASSWORD]@aws-0-....supabase.co:5432/postgres\"" >&2
  exit 1
fi

echo "Exportiere nach $OUT_DIR ..."
echo "  roles.sql"
npx supabase db dump --db-url "$PLATFORM_DB_URL" -f roles.sql --role-only
echo "  schema.sql"
npx supabase db dump --db-url "$PLATFORM_DB_URL" -f schema.sql
echo "  data.sql"
npx supabase db dump --db-url "$PLATFORM_DB_URL" -f data.sql --use-copy --data-only
echo "Fertig. Nächster Schritt: Restore mit scripts/restore-to-selfhost.sh"
echo "  oder siehe docs/MIGRATE-TO-SELFHOSTED.md"
