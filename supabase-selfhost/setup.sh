#!/usr/bin/env sh
# Supabase Self-Hosting Setup (Linux/macOS)
# Klont das offizielle Supabase-Repo und kopiert die Docker-Dateien in diesen Ordner.

set -e
cd "$(dirname "$0")"

SUPABASE_REPO="https://github.com/supabase/supabase.git"
CLONE_DIR="./supabase-temp"

echo "Supabase Self-Host Setup"
echo ""

if [ -d "$CLONE_DIR" ]; then
  echo "Entferne bestehenden Klon..."
  rm -rf "$CLONE_DIR"
fi

echo "Klone Supabase (--depth 1)..."
git clone --depth 1 "$SUPABASE_REPO" "$CLONE_DIR"

DOCKER_SRC="$CLONE_DIR/docker"
if [ ! -d "$DOCKER_SRC" ]; then
  rm -rf "$CLONE_DIR"
  echo "Fehler: Ordner docker im Repo nicht gefunden." >&2
  exit 1
fi

echo "Kopiere Docker-Dateien..."
cp -rf "$DOCKER_SRC"/* .

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo ".env aus .env.example erstellt. Bitte Passwörter und Keys ändern!"
elif [ -f .env ]; then
  echo ".env existiert bereits, wird nicht überschrieben."
fi

echo "Lösche temporären Klon..."
rm -rf "$CLONE_DIR"

echo ""
echo "Setup abgeschlossen."
echo "Nächste Schritte:"
echo "  1. .env bearbeiten und alle Platzhalter-Passwörter/Keys ersetzen"
echo "  2. Optional: ./utils/generate-keys.sh"
echo "  3. docker compose pull"
echo "  4. docker compose up -d"
echo ""
echo "Studio/Dashboard: http://localhost:8000 (DASHBOARD_USERNAME / DASHBOARD_PASSWORD)"
