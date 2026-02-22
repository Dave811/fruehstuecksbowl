# Linux-Setup: Vom Klonen bis zum Deploy

Anleitung, um das **bestellen**-Projekt auf einem Linux-Server (oder -Rechner) vom leeren System bis zum Laufen zu bringen – inkl. optionalem selbst gehostetem Supabase.

## Übersicht

1. **Repo klonen**
2. **Optional:** Supabase selbst hosten (Docker Compose)
3. **App konfigurieren** (`.env`)
4. **Deploy ausführen** (`./deploy.sh`)

---

## Voraussetzungen

- **Git**
- **Docker** und **Docker Compose** (Plugin)
  - [Docker Engine installieren](https://docs.docker.com/engine/install/) (z. B. Ubuntu/Debian)
  - Compose ist oft schon als Plugin dabei; sonst [Compose installieren](https://docs.docker.com/compose/install/)

Optional für Produktion:

- **Traefik** als Reverse-Proxy (für HTTPS und Host `bestellen.hasshoff.net`). Das Projekt erwartet ein externes Docker-Netzwerk `traefik-network`. Ohne Traefik musst du `docker-compose.yml` anpassen (Labels/Netzwerk entfernen oder ersetzen).

---

## 1. Repo klonen

```bash
git clone https://github.com/DEIN_USER/bestellen.git
cd bestellen
```

(Ersetze die URL durch dein Repo, z. B. `git@github.com:...` wenn du SSH nutzt.)

---

## 2. Setup-Skript ausführen

Es gibt zwei Varianten:

### A) Nur App (Supabase Cloud oder bestehende Supabase-URL)

Du nutzt bereits eine Supabase-Instanz (z. B. [supabase.com](https://supabase.com)) oder hast die URL/Keys schon.

```bash
chmod +x scripts/setup-linux.sh
./scripts/setup-linux.sh
```

Das Skript:

- prüft Docker/Docker Compose,
- legt `.env` aus `.env.example` an, falls fehlend,
- erstellt das Docker-Netzwerk `traefik-network`, falls es noch nicht existiert,
- führt **deploy.sh** aus (Build + Start).

Vor dem ersten Lauf **.env** bearbeiten und eintragen:

- `VITE_SUPABASE_URL` – z. B. `https://dein-projekt.supabase.co`
- `VITE_SUPABASE_ANON_KEY` – Anon Key aus dem Supabase-Dashboard
- `VITE_ADMIN_PASSWORD` – dein gewünschtes Admin-Passwort

Dann erneut ausführen:

```bash
./scripts/setup-linux.sh
```

### B) Mit selbst gehostetem Supabase

Zuerst Supabase-Dateien holen und starten, danach App mit dieser Instanz verbinden.

**Schritt 1: Supabase-Setup (einmalig)**

```bash
chmod +x scripts/setup-linux.sh supabase-selfhost/setup.sh
./scripts/setup-linux.sh --with-supabase
```

Das Skript klont die offiziellen Supabase-Docker-Dateien nach `supabase-selfhost/` und legt dort eine `.env` an. Anschließend **musst du**:

1. **supabase-selfhost/.env** bearbeiten und alle Platzhalter ersetzen (Passwörter, JWT/ANON/SERVICE_ROLE Keys, Logflare, etc.). Siehe **supabase-selfhost/README.md**.
2. Optional: in `supabase-selfhost/` ausführen: `./utils/generate-keys.sh` (generiert viele Secrets).
3. Supabase starten:

   ```bash
   cd supabase-selfhost
   docker compose pull
   docker compose up -d
   cd ..
   ```

4. In der **Projekt-.env** (im Repo-Root) eintragen:
   - `VITE_SUPABASE_URL=http://DEINE_SERVER_IP:8000` (oder deine Domain, unter der Supabase erreichbar ist)
   - `VITE_SUPABASE_ANON_KEY=<ANON_KEY aus supabase-selfhost/.env>`
   - `VITE_ADMIN_PASSWORD=...`

**Schritt 2: App deployen**

```bash
./scripts/setup-linux.sh
```

(Diesmal **ohne** `--with-supabase` – das Skript erstellt ggf. `traefik-network` und führt **deploy.sh** aus.)

---

## 3. Was macht deploy.sh?

**deploy.sh** macht im Projektroot:

- Prüfung, ob `.env` existiert (mit Hinweis auf `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_PASSWORD`)
- `docker compose build --no-cache`
- `docker compose up -d`

Die **bestellen**-App wird gebaut (Vite/Bun) und per Nginx ausgeliefert. Bei Nutzung von Traefik erreichst du sie unter der in `docker-compose.yml` konfigurierten Host-Regel (z. B. `bestellen.hasshoff.net`).

---

## Kurzreferenz

| Schritt | Befehl |
|--------|--------|
| Repo klonen | `git clone <repo-url> && cd bestellen` |
| Nur App (mit bestehender Supabase) | `.env` anlegen/bearbeiten, dann `./scripts/setup-linux.sh` |
| Mit Self-Host-Supabase | `./scripts/setup-linux.sh --with-supabase` → Supabase-.env anpassen → Supabase starten → Projekt-.env setzen → `./scripts/setup-linux.sh` |
| Nur erneuter Deploy | `./deploy.sh` |
| Traefik-Netzwerk manuell | `docker network create traefik-network` |

---

## Ohne Traefik

Wenn du **keinen** Traefik-Proxy verwendest:

- In **docker-compose.yml** die `labels` und ggf. das Netzwerk `traefik-network` entfernen oder auskommentieren.
- Stattdessen z. B. Port-Mapping ergänzen: `ports: - "80:80"` beim Service **bestellen**, dann ist die App unter `http://<Server-IP>` erreichbar.
