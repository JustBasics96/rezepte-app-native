export type Recipe = {
  id: string
  household_id: string
  title: string
  portions: number | null
  ingredients: string
  steps: string
  notes: string
  photo_path: string | null
  is_favorite: boolean
  tags: string[]
  last_cooked_at: string | null
  created_at: string
  updated_at: string
}

export type MealPlanItem = {
  id: string
  household_id: string
  day: string // YYYY-MM-DD
  meal_slot: number // 0-3
  recipe_id: string
  status: 'planned' | 'prepped' | 'cooked'
  created_at: string
  updated_at: string
  recipe?: Pick<Recipe, 'id' | 'title' | 'photo_path'>
}

export type Household = {
  id: string
  join_code: string
  enabled_slots: number[] // indices 0-3: Frühstück, Mittag, Abend, Snack
}

// Optional lightweight memory aid (kept local-first; sync can be added later)
export type CookFeedback = {
  recipeId: string
  day: string // YYYY-MM-DD
  score: 1 | -1
  createdAt: string // ISO
}
