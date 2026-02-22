# Supabase selbst hosten (Docker Compose)

Dieser Ordner dient dem Self-Hosting von [Supabase](https://supabase.com) mit der offiziellen Docker-Compose-Umgebung. Deine App (z. B. **bestellen**) kann danach gegen diese lokale/ eigene Instanz laufen.

## Voraussetzungen

- **Docker** und **Docker Compose** (z. B. [Docker Desktop für Windows](https://docs.docker.com/desktop/install/windows-install/))
- **Git**
- Empfohlene Ressourcen: 4 GB RAM (besser 8 GB+), 2 CPU-Kerne, 50 GB SSD

## Schnellstart

### 1. Setup ausführen (einmalig)

Im Ordner `supabase-selfhost`:

- **Windows (PowerShell):** `.\setup.ps1`
- **Linux/macOS:** `chmod +x setup.sh && ./setup.sh`

Das Skript klont das offizielle Supabase-Repo (nur letzter Stand), kopiert alle Docker-Dateien hierher und legt eine `.env` aus `.env.example` an.

### 2. Konfiguration und Sicherheit

**Wichtig:** Die Platzhalter in `.env` dürfen **nicht** in Produktion genutzt werden. Vor dem ersten Start musst du mindestens:

| Variable | Beschreibung |
|----------|--------------|
| `POSTGRES_PASSWORD` | Passwort für Postgres/Supabase-Admin (stark, nur Buchstaben/Zahlen empfohlen) |
| `JWT_SECRET` | Mind. 32 Zeichen; Basis für JWT-Signatur |
| `ANON_KEY` / `SERVICE_ROLE_KEY` | Mit dem [Supabase Key Generator](https://supabase.com/docs/guides/self-hosting/docker#generate-and-configure-api-keys) erzeugen und in `.env` eintragen |
| `DASHBOARD_PASSWORD` | Passwort für Supabase Studio (Dashboard); mind. einen Buchstaben, keine Sonderzeichen |
| `VAULT_ENC_KEY` | Genau 32 Zeichen (z. B. `openssl rand -hex 16`) |
| `PG_META_CRYPTO_KEY` | Mind. 32 Zeichen (z. B. `openssl rand -base64 24`) |
| `SECRET_KEY_BASE` | Mind. 64 Zeichen (z. B. `openssl rand -base64 48`) |
| `LOGFLARE_PUBLIC_ACCESS_TOKEN` / `LOGFLARE_PRIVATE_ACCESS_TOKEN` | Jeweils mind. 32 Zeichen |

**Option:** Unter Git Bash kannst du einmal alle Secrets generieren:

```bash
sh ./utils/generate-keys.sh
```

Anschließend `.env` prüfen und ggf. anpassen.

### 3. Starten

```powershell
docker compose pull
docker compose up -d
```

Status prüfen (nach etwa 1 Minute sollten die Services „healthy“ sein):

```powershell
docker compose ps
```

### 4. Zugriff

| Dienst | URL (lokal) |
|--------|-------------|
| **Supabase Studio** (Dashboard) | http://localhost:8000 |
| **API (REST, Auth, Storage, Realtime)** | http://localhost:8000 (z. B. `/rest/v1/`, `/auth/v1/`, …) |

Studio-Login: `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` aus `.env`.

**Postgres (über Supavisor):**

- Session-Modus (direkt): `postgres://postgres.[POOLER_TENANT_ID]:[POSTGRES_PASSWORD]@localhost:5432/postgres`
- Transaction-Pool: Port `6543` statt `5432`

(Ersetze `[POOLER_TENANT_ID]` und `[POSTGRES_PASSWORD]` mit Werten aus `.env`.)

### 5. App anbinden

In deinem Projekt (z. B. `.env` im Hauptverzeichnis):

```env
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=<ANON_KEY aus supabase-selfhost/.env>
```

Dann Frontend neu bauen/starten. Für Zugriff von anderen Rechnern (z. B. Handy) `localhost` durch die IP deines PCs ersetzen und ggf. `SITE_URL` / `API_EXTERNAL_URL` / `SUPABASE_PUBLIC_URL` in `supabase-selfhost/.env` anpassen.

## Nützliche Befehle

| Aktion | Befehl |
|--------|--------|
| Stoppen | `docker compose down` |
| Stoppen inkl. Daten löschen | `docker compose down -v` |
| Logs eines Services | `docker compose logs <service>` (z. B. `analytics`, `db`) |
| Updates | `docker compose pull` dann `docker compose down && docker compose up -d` |

## Optionale Anpassungen

- **E-Mail (SMTP):** In `.env` `SMTP_*` setzen (z. B. AWS SES), dann alle Services neu starten.
- **S3-Storage:** Siehe offizielle Doku [Configure S3 Storage](https://supabase.com/docs/guides/self-hosting/self-hosted-s3) und ggf. `docker-compose.s3.yml`.
- **Ressourcen reduzieren:** Unnötige Services (z. B. Logflare, Realtime, imgproxy) in `docker-compose.yml` auskommentieren oder entfernen.

## Referenzen

- [Self-Hosting with Docker | Supabase Docs](https://supabase.com/docs/guides/self-hosting/docker)
- [Supabase Docker (GitHub)](https://github.com/supabase/supabase/tree/master/docker)
