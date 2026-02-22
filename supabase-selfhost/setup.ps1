# Supabase Self-Hosting Setup
# Klont das offizielle Supabase-Repo und kopiert die Docker-Dateien in diesen Ordner.

$ErrorActionPreference = "Stop"
$SupabaseRepo = "https://github.com/supabase/supabase.git"
$CloneDir = Join-Path $PSScriptRoot "supabase-temp"

Write-Host "Supabase Self-Host Setup" -ForegroundColor Cyan
Write-Host ""

# Temporär klonen
if (Test-Path $CloneDir) {
    Write-Host "Entferne bestehenden Klon..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $CloneDir
}

Write-Host "Klone Supabase (--depth 1)..." -ForegroundColor Yellow
git clone --depth 1 $SupabaseRepo $CloneDir | Out-Null

$DockerSrc = Join-Path $CloneDir "docker"
if (-not (Test-Path $DockerSrc)) {
    Remove-Item -Recurse -Force $CloneDir -ErrorAction SilentlyContinue
    throw "Ordner docker im Repo nicht gefunden."
}

Write-Host "Kopiere Docker-Dateien..." -ForegroundColor Yellow
Copy-Item -Path "$DockerSrc\*" -Destination $PSScriptRoot -Recurse -Force

# .env aus Beispiel anlegen, falls noch nicht vorhanden
$EnvExample = Join-Path $PSScriptRoot ".env.example"
$EnvFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $EnvFile) -and (Test-Path $EnvExample)) {
    Copy-Item $EnvExample $EnvFile
    Write-Host ".env aus .env.example erstellt. Bitte Passwoerter und Keys aendern!" -ForegroundColor Green
} elseif (Test-Path $EnvFile) {
    Write-Host ".env existiert bereits, wird nicht ueberschrieben." -ForegroundColor Gray
}

# Aufräumen
Write-Host "Loesche temporaeren Klon..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $CloneDir

Write-Host ""
Write-Host "Setup abgeschlossen." -ForegroundColor Green
Write-Host "Naechste Schritte:" -ForegroundColor Cyan
Write-Host "  1. .env bearbeiten und alle Platzhalter-Passwoerter/Keys ersetzen"
Write-Host "  2. Optional: .\utils\generate-keys.sh (Git Bash) oder Keys manuell setzen"
Write-Host "  3. docker compose pull"
Write-Host "  4. docker compose up -d"
Write-Host ""
Write-Host "Studio/Dashboard: http://localhost:8000 (DASHBOARD_USERNAME / DASHBOARD_PASSWORD)" -ForegroundColor Gray
