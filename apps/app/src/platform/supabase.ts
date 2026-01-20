import '../polyfills'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

import { assertEnv, env } from './env'

assertEnv()

const isServer = typeof window === 'undefined'

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    // On native we use AsyncStorage for persisted sessions.
    // On web/SSR (where window is undefined), avoid AsyncStorage to prevent
    // "window is not defined" crashes and skip persistence on the server side.
    persistSession: !isServer,
    autoRefreshToken: !isServer,
    detectSessionInUrl: false,
    storage: isServer ? undefined : AsyncStorage
  }
})
