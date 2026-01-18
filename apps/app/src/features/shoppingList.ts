import { useCallback, useEffect, useState } from 'react'
import type { MealPlanItem, Recipe, ShoppingItem } from '@our-recipebook/core'
import { buildShoppingListFromPlan } from '@our-recipebook/core'

import { kv } from '../platform/storage'

const KEY = 'orb.shoppingList'

type State = {
  loading: boolean
  error: string | null
  items: ShoppingItem[]
}

export function useShoppingList() {
  const [state, setState] = useState<State>({ loading: true, error: null, items: [] })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const stored = (await kv.getJson<ShoppingItem[]>(KEY)) ?? []
      setState({ loading: false, error: null, items: stored })
    } catch (e: any) {
      console.error('[OurRecipeBook] loadShoppingList failed', e)
      setState({ loading: false, error: e?.message ?? 'Failed to load list', items: [] })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const persist = useCallback(async (next: ShoppingItem[]) => {
    setState((s) => ({ ...s, items: next }))
    await kv.setJson(KEY, next)
  }, [])

  const toggle = useCallback(
    async (id: string) => {
      const next = state.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
      await persist(next)
    },
    [state.items, persist]
  )

  const clearChecked = useCallback(async () => {
    await persist(state.items.filter((i) => !i.checked))
  }, [state.items, persist])

  const rebuildFromPlan = useCallback(
    async (plan: MealPlanItem[], recipesById: Map<string, Recipe>) => {
      const built = buildShoppingListFromPlan(plan, recipesById)
      await persist(built)
    },
    [persist]
  )

  return {
    ...state,
    refresh: load,
    toggle,
    clearChecked,
    rebuildFromPlan
  }
}
