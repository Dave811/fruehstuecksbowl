#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Fehler: .env fehlt. Bitte .env mit VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_PASSWORD anlegen."
  exit 1
fi

echo "Build und Start..."
docker compose build --no-cache
docker compose up -d
echo "Fertig."
