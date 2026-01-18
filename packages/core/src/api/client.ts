import type { SupabaseClient } from '@supabase/supabase-js'
import type { Household, MealPlanItem, Recipe } from './types'

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

export async function setMealPlanDay(sb: SupabaseClient, householdId: string, day: string, recipeId: string | null) {
  if (!recipeId) {
    return await sb.from('meal_plan').delete().eq('day', day).eq('household_id', householdId)
  }

  return await sb
    .from('meal_plan')
    .upsert(
      { household_id: householdId, day, recipe_id: recipeId, status: 'planned' },
      { onConflict: 'household_id,day' }
    )
    .select('*, recipe:recipes(id,title,photo_path)')
    .single()
}

export async function setMealPlanStatus(sb: SupabaseClient, householdId: string, day: string, status: MealPlanItem['status']) {
  return await sb
    .from('meal_plan')
    .update({ status })
    .eq('day', day)
    .eq('household_id', householdId)
    .select('*, recipe:recipes(id,title,photo_path)')
    .single()
}

export async function markLastCooked(sb: SupabaseClient, recipeId: string) {
  return await sb.from('recipes').update({ last_cooked_at: new Date().toISOString() }).eq('id', recipeId)
}

export async function createHousehold(sb: SupabaseClient) {
  return await sb.rpc('create_household')
}

export async function joinHousehold(sb: SupabaseClient, joinCode: string) {
  return await sb.rpc('join_household', { p_join_code: joinCode })
}

export async function getHousehold(sb: SupabaseClient, householdId: string) {
  return await sb.from('households').select('id, join_code').eq('id', householdId).single()
}

export type { Household, Recipe, MealPlanItem }
