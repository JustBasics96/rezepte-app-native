import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Household } from '@our-recipebook/core'
import {
  createHousehold,
  getHousehold,
  joinHousehold,
  updateHouseholdSettings,
  deleteMealPlanBySlots,
  parseEnabledSlots,
  DEFAULT_SLOTS
} from '@our-recipebook/core'

import { kv } from '../platform/storage'
import { supabase } from '../platform/supabase'
import { useSession } from './SessionProvider'

const KEY_HOUSEHOLD_ID = 'orb.householdId'
const KEY_JOIN_CODE = 'orb.joinCode'

type ToggleSlotResult = { needsConfirmation: boolean; slot?: number } | undefined

type HouseholdState = {
  ready: boolean
  household: Household | null
  joinCode: string | null
  enabledSlots: number[]
  error: string | null
  joinByCode: (code: string) => Promise<void>
  toggleSlot: (slot: number, confirmed?: boolean) => Promise<ToggleSlotResult>
  reset: () => Promise<void>
}

const HouseholdCtx = createContext<HouseholdState | null>(null)

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession()
  const [household, setHousehold] = useState<Household | null>(null)
  const [joinCode, setJoinCode] = useState<string | null>(null)
  const [enabledSlots, setEnabledSlotsState] = useState<number[]>(DEFAULT_SLOTS)
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
            const slots = parseEnabledSlots(data.enabled_slots)
            if (mounted) {
              setHousehold({ ...data, enabled_slots: slots } as Household)
              setJoinCode(data.join_code)
              setEnabledSlotsState(slots)
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

        const slots = parseEnabledSlots(created.enabled_slots)
        if (mounted) {
          setHousehold({ ...created, enabled_slots: slots })
          setJoinCode(created.join_code)
          setEnabledSlotsState(slots)
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
    const slots = parseEnabledSlots(joined.enabled_slots)
    setHousehold({ ...joined, enabled_slots: slots })
    setJoinCode(joined.join_code)
    setEnabledSlotsState(slots)
  }, [])

  const toggleSlot = useCallback(async (slot: number, confirmed = false) => {
    if (!household?.id) return
    
    const current = enabledSlots
    const isRemoving = current.includes(slot)
    let next: number[]
    
    if (isRemoving) {
      // Remove slot (but keep at least one)
      next = current.filter(s => s !== slot)
      if (next.length === 0) next = [slot] // Can't disable all
    } else {
      // Add slot
      next = [...current, slot].sort((a, b) => a - b)
    }
    
    // If removing and not confirmed, signal that confirmation is needed
    // The UI layer should call toggleSlot(slot, true) after user confirms
    if (isRemoving && !confirmed) {
      return { needsConfirmation: true, slot }
    }

    // Optimistic update
    setEnabledSlotsState(next)

    // If removing a slot, delete all associated meal plan entries first
    if (isRemoving) {
      const { error: delErr } = await deleteMealPlanBySlots(supabase as any, household.id, [slot])
      if (delErr) {
        console.error('[OurRecipeBook] Failed to delete meal_plan entries for slot', slot, delErr)
      }
    }

    const { data, error: uErr } = await updateHouseholdSettings(supabase as any, household.id, {
      enabled_slots: JSON.stringify(next)
    })

    if (uErr) {
      console.error('[OurRecipeBook] Failed to update enabled_slots', uErr)
      // Revert on error
      setEnabledSlotsState(current)
      return
    }

    if (data) {
      const newSlots = parseEnabledSlots(data.enabled_slots)
      setHousehold({ ...data, enabled_slots: newSlots } as Household)
      setEnabledSlotsState(newSlots)
    }
    
    return { needsConfirmation: false }
  }, [household?.id, enabledSlots])

  const reset = useCallback(async () => {
    // Simple + robust: clear local IDs and sign out. Next startup recreates an anonymous session + household.
    await kv.remove(KEY_HOUSEHOLD_ID)
    await kv.remove(KEY_JOIN_CODE)
    setHousehold(null)
    setJoinCode(null)
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ ready, household, joinCode, enabledSlots, error, joinByCode, toggleSlot, reset }),
    [ready, household, joinCode, enabledSlots, error, joinByCode, toggleSlot, reset]
  )

  return <HouseholdCtx.Provider value={value}>{children}</HouseholdCtx.Provider>
}

export function useHousehold() {
  const ctx = useContext(HouseholdCtx)
  if (!ctx) throw new Error('HouseholdProvider missing')
  return ctx
}
