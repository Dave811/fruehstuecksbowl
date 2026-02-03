# Projekt: Frühstücksbowls – Bestellsystem (React + HeroUI)

Ziel: Eine Web-App, die per QR-Code aufgerufen wird. Schüler*innen können **individuell** Bestellungen konfigurieren (mehrere Ebenen/Kategorien wie Basis, Marmelade, Obst, Chia …), ihre Bestellung bis zur **Deadline** jederzeit wieder öffnen und bearbeiten. Nach Deadline werden Bestellungen **blockiert**. Die Projektklasse/Lehrkraft sieht ein Dashboard mit Bestellungen + Statistik und kann **Einkaufsliste** (mit Umrechnungen auf Packungsgrößen) sowie **Zubereitungsanleitungen pro Bestellung** (mit Bildern) drucken.

UI Framework: **HeroUI** (https://www.heroui.com/) auf React/Tailwind. HeroUI basiert auf Tailwind CSS v4 und braucht i. d. R. `HeroUIProvider`. :contentReference[oaicite:0]{index=0}

---

## 0) Nicht-Ziele / Rahmen
- Kein „echtes“ Schüler-Login mit Passwort.
- Keine Zahlungsabwicklung.
- Fokus auf einfache Bedienung + Ausdrucke.
- Datenschutz: Geburtsdatum nicht im Klartext speichern (nur Hash).

---

## 1) Tech-Stack (v1 Empfehlung)
### Frontend
- React 18+ (Vite)
- TypeScript
- **HeroUI** Komponenten (z. B. Button, Input, Select, Checkbox, Card, Table, Tabs, Modal) :contentReference[oaicite:1]{index=1}
- Tailwind CSS v4 (Pflicht für HeroUI) :contentReference[oaicite:2]{index=2}
- React Router

### Backend
- Node.js (Express oder Fastify)
- Prisma ORM
- Datenbank: SQLite (für Start) oder PostgreSQL (wenn Serverbetrieb geplant)
- Datei-Upload für Zutatenbilder (lokal `/uploads`), statisch ausliefern

### Deployment (optional, aber empfohlen)
- Docker Compose: `frontend`, `backend`, (optional `db` bei Postgres)
- Reverse Proxy (Traefik/Nginx) möglich

---

## 2) Rollen & Berechtigungen
### Schüler*innen
- Bestellen über `/order` (QR-Code führt dorthin)
- Beim ersten Besuch: Name + Geburtsdatum + Klasse einmalig eingeben
- Danach: Bestellung einer Bestellrunde ansehen/ändern, solange nicht gesperrt

### Projektklasse / Lehrkraft (Admin)
- Login via PIN/Passwort (separates Admin-Auth)
- Verwaltung:
  - Ebenen/Kategorien (z. B. Basis, Marmelade, Obst, Chia …)
  - Zutaten inkl. Portionen, Einkaufseinheiten, Bilder
  - Bestellrunden + Deadline/Lock
- Einsicht:
  - Bestellungen (Filter, Export/Print)
  - Statistik
  - Druck: Einkaufsliste + Zubereitungszettel + „Anleitungskarten“ pro Bestellung

---

## 3) Kern-User-Flow (Schüler)
1. QR-Code scannen → öffnet `/order` (optional mit `?cycle=YYYY-WW`).
2. App prüft Session:
   - Wenn kein gültiges Token im Browser vorhanden → Schritt „Registrierung light“:
     - Name (Text)
     - Geburtsdatum (Datum)
     - Klasse (Dropdown)
     - Button: „Weiter“
3. Danach landet Nutzer*in auf Konfigurator:
   - Ebenen/Kategorien in definierter Reihenfolge
   - Regeln pro Ebene (min/max)
   - Live-Validierung
4. „Bestellen / Speichern“:
   - wenn Deadline überschritten oder Runde gelockt → UI blockiert, Backend verweigert.
5. Später erneut QR scannen:
   - Token vorhanden → Bestellung wird geladen, kann bearbeitet werden (bis Deadline).
   - Token fehlt (anderes Gerät / Storage gelöscht) → Name+Geburtsdatum eingeben → bestehender User wird gefunden → Token neu ausgestellt.

**Hinweis zur „Handy-ID“:** Es wird keine Hardware-ID genutzt. Identifikation erfolgt über Name+DOB-Hash + Session-Token.

---

## 4) Deadline / Sperrlogik
- Pro Bestellrunde gibt es ein `deadlineAt`.
- Server entscheidet: wenn `now > deadlineAt` oder `isLocked=true`:
  - keine Erstellung/Änderung von Bestellungen mehr
- Admin kann Sperre manuell setzen oder lösen.

Beispiel: Deadline Donnerstag 18:00.

---

## 5) Konfiguration: Ebenen/Kategorien + Zutaten
### Kategorien/Ebenen (Beispiele)
- Basis (Pflicht, genau 1)
- Marmelade (0..1)
- Obst (0..3)
- Chiasamen (0..1)
- Extras (0..2)
- Optional: „Topping-Sauce“, „Nüsse“ etc.

Pro Kategorie:
- `level` (Reihenfolge)
- `minSelect`, `maxSelect`
- `required` (optional abgeleitet aus minSelect>0)
- Aktiv/Inaktiv

### Zutaten pro Kategorie
Pro Zutat:
- Name
- Bild (Upload)
- Portionierung (für Anleitung + Summen)
- Einkaufslogik (Packungsgröße)

Beispiele:
- Skyr:
  - portion: 150 g pro Bowl
  - purchase unit: 500 g pro Becher → Einkauf = ceil(total_g / 500)
- Chiasamen:
  - portion: 10 g
  - purchase: 200 g Packung
- Banane:
  - portion wahlweise:
    - Variante A: Gramm (z. B. 60 g)
    - Variante B: Stück (z. B. 0.5 Stück)
  - purchase: Stück oder kg (konfigurierbar)

---

## 6) Ausdrucke (Print Views)
Ziel: Drucken aus Browser (Print CSS) + „Als PDF speichern“. Keine zwingende PDF-Library.

### A) Bestellliste (Übersicht)
Route: `/admin/print/orders?cycle=...`
- Tabelle:
  - Name
  - Klasse
  - Auswahl je Ebene (kommagetrennt)
  - Hinweisfeld (Allergien etc.)
  - Timestamp „letzte Änderung“

### B) Einkaufsliste (mit Umrechnungen)
Route: `/admin/print/shopping?cycle=...`
- Gruppiert nach Kategorie
- Zeigt:
  - Gesamtsumme pro Zutat (z. B. 3450 g Skyr)
  - Einkaufseinheiten (z. B. 7 Becher à 500 g)
  - optional: Puffer/Verlustfaktor

**Berechnung**
1. total = Σ(PortionAmount * quantityMultiplier) über alle Bestellungen
2. totalWithWaste = total * (1 + wasteFactor)
3. purchaseCount = ceil(totalWithWaste / purchaseUnitSize)

### C) Zubereitungszettel pro Bestellung (mit Bildern)
Route: `/admin/print/instructions?cycle=...`
- Pro Bestellung 1 „Karte“ (oder 2–4 pro Seite)
- Inhalt:
  - Name, Klasse
  - Schritte in Ebenen-Reihenfolge:
    - Bild der Zutat
    - Text: „Skyr 150 g“
    - Text: „Marmelade 20 g“
    - Text: „Banane 0.5 Stück“ / „Banane 60 g“
  - QR/Bestell-ID optional (für Abgleich)

Print-Anforderungen:
- klare große Schrift
- Seitenumbrüche sauber
- Kartenlayout wiederholbar

---

## 7) Admin-Dashboard Anforderungen
Route: `/admin`
### Dashboard KPIs
- Anzahl Bestellungen gesamt
- Bestellungen pro Klasse
- Top-Zutaten (Häufigkeit)
- Allergie/Hinweis Liste (durchsuchbar)

### Bestell-Management
- Filter: Klasse, Name, Kategorie, enthält Zutat
- Ansicht Einzelbestellung (read-only nach Deadline)
- Export:
  - CSV (optional)
  - Print-Links (Orders/Shopping/Instructions)

### Verwaltung
- Kategorien CRUD
- Zutaten CRUD (inkl. Bild Upload)
- Bestellrunde CRUD:
  - Name/ID
  - Deadline
  - Lock Toggle

---

## 8) Datenmodell (Prisma/DB)
### users
- id (uuid)
- name
- dobHash (string)
- classId (fk)
- createdAt

### classes
- id
- name

### orderCycles
- id (string, z. B. "2026-W06")
- name (optional)
- deadlineAt (datetime)
- isLocked (bool)
- createdAt

### categories
- id
- name
- level (int)
- minSelect (int)
- maxSelect (int)
- isActive (bool)

### ingredients
- id
- categoryId (fk)
- name
- imagePath (string)
- portionAmount (float)
- portionUnit (enum: g|ml|piece)
- portionLabel (string optional, z. B. "½ Banane")
- purchaseUnitSize (float optional)
- purchaseUnit (enum: g|ml|piece optional)
- purchaseUnitName (string optional, z. B. "Becher")
- wasteFactor (float default 0.0)
- isActive (bool)

### orders
- id
- cycleId (fk)
- userId (fk)
- note (string)
- updatedAt
- UNIQUE (cycleId, userId)

### orderItems
- orderId (fk)
- ingredientId (fk)
- quantityMultiplier (float default 1.0)
- UNIQUE (orderId, ingredientId)

---

## 9) Auth & Datenschutz
### Schüler-Session
- Endpoint `POST /api/auth/student`
  - Input: `name`, `dob` (YYYY-MM-DD), `classId`
  - Server berechnet dobHash = SHA-256(salt + dob)
  - Find or create user by (normalizedName, dobHash)
  - Rückgabe: JWT `studentToken`
- Token Speicherung: localStorage oder HttpOnly Cookie (Cookie bevorzugt, wenn einfacher setzbar)

DOB Speicherung:
- dob nicht speichern, nur dobHash.

### Admin-Auth
- PIN/Passwort (env-config)
- `POST /api/auth/admin` → admin JWT
- Admin Middleware für alle `/api/admin/*`

---

## 10) API Design (Minimal)
### Public (Student)
- `GET /api/public/menu?cycle=...`
  - categories (active, sorted)
  - ingredients (active)
  - cycle deadline + lock status
- `POST /api/public/auth` (student)
- `GET /api/public/order?cycle=...` (auth required)
- `PUT /api/public/order?cycle=...` (auth required)
  - Validierung min/max pro Kategorie
  - Deadline check serverseitig

### Admin
- `POST /api/admin/auth`
- `GET /api/admin/orders?cycle=...&classId=...`
- `GET /api/admin/stats?cycle=...`
- `GET /api/admin/shopping?cycle=...`  (liefert bereits aggregiert)
- `GET /api/admin/instructions?cycle=...` (liefert order->steps Daten)

CRUD:
- `POST/PUT/DELETE /api/admin/categories`
- `POST/PUT/DELETE /api/admin/ingredients` (+ upload)
- `POST/PUT /api/admin/cycles`

---

## 11) Frontend Seiten & Komponenten (HeroUI)
### Public
- `/order`
  - Step 1: „Wer bist du?“ (HeroUI Input, DatePicker, Select)
  - Step 2: Konfigurator (Tabs oder Accordion pro Kategorie)
  - Step 3: Zusammenfassung + Save
  - Statusbanner: „Bestellung geschlossen am …“

### Admin
- `/admin/login` (PIN)
- `/admin/dashboard` (Cards + Charts optional)
- `/admin/orders` (Table, Filter, Detail Drawer)
- `/admin/menu/categories` (CRUD)
- `/admin/menu/ingredients` (CRUD + Image upload)
- `/admin/cycles` (Deadline + Lock)
- `/admin/print/*` (print layouts)

HeroUI setup beachten:
- Tailwind v4 requirement, Provider wrapping, Vite setup. :contentReference[oaicite:3]{index=3}

---

## 12) Acceptance Criteria (Definition of Done)
### Schüler
- QR → Seite lädt schnell auf Handy
- Beim ersten Mal Name+Geburtstag+Klasse; danach direkte Bestellansicht
- Bestellung kann bis Deadline geändert werden
- Nach Deadline: UI gesperrt + Server verweigert Änderungen

### Admin
- Admin kann Kategorien und Zutaten inkl. Bildern pflegen
- Admin sieht Anzahl Bestellungen + pro Klasse + Top Zutaten
- Admin kann drucken:
  - Bestellliste (A4)
  - Einkaufsliste (mit Packungs-Umrechnung und optionalem Puffer)
  - Anleitungen pro Bestellung mit Bildern
- Alle Druckseiten sind gut lesbar (Print CSS), ohne abgeschnittene Inhalte

### Rechenlogik
- Einkaufsliste rechnet korrekt:
  - Beispiel Skyr: 150 g pro Bowl, 500 g Becher → ceil(total/500)
- Mengen werden pro Zutat aggregiert, nach Kategorie gruppiert

---

## 13) Implementierungsplan (Milestones)
1. **Scaffold**
   - Vite React TS + HeroUI Provider + Tailwind v4
   - Backend + Prisma + SQLite
2. **Student Auth + Session**
   - public auth, token speichern, order load/save
3. **Menu (Kategorien/Zutaten)**
   - DB + endpoints + minimal Admin CRUD
4. **Order Konfigurator**
   - min/max Validierung + Deadline blocking
5. **Admin Dashboard**
   - Orders list + stats endpoint
6. **Print Views**
   - orders print
   - shopping print (mit Umrechnung)
   - instructions print (cards + images)
7. **Polish**
   - mobile UX, error states, logging, env config, Docker compose

---

## 14) Offene Entscheidungen (falls nicht vorgegeben, Default setzen)
- Default Bestellrunde:
  - manuell durch Admin anlegbar
  - optional: „Auto weekly“ (z. B. Woche + Donnerstag Deadline)
- Klassenliste:
  - Admin pflegt Klassen (Dropdown)
- Mengen für Obst:
  - entweder Gramm oder Stück (pro Zutat definierbar)
- Bilder:
  - Upload oder nur Icons/URLs (Upload bevorzugt)

---

## 15) Deliverables (Agent soll abliefern)
- Repo mit `frontend/` und `backend/`
- DB Schema + Migrations
- Beispiel Seed-Daten:
  - Klassen: M3, O2 …
  - Kategorien: Basis, Marmelade, Obst, Chia
  - Zutaten inkl. Skyr Beispiel (150g Portion, 500g Becher)
- Print CSS + 3 Print-Routen
- Dokumentation:
  - `.env.example`
  - Start lokal + Docker
  - QR-Code URL Hinweis

---

## 16) Qualitäts- & Sicherheitsanforderungen
- Serverseitige Validierung (min/max, deadline)
- Keine Speicherung von DOB im Klartext (nur Hash)
- Logging ohne personenbezogene Daten im Klartext
- Rate limiting auf Auth endpoints (leicht)

---
