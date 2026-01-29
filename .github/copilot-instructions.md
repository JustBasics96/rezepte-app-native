# Kochplan – AI Assistant Instructions

Instructions for AI coding agents working in this repo. Keep answers concise and follow these patterns.

## Architecture

### Monorepo Structure
- **Root**: npm workspaces, shared scripts
- **apps/app**: Expo 54 React Native + Web (expo-router)
- **packages/core**: Shared domain logic, API client, utilities

### App Structure (expo-router)
- Entry: `apps/app/app/_layout.tsx`
- Tabs: `apps/app/app/(tabs)/_layout.tsx`
- Screens: `plan.tsx`, `shopping.tsx`, `recipes/`, `family.tsx`
- Modals: `recipe-editor.tsx`, `add-to-plan.tsx`, `auth.tsx`

### Providers (in AppProviders.tsx)
```
I18nextProvider
  └─ SessionProvider (Supabase auth)
       └─ HouseholdProvider (household state, slots)
            └─ CookFeedbackProvider (shared feedback state)
```

### Core Package Exports
- **API**: `listRecipes`, `upsertRecipe`, `listMealPlan`, `setMealPlanDay`, `deleteMealPlanBySlots`, etc.
- **Domain**: `buildShoppingListFromPlan`, `parseIngredientLine`
- **Utils**: `formatDay`, `parseEnabledSlots`, `generateId`, `weeksAgoLabel`

## Key Patterns

### Feature Hooks (in apps/app/src/features/)
```typescript
type State = { loading: boolean; error: string | null; items: T[] }

export function useFeature() {
  const [state, setState] = useState<State>(...)
  const refresh = useCallback(async () => { ... }, [deps])
  useEffect(() => { refresh() }, [refresh])
  return { ...state, refresh, mutate }
}
```

### Supabase Client
- Single instance in `apps/app/src/platform/supabase.ts`
- Never create new clients; import this one
- Auth: Apple Sign-In + Email/Password (no anonymous)

### Storage
- Use `kv` from `apps/app/src/platform/storage.ts`
- Keys namespaced: `orb.shoppingList`, `orb.householdId`, etc.

### i18n
- Files: `apps/app/src/i18n/de.json`, `en.json`
- Use: `const { t } = useTranslation()`
- Add keys to BOTH language files

### Toast Notifications
```typescript
import { toastSuccess, toastError } from '../src/ui/toast'
toastSuccess(t('editor.saved'))  // Brief, non-blocking
```
Use `Alert.alert()` only for destructive confirmations.

## Development

### Commands
```bash
npm install                        # Install all
npm run typecheck                  # TypeScript
npm run test                       # 49 tests (Vitest)
npm -w @kochplan/app run web       # Web dev
npm -w @kochplan/app run ios       # iOS simulator
```

### Adding Features
1. Core logic → `packages/core/src/` + export in `index.ts`
2. Feature hook → `apps/app/src/features/`
3. Screen → `apps/app/app/`
4. Translations → both `de.json` and `en.json`

### Testing (TDD encouraged)
1. Write tests first (Red)
2. Implement (Green)
3. Refactor

Tests in `packages/core/src/**/*.test.ts`

## Database

### Tables
- `households` (id, join_code, enabled_slots)
- `recipes` (id, household_id, title, ingredients, steps, photo_path, tags, favorite)
- `meal_plan` (household_id, day, meal_slot, recipe_id, status)
- `cook_feedback` (household_id, recipe_id, day, score)

### Migrations
- `0001_init.sql` – Base schema
- `0002_cook_feedback.sql` – Feedback table
- `0003_meals_per_day.sql` – Multi-slot support

## Conventions

- Log prefix: `[Kochplan]`
- Error handling: `{ data, error }` from core, throw in app layer
- Optimistic updates for better UX
- Always run `npm run typecheck` after changes
