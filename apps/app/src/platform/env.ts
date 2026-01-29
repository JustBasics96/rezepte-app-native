export const env = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
}

export function assertEnv() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.error(
      '[Kochplan] Missing env vars: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to apps/app/.env.'
    )
  }
}
