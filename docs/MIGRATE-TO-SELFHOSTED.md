# Migration: Supabase Cloud → Self-Hosted

Anleitung, um **Datenbank**, **Storage** und Konfiguration von einem bestehenden Supabase-Cloud-Projekt in deine selbst gehostete Supabase-Instanz zu übernehmen.

## Übersicht

| Was | Wie |
|-----|-----|
| **Datenbank** (Schema, Daten, Auth-User, RLS) | Supabase CLI: `supabase db dump` → 3 SQL-Dateien → `psql` Restore auf Self-Hosted |
| **Storage** (Dateien in Buckets) | Manuell oder per Skript: von Cloud herunterladen, in Self-Hosted hochladen |
| **Auth-Konfiguration** (OAuth, SMTP) | In Self-Hosted `.env` eintragen (Provider-URLs auf neue Domain anpassen) |
| **API Keys / JWT** | Neu auf Self-Hosted generieren; App auf neue `VITE_SUPABASE_URL` und `ANON_KEY` umstellen |

**Wichtig:** Die Datenbank-Dumps der CLI sind Supabase-kompatibel (ohne interne System-Schemas). Rohes `pg_dump` direkt zu nutzen kann zu Rechten- und Schema-Problemen führen.

---

## Voraussetzungen

- **Supabase CLI** (z. B. `npx supabase` oder [installiert](https://supabase.com/docs/guides/local-development/cli/getting-started))
- **Docker** (wird von der CLI für `pg_dump` genutzt)
- **psql** (PostgreSQL-Client) auf dem Rechner, von dem aus du den Restore machst
- **Self-Hosted Supabase** läuft bereits (z. B. nach [supabase-selfhost/README.md](../supabase-selfhost/README.md))
- **Verbindungsdaten:**
  - **Cloud:** Connection String aus dem [Supabase Dashboard](https://supabase.com/dashboard) → Projekt → **Connect** (Session Pooler oder Direct)
  - **Self-Hosted:** `postgres://postgres.[POOLER_TENANT_ID]:[POSTGRES_PASSWORD]@[HOST]:5432/postgres` (Werte aus `supabase-selfhost/.env`)

---

## Schritt 1: Datenbank von der Cloud exportieren

Connection String der **Cloud**-Datenbank kopieren (Dashboard → Connect). Drei Dumps erzeugen:

**Mit Skript (empfohlen):**

```bash
export PLATFORM_DB_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-...supabase.co:5432/postgres"
./scripts/export-platform-db.sh
```

Die Dateien landen in `migration-dumps/` (roles.sql, schema.sql, data.sql). Dieser Ordner ist in `.gitignore`.

**Manuell:**

```bash
mkdir -p migration-dumps && cd migration-dumps
export PLATFORM_DB_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-...supabase.co:5432/postgres"
npx supabase db dump --db-url "$PLATFORM_DB_URL" -f roles.sql --role-only
npx supabase db dump --db-url "$PLATFORM_DB_URL" -f schema.sql
npx supabase db dump --db-url "$PLATFORM_DB_URL" -f data.sql --use-copy --data-only
```

**Optional (bei Fehlern beim Restore):** Wenn Self-Hosted auf Postgres 15 läuft und die Cloud auf 17, können in `data.sql` Zeilen vorkommen, die auf Postgres 15 fehlschlagen. Dann vor dem Restore:

```bash
# Nur falls nötig (Fehlermeldung zu transaction_timeout oder unbekannten Spalten/Tabellen)
sed -i 's/^SET transaction_timeout/-- &/' data.sql
# Ggf. einzelne COPY-Blöcke für nicht vorhandene Tabellen/Spalten in data.sql auskommentieren
```

---

## Schritt 2: Self-Hosted vorbereiten

- **Extensions:** Falls dein Cloud-Projekt Extensions nutzt, die nicht Standard sind, auf der Self-Hosted-DB aktivieren (z. B. in Studio → SQL: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` usw.). Welche du brauchst, siehst du in der Cloud-DB mit: `SELECT * FROM pg_extension;`
- Self-Hosted läuft und ist von deinem Rechner aus erreichbar (Port 5432 oder 6543 je nach Verbindung).

---

## Schritt 3: Datenbank auf Self-Hosted wiederherstellen

Connection String für **Self-Hosted** (Werte aus `supabase-selfhost/.env`: `POOLER_TENANT_ID`, `POSTGRES_PASSWORD`; Host = dein Server oder `localhost`):

**Mit Skript:**

```bash
export SELFHOST_DB_URL="postgres://postgres.POOLER_TENANT_ID:POSTGRES_PASSWORD@DEIN_HOST:5432/postgres"
./scripts/restore-to-selfhost.sh
```

**Manuell:**

```bash
cd migration-dumps
export SELFHOST_DB_URL="postgres://postgres.POOLER_TENANT_ID:POSTGRES_PASSWORD@DEIN_HOST:5432/postgres"
psql "$SELFHOST_DB_URL" \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql
```

`session_replication_role = replica` deaktiviert Trigger beim Import (vermeidet z. B. doppelte Verschlüsselung).

**Prüfen:**

```bash
psql "$SELFHOST_DB_URL" -c "\dt public.*"
psql "$SELFHOST_DB_URL" -c "SELECT count(*) FROM auth.users;"
```

---

## Schritt 4: Storage-Migration (Dateien)

Die DB enthält nur die **Metadaten** der Storage-Objekte (Buckets, Dateien in `storage.objects`). Die eigentlichen **Dateien** musst du separat übertragen.

### Option A: Manuell

- **Cloud:** Im Supabase Dashboard → Storage → Bucket(s) → Dateien herunterladen.
- **Self-Hosted:** In Studio (z. B. `http://dein-server:8000`) dieselben Buckets anlegen und die Dateien hochladen.

### Option B: Skript (Download von Cloud, Upload zu Self-Hosted)

Mit **Bun** (im Projekt bereits vorhanden) kannst du alle Storage-Buckets von Cloud nach Self-Hosted kopieren:

```bash
export PLATFORM_URL="https://dein-projekt.supabase.co"
export PLATFORM_SERVICE_ROLE_KEY="eyJ..."   # Aus Cloud-Dashboard → Settings → API
export SELFHOST_URL="http://dein-server:8000"
export SELFHOST_SERVICE_ROLE_KEY="eyJ..."   # SERVICE_ROLE_KEY aus supabase-selfhost/.env

bun run scripts/migrate-storage.ts
```

Optional: Nur einen Bucket kopieren → `export PLATFORM_STORAGE_BUCKET=mein-bucket`

---

## Schritt 5: Nach der Migration

1. **App-Konfiguration**
   - In der **bestellen**-`.env`: `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` auf die Self-Hosted-Instanz und den neuen Anon-Key setzen (aus `supabase-selfhost/.env`: `ANON_KEY`).
   - App neu bauen/deployen.

2. **Auth**
   - Bestehende User sind in `auth.users` und funktionieren. **Neue JWTs** kommen von Self-Hosted; alte Cloud-Tokens sind ungültig – User müssen sich ggf. neu einloggen.
   - OAuth (Google, GitHub, …): In den Provider-Konsolen die Redirect-URLs auf deine Self-Hosted-URL umstellen (z. B. `https://dein-server:8000/auth/v1/callback`).
   - In `supabase-selfhost/.env` die GoTrue-/Auth-Variablen setzen (SMTP, OAuth Client IDs/Secrets), siehe [Supabase Auth Config](https://supabase.com/docs/guides/self-hosting/auth/config).

3. **Dump-Ordner nicht committen**
   - `migration-dumps/` mit den SQL-Dateien und ggf. heruntergeladenen Dateien in `.gitignore` lassen oder außerhalb des Repos ablegen.

---

## Kurzreferenz

| Aktion | Befehl / Ort |
|--------|----------------|
| Export Roles | `npx supabase db dump --db-url "<CLOUD_URL>" -f roles.sql --role-only` |
| Export Schema | `npx supabase db dump --db-url "<CLOUD_URL>" -f schema.sql` |
| Export Data | `npx supabase db dump --db-url "<CLOUD_URL>" -f data.sql --use-copy --data-only` |
| Restore | `SELFHOST_DB_URL="..." ./scripts/restore-to-selfhost.sh` oder psql (siehe Doku) |
| Storage | Manuell oder `bun run scripts/migrate-storage.ts` (mit PLATFORM_* / SELFHOST_* Env) |

Offizielle Doku: [Restore a Platform Project to Self-Hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform).
