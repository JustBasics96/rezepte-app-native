import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CookFeedback } from '@our-recipebook/core'
import { listCookFeedback, insertCookFeedback } from '@our-recipebook/core'

import { supabase } from '../platform/supabase'
import { useHousehold } from '../providers/HouseholdProvider'

type State = { loading: boolean; error: string | null; items: CookFeedback[] }

export function useCookFeedback() {
  const { household } = useHousehold()
  const [state, setState] = useState<State>({ loading: true, error: null, items: [] })

  const load = useCallback(async () => {
    if (!household?.id) {
      setState({ loading: false, error: null, items: [] })
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const { data, error } = await listCookFeedback(supabase as any, household.id)
      if (error) throw error

      type Row = { recipe_id: string; day: string; score: 1 | -1; created_at: string }
      const rows = (data as Row[]) ?? []
      const items: CookFeedback[] = rows.map((r) => ({
        recipeId: r.recipe_id,
        day: r.day,
        score: r.score,
        createdAt: r.created_at
      }))

      setState({ loading: false, error: null, items })
    } catch (e: any) {
      console.error('[OurRecipeBook] loadCookFeedback failed', e)
      setState({ loading: false, error: e?.message ?? 'Failed', items: [] })
    }
  }, [household?.id])

  useEffect(() => {
    load()
  }, [load])

  const record = useCallback(
    async (entry: Omit<CookFeedback, 'createdAt'>) => {
      if (!household?.id) return

      const createdAt = new Date().toISOString()
      const next: CookFeedback[] = [{ ...entry, createdAt }, ...state.items].slice(0, 200)
      setState((s) => ({ ...s, items: next }))
      try {
        await insertCookFeedback(supabase as any, household.id, entry)
      } catch (e: any) {
        console.error('[OurRecipeBook] insertCookFeedback failed', e)
        setState((s) => ({ ...s, error: e?.message ?? 'Failed to save feedback' }))
      }
    },
    [state.items, household?.id]
  )

  const latestGood = useMemo(() => state.items.filter((i) => i.score === 1), [state.items])

  return { ...state, refresh: load, record, latestGood }
}
