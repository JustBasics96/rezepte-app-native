import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '../platform/supabase'

type SessionState = {
  ready: boolean
  session: Session | null
  user: User | null
  error: string | null
}

const SessionCtx = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted) return
        if (error) throw error
        setSession(data.session)
        setUser(data.session?.user ?? null)
      } catch (e: any) {
        console.error('[OurRecipeBook] Auth init failed', e)
        if (mounted) setError(e?.message ?? 'Auth init failed')
      } finally {
        if (mounted) setReady(true)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({ ready, session, user, error }), [ready, session, user, error])
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession() {
  const ctx = useContext(SessionCtx)
  if (!ctx) throw new Error('SessionProvider missing')
  return ctx
}
