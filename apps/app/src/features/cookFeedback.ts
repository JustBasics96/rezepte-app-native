import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CookFeedback } from '@our-recipebook/core'

import { kv } from '../platform/storage'

const KEY = 'orb.cookFeedback'

type State = { loading: boolean; error: string | null; items: CookFeedback[] }

export function useCookFeedback() {
  const [state, setState] = useState<State>({ loading: true, error: null, items: [] })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const items = (await kv.getJson<CookFeedback[]>(KEY)) ?? []
      setState({ loading: false, error: null, items })
    } catch (e: any) {
      console.error('[OurRecipeBook] loadCookFeedback failed', e)
      setState({ loading: false, error: e?.message ?? 'Failed', items: [] })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (next: CookFeedback[]) => {
    setState((s) => ({ ...s, items: next }))
    await kv.setJson(KEY, next)
  }, [])

  const record = useCallback(
    async (entry: Omit<CookFeedback, 'createdAt'>) => {
      const next: CookFeedback[] = [{ ...entry, createdAt: new Date().toISOString() }, ...state.items]
        .slice(0, 200)
      await save(next)
    },
    [state.items, save]
  )

  const latestGood = useMemo(() => state.items.filter((i) => i.score === 1), [state.items])

  return { ...state, refresh: load, record, latestGood }
}
