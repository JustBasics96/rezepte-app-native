# Unser Rezeptbuch (Expo RN + Web)

Cross‑platform App (iOS/Android/Web) mit **gemeinsamer Codebasis**.

Produkt-Vibe: **Notizbuch + Kalender + Kochzettel**.

## Core Flows

- **Wochenplan**: Tage als Cards, 1 Tap zum Rezept wählen, Status „leer / geplant / gekocht“.
- **Einkaufsliste**: automatisch aus dem Plan, Checkbox-first, offline persistent.
- **Rezepte**: Favoriten + Tags, schneller Editor, optional Foto.
- **Familie / Sync**: „Family Code“ verbindet zwei Geräte in einen gemeinsamen Haushalt.
- **Gedächtnisstütze**: beim „gekocht“ optional 👍/👎 (local-first) + „Hat gut funktioniert“ + „Wiederholen“.

## Repo Struktur

- `packages/core` – Domain + Types + API wrappers (shared)
- `apps/app` – Expo App (expo-router, Screens, RN UI)
- `supabase/migrations` – SQL Schema + RLS + RPCs

## Setup

### 1) Env

Kopiere `.env.example` nach `apps/app/.env` (oder setze die Variablen im Shell-Env).

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 2) Install

```bash
npm install
```

## Run

### Web
```bash
npm -w @our-recipebook/app run web
```

### Dev Server (Expo)
```bash
npm -w @our-recipebook/app run start
```

### Native (prebuild)
```bash
npm -w @our-recipebook/app run run:ios
npm -w @our-recipebook/app run run:android
```

> iOS Build benötigt macOS (oder EAS Build). Android geht lokal.

## Quality Scripts

```bash
npm run typecheck
npm run test
npm -w @our-recipebook/app run lint
```

## Supabase

### DB Schema

Wende die Migration an:
- `supabase/migrations/0001_init.sql`

### Auth

Die App nutzt **Anonymous Auth** (`signInAnonymously`).
Aktiviere in Supabase Auth Settings den Provider **Anonymous**.

### Storage (Recipe Photos)

Die App erwartet ein Bucket:
- Bucket Name: `recipe-photos`
- Empfehlung: **public** (einfacher Start) – Pfade sind `householdId/recipeId.ext`.

Minimal-Policies (SQL Editor) – erlaubt Upload/Update/Delete für authenticated User:

```sql
-- Bucket muss existieren (Dashboard)

-- Allow authenticated users to insert/update/delete objects
create policy if not exists "recipe_photos_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-photos');

create policy if not exists "recipe_photos_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'recipe-photos')
  with check (bucket_id = 'recipe-photos');

create policy if not exists "recipe_photos_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-photos');
```

> Optional: Wenn du es strenger willst, kann man die Policy auf Pfad-Präfix (householdId) einschränken.

### Conflict Handling

- **Last-write-wins** über `updated_at` DB-Trigger.
- Client setzt Änderungen direkt; bei Konflikten gewinnt der letzte Update.

## Troubleshooting

- **Env fehlt**: Log zeigt `Missing env vars: EXPO_PUBLIC_SUPABASE_URL ...`.
- **Monorepo Imports**: `apps/app/metro.config.js` watchFolders ist gesetzt.
- **Foto Upload**: nutzt `fetch(uri).blob()` (Expo-compatible). Wenn ein bestimmtes Bildformat zickt, testweise JPEG nehmen.

## Definition of Done (Projekt-Stand)

- [x] Expo (iOS/Android/Web) Grundsetup (Expo Router Tabs)
- [x] Shared Core (Types/Domain/API) + Tests
- [x] Wochenplan (Plan) + Add-to-plan
- [x] Einkaufsliste (Offline-first) + „Neu aus Plan“
- [x] Rezepte Liste + Editor + Foto Upload
- [x] Family Code (Create/Join/Reset)
- [x] Loading / Empty / Error States
- [x] typecheck/test/lint Scripts vorhanden

