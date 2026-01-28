import { useCallback, useEffect, useState } from 'react'
import type { MealPlanItem, Recipe, ShoppingItem } from '@our-recipebook/core'
import { buildShoppingListFromPlan, makeId } from '@our-recipebook/core'

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

  const persist = useCallback(async (updater: (items: ShoppingItem[]) => ShoppingItem[]) => {
    let next: ShoppingItem[] = []
    setState((s) => {
      next = updater(s.items)
      return { ...s, items: next }
    })
    await kv.setJson(KEY, next)
  }, [])

  const toggle = useCallback(
    async (id: string) => {
      await persist((items) => items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))
    },
    [persist]
  )

  const clearChecked = useCallback(async () => {
    await persist((items) => items.filter((i) => !i.checked))
  }, [persist])

  const rebuildFromPlan = useCallback(
    async (plan: MealPlanItem[], recipesById: Map<string, Recipe>) => {
      const built = buildShoppingListFromPlan(plan, recipesById)
      await persist(() => built)
    },
    [persist]
  )

  const addItem = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const newItem: ShoppingItem = {
        id: makeId(),
        text: trimmed,
        norm: trimmed.toLowerCase(),
        qty: null,
        unit: null,
        checked: false,
        sourceRecipeIds: []
      }
      await persist((items) => [newItem, ...items])
    },
    [persist]
  )

  const removeItem = useCallback(
    async (id: string) => {
      await persist((items) => items.filter((i) => i.id !== id))
    },
    [persist]
  )

  return {
    ...state,
    refresh: load,
    toggle,
    clearChecked,
    rebuildFromPlan,
    addItem,
    removeItem
  }
}
