# Our Recipebook – AI Assistant Instructions

These instructions are for AI coding agents ("Copilot", etc.) working in this repo.
Keep answers concise and focus on THIS project’s patterns.

## Architecture Overview
- Monorepo managed by npm workspaces:
  - Root: tooling + shared scripts (see [package.json](package.json)).
  - App: Expo React Native + Web in [apps/app](apps/app).
  - Core: shared domain + API utilities in [packages/core](packages/core).
- App structure (expo-router):
  - Entry + navigation in [apps/app/app/_layout.tsx](apps/app/app/_layout.tsx) and tab layout in [apps/app/app/(tabs)/_layout.tsx](apps/app/app/(tabs)/_layout.tsx).
  - Screens live under [apps/app/app](apps/app/app) (e.g. `plan`, `recipes`, `family`, `recipe-editor`, `add-to-plan`).
- Shared React context providers:
  - Wrap all UI in `AppProviders` from [apps/app/src/providers/AppProviders.tsx](apps/app/src/providers/AppProviders.tsx) which nests `SessionProvider` and `HouseholdProvider`.
- Core package:
  - Public surface is re-exported from [packages/core/src/index.ts](packages/core/src/index.ts).
  - Domain logic (e.g. meal plan and shopping list) lives under [packages/core/src/domain](packages/core/src/domain).
  - Supabase client wrapper and types live under [packages/core/src/api](packages/core/src/api).

## Data & Side-Effects
- Supabase:
  - Client is created once in [apps/app/src/platform/supabase.ts](apps/app/src/platform/supabase.ts) using env vars `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` via `env/assertEnv`.
  - Always import and reuse this `supabase` instance in app code; do not create new clients.
  - Anonymous auth is expected; do not introduce other auth flows without explicit request.
- Local storage:
  - AsyncStorage is wrapped by `kv` in [apps/app/src/platform/storage.ts](apps/app/src/platform/storage.ts).
  - Use `kv.getJson` / `kv.setJson` etc. instead of calling `AsyncStorage` directly.
- Domain hooks in app layer:
  - Meal plan: [apps/app/src/features/mealPlan.ts](apps/app/src/features/mealPlan.ts) exposes `useMealPlanWeek`, calling core functions like `listMealPlan`, `setMealPlanDay`, `setMealPlanStatus`, `markLastCooked`.
    - Follows pattern: `State { loading, error, items }`, `refresh` function, and optimistic local updates after mutations.
  - Recipes: [apps/app/src/features/recipes.ts](apps/app/src/features/recipes.ts) exposes `useRecipes` with `recipes`, `recipesById`, and `saveRecipe`/`loadRecipe`/`removeRecipe` using core recipe APIs.
  - Shopping list: [apps/app/src/features/shoppingList.ts](apps/app/src/features/shoppingList.ts) manages offline-first list via `kv` and `buildShoppingListFromPlan` from core.
  - When adding new flows, mirror this hook pattern: local `State`, `refresh` on mount, error string, and minimal console logging with `[OurRecipeBook]` prefix.

## Developer Workflows
- Install dependencies from repo root:
  - `npm install`
- Type-check / lint / test (monorepo-wide):
  - `npm run typecheck` → runs workspace `typecheck` (including core + app).
  - `npm run test` → runs workspace `test` (Vitest in core; app currently prints a placeholder).
  - `npm run lint` → runs workspace `lint` (linting primarily in app).
- App-specific scripts (run from repo root with `-w` or inside `apps/app`):
  - Web dev: `npm -w @our-recipebook/app run web`.
  - Expo dev: `npm -w @our-recipebook/app run start`.
  - Native (prebuild): `npm -w @our-recipebook/app run run:ios` / `run:android`.

## Conventions & Patterns
- Keep business logic in `@our-recipebook/core` where possible, and keep React hooks thin:
  - Use core helpers for date/ID/time utilities instead of ad-hoc implementations.
  - For new derived data (e.g. building lists from meal plans), prefer adding functions in `packages/core/src/domain` and calling them from app hooks.
- React hooks:
  - Follow existing `useX` patterns: `State` with `loading`/`error`, `refresh`/mutation functions, and optimistic updates.
  - Use `useHousehold` from `HouseholdProvider` for `household.id` when scoping data.
- Storage keys:
  - Reuse or introduce clear, namespaced keys (e.g. `orb.shoppingList`) when persisting via `kv`; avoid hard-coded AsyncStorage keys scattered across the app.
- Error handling:
  - For Supabase or storage errors, log with a clear `[OurRecipeBook]` prefix and set a human-readable `error` string on local state.
  - Prefer returning `{ data, error }` from core functions and throwing in the app layer only after checking `error`, as seen in current hooks.

## When Modifying / Adding Features
- For new shared functionality, add it under `packages/core/src` and export it via [packages/core/src/index.ts](packages/core/src/index.ts), then consume it in app hooks under [apps/app/src/features](apps/app/src/features).
- For new screens:
  - Place them under [apps/app/app](apps/app/app) and wire them in the relevant router layout (`Stack` or `Tabs`).
  - Use existing screens as examples for prop and hook usage.
- Maintain existing TypeScript/ESLint setup:
  - Ensure `npm run typecheck` and `npm run lint` pass after changes.

## Supabase & DB
- Schema and policies are defined in [supabase/migrations](supabase/migrations) (e.g. `0001_init.sql`, `0002_cook_feedback.sql`).
- Do not hard-code table/column names in the app layer; rely on `@our-recipebook/core` API functions to access Supabase.
