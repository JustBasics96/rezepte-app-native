import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MealPlanItem } from '@our-recipebook/core'
import { listMealPlan, markLastCooked, setMealPlanDay, setMealPlanStatus, weekRange } from '@our-recipebook/core'

import { supabase } from '../platform/supabase'
import { useHousehold } from '../providers/HouseholdProvider'

type State = {
  loading: boolean
  error: string | null
  items: MealPlanItem[]
}

export function useMealPlanWeek(anchorDate = new Date()) {
  const { household } = useHousehold()
  const range = useMemo(() => weekRange(anchorDate), [anchorDate])
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    items: []
  })

  const refresh = useCallback(async () => {
    if (!household?.id) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const { data, error } = await listMealPlan(supabase as any, range.from, range.to)
      if (error) throw error
      setState((s) => ({ ...s, loading: false, error: null, items: (data as any) ?? [] }))
    } catch (e: any) {
      console.error('[OurRecipeBook] listMealPlan failed', e)
      setState((s) => ({ ...s, loading: false, error: e?.message ?? 'Failed to load week' }))
    }
  }, [household?.id, range.from, range.to])

  useEffect(() => {
    refresh()
  }, [refresh])

  const byDay = useMemo(() => {
    const m = new Map<string, MealPlanItem>()
    for (const it of state.items) m.set(it.day, it)
    return m
  }, [state.items])

  const setDay = useCallback(
    async (day: string, recipeId: string | null) => {
      if (!household?.id) throw new Error('No household')
      const { data, error } = await setMealPlanDay(supabase as any, household.id, day, recipeId)
      if (error) throw error
      // If deleted: refresh, else update local
      if (!recipeId) {
        setState((s) => ({ ...s, items: s.items.filter((x) => x.day !== day) }))
        return null
      }
      const saved = data as any as MealPlanItem
      setState((s) => {
        const next = s.items.filter((x) => x.day !== day)
        return { ...s, items: [...next, saved].sort((a, b) => a.day.localeCompare(b.day)) }
      })
      return saved
    },
    [household?.id]
  )

  const setStatus = useCallback(
    async (day: string, status: MealPlanItem['status']) => {
      if (!household?.id) throw new Error('No household')
      const { data, error } = await setMealPlanStatus(supabase as any, household.id, day, status)
      if (error) throw error
      const saved = data as any as MealPlanItem
      setState((s) => {
        const next = s.items.filter((x) => x.day !== day)
        return { ...s, items: [...next, saved].sort((a, b) => a.day.localeCompare(b.day)) }
      })
      return saved
    },
    [household?.id]
  )

  const touchLastCooked = useCallback(async (recipeId: string) => {
    const { error } = await markLastCooked(supabase as any, recipeId)
    if (error) throw error
  }, [])

  return {
    ...state,
    from: range.from,
    to: range.to,
    days: range.days,
    byDay,
    refresh,
    setDay,
    setStatus,
    touchLastCooked
  }
}
