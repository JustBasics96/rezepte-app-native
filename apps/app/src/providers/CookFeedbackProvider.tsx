import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { CookFeedback } from '@kochplan/core'
import { listCookFeedback, insertCookFeedback } from '@kochplan/core'

import { supabase } from '../platform/supabase'
import { useHousehold } from './HouseholdProvider'

type CookFeedbackState = {
  loading: boolean
  error: string | null
  items: CookFeedback[]
  latestGood: CookFeedback[]
  refresh: () => Promise<void>
  record: (entry: Omit<CookFeedback, 'createdAt'>) => Promise<void>
}

const CookFeedbackCtx = createContext<CookFeedbackState | null>(null)

export function CookFeedbackProvider({ children }: { children: React.ReactNode }) {
  const { household } = useHousehold()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<CookFeedback[]>([])

  const load = useCallback(async () => {
    if (!household?.id) {
      setLoading(false)
      setItems([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await listCookFeedback(supabase as any, household.id)
      if (fetchError) throw fetchError

      type Row = { recipe_id: string; day: string; score: 1 | -1; created_at: string }
      const rows = (data as Row[]) ?? []
      const fetched: CookFeedback[] = rows.map((r) => ({
        recipeId: r.recipe_id,
        day: r.day,
        score: r.score,
        createdAt: r.created_at
      }))

      setItems(fetched)
    } catch (e: any) {
      console.error('[Kochplan] loadCookFeedback failed', e)
      setError(e?.message ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }, [household?.id])

  useEffect(() => {
    load()
  }, [load])

  const record = useCallback(
    async (entry: Omit<CookFeedback, 'createdAt'>) => {
      if (!household?.id) return

      const createdAt = new Date().toISOString()
      // Optimistic update
      setItems((prev) => [{ ...entry, createdAt }, ...prev].slice(0, 200))

      try {
        await insertCookFeedback(supabase as any, household.id, entry)
      } catch (e: any) {
        console.error('[Kochplan] insertCookFeedback failed', e)
        setError(e?.message ?? 'Failed to save feedback')
      }
    },
    [household?.id]
  )

  const latestGood = useMemo(() => items.filter((i) => i.score === 1), [items])

  const value: CookFeedbackState = {
    loading,
    error,
    items,
    latestGood,
    refresh: load,
    record
  }

  return <CookFeedbackCtx.Provider value={value}>{children}</CookFeedbackCtx.Provider>
}

export function useCookFeedback(): CookFeedbackState {
  const ctx = useContext(CookFeedbackCtx)
  if (!ctx) throw new Error('useCookFeedback must be used within CookFeedbackProvider')
  return ctx
}
