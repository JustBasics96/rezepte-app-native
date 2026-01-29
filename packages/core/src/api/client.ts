import type { SupabaseClient } from '@supabase/supabase-js'
import type { CookFeedback, Household, MealPlanItem, Recipe } from './types'

export async function listRecipes(sb: SupabaseClient) {
  return await sb.from('recipes').select('*').order('updated_at', { ascending: false })
}

export async function getRecipe(sb: SupabaseClient, id: string) {
  return await sb.from('recipes').select('*').eq('id', id).single()
}

export async function upsertRecipe(
  sb: SupabaseClient,
  householdId: string,
  payload: Partial<Recipe> & { title: string; ingredients: string; steps: string }
) {
  return await sb
    .from('recipes')
    .upsert({ ...payload, household_id: householdId }, { onConflict: 'id' })
    .select('*')
    .single()
}

export async function deleteRecipe(sb: SupabaseClient, id: string) {
  return await sb.from('recipes').delete().eq('id', id)
}

export async function listMealPlan(sb: SupabaseClient, fromDay: string, toDay: string) {
  return await sb
    .from('meal_plan')
    .select('*, recipe:recipes(id,title,photo_path)')
    .gte('day', fromDay)
    .lte('day', toDay)
    .order('day', { ascending: true })
}

export async function setMealPlanDay(
  sb: SupabaseClient,
  householdId: string,
  day: string,
  recipeId: string | null,
  mealSlot: number = 0
) {
  if (!recipeId) {
    return await sb
      .from('meal_plan')
      .delete()
      .eq('day', day)
      .eq('household_id', householdId)
      .eq('meal_slot', mealSlot)
  }

  return await sb
    .from('meal_plan')
    .upsert(
      { household_id: householdId, day, meal_slot: mealSlot, recipe_id: recipeId, status: 'planned' },
      { onConflict: 'household_id,day,meal_slot' }
    )
    .select('*, recipe:recipes(id,title,photo_path)')
    .single()
}

export async function setMealPlanStatus(
  sb: SupabaseClient,
  householdId: string,
  day: string,
  status: MealPlanItem['status'],
  mealSlot: number = 0
) {
  return await sb
    .from('meal_plan')
    .update({ status })
    .eq('day', day)
    .eq('household_id', householdId)
    .eq('meal_slot', mealSlot)
    .select('*, recipe:recipes(id,title,photo_path)')
    .single()
}

export async function markLastCooked(sb: SupabaseClient, recipeId: string) {
  return await sb.from('recipes').update({ last_cooked_at: new Date().toISOString() }).eq('id', recipeId)
}

export async function listCookFeedback(sb: SupabaseClient, householdId: string) {
  return await sb
    .from('cook_feedback')
    .select('recipe_id, day, score, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
}

export async function insertCookFeedback(
  sb: SupabaseClient,
  householdId: string,
  entry: Omit<CookFeedback, 'createdAt'>
) {
  return await sb.from('cook_feedback').insert({
    household_id: householdId,
    recipe_id: entry.recipeId,
    day: entry.day,
    score: entry.score
  })
}

export async function createHousehold(sb: SupabaseClient) {
  return await sb.rpc('create_household')
}

export async function joinHousehold(sb: SupabaseClient, joinCode: string) {
  return await sb.rpc('join_household', { p_join_code: joinCode })
}

export async function getHousehold(sb: SupabaseClient, householdId: string) {
  return await sb.from('households').select('id, join_code, enabled_slots').eq('id', householdId).single()
}

export async function updateHouseholdSettings(
  sb: SupabaseClient,
  householdId: string,
  settings: { enabled_slots?: string }
) {
  return await sb
    .from('households')
    .update(settings)
    .eq('id', householdId)
    .select('id, join_code, enabled_slots')
    .single()
}

/**
 * Delete all meal_plan entries for the given slots.
 * Used when disabling slots to clean up orphaned entries.
 */
export async function deleteMealPlanBySlots(
  sb: SupabaseClient,
  householdId: string,
  slots: number[]
) {
  if (slots.length === 0) return { data: null, error: null }
  
  return await sb
    .from('meal_plan')
    .delete()
    .eq('household_id', householdId)
    .in('meal_slot', slots)
}

export type { Household, Recipe, MealPlanItem, CookFeedback }
