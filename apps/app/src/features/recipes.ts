import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Recipe } from '@kochplan/core'
import { deleteRecipe, getRecipe, listRecipes, upsertRecipe } from '@kochplan/core'

import { supabase } from '../platform/supabase'
import { useHousehold } from '../providers/HouseholdProvider'

type State = {
  loading: boolean
  error: string | null
  recipes: Recipe[]
}

export function useRecipes() {
  const { household } = useHousehold()
  const [state, setState] = useState<State>({ loading: true, error: null, recipes: [] })

  const refresh = useCallback(async () => {
    if (!household?.id) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const { data, error } = await listRecipes(supabase as any)
      if (error) throw error
      const rows = (data as Recipe[]) ?? []
      setState({ loading: false, error: null, recipes: rows })
    } catch (e: any) {
      console.error('[Kochplan] listRecipes failed', e)
      setState({ loading: false, error: e?.message ?? 'Failed to load recipes', recipes: [] })
    }
  }, [household?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const recipesById = useMemo(() => new Map(state.recipes.map((r) => [r.id, r])), [state.recipes])

  const saveRecipe = useCallback(
    async (payload: Partial<Recipe> & { title: string; ingredients: string; steps: string }) => {
      if (!household?.id) throw new Error('No household')
      const { data, error } = await upsertRecipe(supabase as any, household.id, payload)
      if (error) throw error
      const saved = data as Recipe
      // Optimistic update
      setState((s) => {
        const next = s.recipes.filter((r) => r.id !== saved.id)
        return { ...s, recipes: [saved, ...next] }
      })
      return saved
    },
    [household?.id]
  )

  const loadRecipe = useCallback(async (id: string) => {
    const { data, error } = await getRecipe(supabase as any, id)
    if (error) throw error
    return data as Recipe
  }, [])

  const removeRecipe = useCallback(async (id: string) => {
    const { error } = await deleteRecipe(supabase as any, id)
    if (error) throw error
    setState((s) => ({ ...s, recipes: s.recipes.filter((r) => r.id !== id) }))
  }, [])

  return {
    ...state,
    refresh,
    recipesById,
    saveRecipe,
    loadRecipe,
    removeRecipe
  }
}
