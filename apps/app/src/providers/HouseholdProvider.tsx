import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Household } from '@our-recipebook/core'
import { createHousehold, getHousehold, joinHousehold } from '@our-recipebook/core'

import { kv } from '../platform/storage'
import { supabase } from '../platform/supabase'
import { useSession } from './SessionProvider'

const KEY_HOUSEHOLD_ID = 'orb.householdId'
const KEY_JOIN_CODE = 'orb.joinCode'

type HouseholdState = {
  ready: boolean
  household: Household | null
  joinCode: string | null
  error: string | null
  joinByCode: (code: string) => Promise<void>
  reset: () => Promise<void>
}

const HouseholdCtx = createContext<HouseholdState | null>(null)

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession()
  const [household, setHousehold] = useState<Household | null>(null)
  const [joinCode, setJoinCode] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!user?.id) return

    ;(async () => {
      try {
        const storedId = await kv.getString(KEY_HOUSEHOLD_ID)

        if (storedId) {
          const { data, error: qErr } = await getHousehold(supabase as any, storedId)
          if (!qErr && data) {
            await kv.setString(KEY_JOIN_CODE, data.join_code)
            if (mounted) {
              setHousehold(data as Household)
              setJoinCode(data.join_code)
            }
            return
          }

          // Stored household no longer accessible -> clear.
          await kv.remove(KEY_HOUSEHOLD_ID)
          await kv.remove(KEY_JOIN_CODE)
        }

        // No household yet -> create one.
        const { data: createdData, error: cErr } = await createHousehold(supabase as any)
        if (cErr) throw cErr
        const created = Array.isArray(createdData) ? createdData[0] : createdData
        if (!created?.id || !created?.join_code) throw new Error('Household creation returned no data')

        await kv.setString(KEY_HOUSEHOLD_ID, created.id)
        await kv.setString(KEY_JOIN_CODE, created.join_code)

        if (mounted) {
          setHousehold(created)
          setJoinCode(created.join_code)
        }
      } catch (e: any) {
        console.error('[OurRecipeBook] Household init failed', e)
        if (mounted) setError(e?.message ?? 'Household init failed')
      } finally {
        if (mounted) setReady(true)
      }
    })()

    return () => {
      mounted = false
    }
  }, [user?.id])

  const joinByCode = useCallback(async (code: string) => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) throw new Error('Bitte Code eingeben.')

    const { data, error: jErr } = await joinHousehold(supabase as any, trimmed)
    if (jErr) throw jErr
    const joined = Array.isArray(data) ? data[0] : data
    if (!joined?.id) throw new Error('Join failed')

    await kv.setString(KEY_HOUSEHOLD_ID, joined.id)
    await kv.setString(KEY_JOIN_CODE, joined.join_code)
    setHousehold(joined)
    setJoinCode(joined.join_code)
  }, [])

  const reset = useCallback(async () => {
    // Simple + robust: clear local IDs and sign out. Next startup recreates an anonymous session + household.
    await kv.remove(KEY_HOUSEHOLD_ID)
    await kv.remove(KEY_JOIN_CODE)
    setHousehold(null)
    setJoinCode(null)
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ ready, household, joinCode, error, joinByCode, reset }),
    [ready, household, joinCode, error, joinByCode, reset]
  )

  return <HouseholdCtx.Provider value={value}>{children}</HouseholdCtx.Provider>
}

export function useHousehold() {
  const ctx = useContext(HouseholdCtx)
  if (!ctx) throw new Error('HouseholdProvider missing')
  return ctx
}
