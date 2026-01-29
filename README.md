# Kochplan 🍽️

> Familien-Mahlzeitenplaner für iOS, Android & Web

Cross‑platform App mit **gemeinsamer Codebasis** (Expo 54 + React Native).

## ✨ Features

- **Wochenplan** – Frühstück, Mittag, Abend, Snack pro Tag planen
- **Multi-Slot** – Konfigurierbare Mahlzeiten (1–4 Slots)
- **Einkaufsliste** – Automatisch aus dem Plan generiert, offline-first
- **Rezepte** – Mit Foto, Zutaten, Tags und Favoriten
- **Familie** – Family Code verbindet mehrere Geräte
- **Bewertungen** – 👍/👎 nach dem Kochen, Statistik in Familie
- **i18n** – Deutsch & Englisch
- **Auth** – Apple Sign-In + Email/Passwort

## 📱 Screenshots

*Coming soon*

## 🛠️ Tech Stack

| Layer | Technologie |
|-------|-------------|
| Frontend | Expo 54, React Native, expo-router |
| State | React Context (Session, Household, CookFeedback) |
| Backend | Supabase (Postgres, Auth, Storage) |
| i18n | i18next + react-i18next |
| Tests | Vitest (49 Tests) |

## 📁 Repo Struktur

```
kochplan/
├── apps/app/           # Expo App (Screens, UI, Providers)
│   ├── app/            # expo-router Screens
│   ├── src/
│   │   ├── features/   # Domain hooks (mealPlan, recipes, shoppingList)
│   │   ├── providers/  # Context Providers
│   │   ├── ui/         # Komponenten + Theme
│   │   └── i18n/       # Übersetzungen (de.json, en.json)
│   └── ios/            # Native iOS Project
├── packages/core/      # Shared Domain + API + Utils
│   └── src/
│       ├── api/        # Supabase Client Functions
│       ├── domain/     # Shopping List Builder
│       └── utils/      # Date, Time, Slots, ID helpers
└── supabase/migrations/  # SQL Schema + RLS
```

## 🚀 Setup

### 1. Environment

```bash
cp apps/app/.env.example apps/app/.env
```

Setze:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 2. Install

```bash
npm install
```

### 3. Run

```bash
# Web
npm -w @kochplan/app run web

# iOS (Simulator)
npm -w @kochplan/app run ios

# iOS (Device) – erfordert Xcode
npm -w @kochplan/app run run:ios

# Android
npm -w @kochplan/app run android
```

## 🧪 Quality

```bash
npm run typecheck    # TypeScript Check
npm run test         # 49 Tests (Vitest)
npm run lint         # ESLint
```

## ☁️ Supabase Setup

### Database

Führe die Migrations aus:
1. `supabase/migrations/0001_init.sql` – Basis-Schema
2. `supabase/migrations/0002_cook_feedback.sql` – Bewertungen
3. `supabase/migrations/0003_meals_per_day.sql` – Multi-Slot

### Auth

Aktiviere in Supabase Dashboard:
- **Apple** Provider (für iOS)
- **Email** Provider

### Storage

Erstelle Bucket `recipe-photos` (public) für Rezeptfotos.

## 📲 TestFlight / Release

```bash
# 1. Prebuild
cd apps/app && npx expo prebuild --platform ios --clean

# 2. In Xcode öffnen
open ios/Kochplan.xcworkspace

# 3. Archive (Product → Archive)
# 4. Distribute → App Store Connect
# 5. TestFlight in App Store Connect konfigurieren
```

## 📋 Definition of Done

- [x] Expo (iOS/Android/Web) mit expo-router
- [x] Shared Core Package mit Tests
- [x] Wochenplan mit Multi-Slot Support
- [x] Einkaufsliste (offline-first)
- [x] Rezepte mit Foto-Upload
- [x] Family Code (Create/Join/Reset)
- [x] Cook Feedback (👍/👎)
- [x] i18n (DE/EN)
- [x] Apple Sign-In + Email Auth
- [x] Native Toast Notifications
- [x] 49 Tests passing

## 📄 License

Private / All Rights Reserved

---

Made with ❤️ für Familien, die gerne zusammen kochen.

