#!/usr/bin/env sh
# Linux-Setup: vom Repo-Root bis deploy.sh
# Nutzung: Nach dem Klonen: cd bestellen && ./scripts/setup-linux.sh [--with-supabase]

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

WITH_SUPABASE=false
for arg in "$@"; do
  case "$arg" in
    --with-supabase) WITH_SUPABASE=true ;;
  esac
done

echo "=== Linux-Setup: bestellen (Repo: $REPO_ROOT) ==="
echo ""

# --- Docker prüfen ---
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker ist nicht installiert. Bitte zuerst installieren:"
  echo "  https://docs.docker.com/engine/install/"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose (Plugin) fehlt. Bitte installieren:"
  echo "  https://docs.docker.com/compose/install/"
  exit 1
fi
echo "Docker + Compose: OK"
echo ""

# --- .env im Projektroot ---
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo ".env aus .env.example erstellt."
    echo "  Bitte .env bearbeiten: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_PASSWORD"
    echo ""
    if [ "$WITH_SUPABASE" = true ]; then
      echo "  Nach Supabase-Setup: ANON_KEY aus supabase-selfhost/.env hier als VITE_SUPABASE_ANON_KEY eintragen."
    fi
    echo ""
  else
    echo "Fehler: .env fehlt und .env.example nicht gefunden." >&2
    exit 1
  fi
else
  echo ".env vorhanden."
fi
echo ""

# --- Optional: Supabase Self-Host ---
if [ "$WITH_SUPABASE" = true ]; then
  if [ ! -f supabase-selfhost/docker-compose.yml ] && [ -d supabase-selfhost ]; then
    echo "=== Supabase Self-Host Setup ==="
    if [ -f supabase-selfhost/setup.sh ]; then
      chmod +x supabase-selfhost/setup.sh
      ./supabase-selfhost/setup.sh
      echo ""
      echo "Supabase .env in supabase-selfhost/.env anpassen (Secrets), dann:"
      echo "  cd supabase-selfhost && docker compose pull && docker compose up -d"
      echo "  Danach hier ANON_KEY in .env als VITE_SUPABASE_ANON_KEY eintragen und erneut ./scripts/setup-linux.sh ausführen (ohne --with-supabase)."
      echo ""
      exit 0
    fi
  fi
  if [ -d supabase-selfhost ] && [ -f supabase-selfhost/docker-compose.yml ]; then
    echo "Supabase-Dateien bereits vorhanden. Starte Supabase (falls gewünscht: cd supabase-selfhost && docker compose up -d)."
  fi
  echo ""
fi

# --- Traefik-Netzwerk (für deploy.sh) ---
if ! docker network inspect traefik-network >/dev/null 2>&1; then
  echo "Erstelle Docker-Netzwerk: traefik-network"
  docker network create traefik-network
  echo "  Hinweis: Traefik muss dieses Netzwerk nutzen. Falls du keinen Traefik-Proxy hast, docker-compose.yml anpassen oder Netzwerk in compose entfernen."
else
  echo "Docker-Netzwerk traefik-network: vorhanden"
fi
echo ""

# --- Deploy (build + up) ---
echo "=== Starte deploy.sh ==="
exec ./deploy.sh
