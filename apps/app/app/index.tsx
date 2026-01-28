import React, { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useSession } from '../src/providers/SessionProvider'
import { kv } from '../src/platform/storage'
import { Onboarding } from '../src/ui/Onboarding'
import { useTheme } from '../src/ui/theme'

const KEY_ONBOARDING_DONE = 'orb.onboardingDone'

export default function IndexScreen() {
  const { ready, user } = useSession()
  const router = useRouter()
  const t = useTheme()

  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Check if onboarding was already completed
  useEffect(() => {
    ;(async () => {
      const done = await kv.getString(KEY_ONBOARDING_DONE)
      if (!done) {
        setShowOnboarding(true)
      }
      setCheckingOnboarding(false)
    })()
  }, [])

  // Navigate after ready + onboarding check
  useEffect(() => {
    if (!ready || checkingOnboarding || showOnboarding) return
    if (user) {
      router.replace('/(tabs)/plan')
    } else {
      router.replace('/auth')
    }
  }, [ready, user, router, checkingOnboarding, showOnboarding])

  async function handleOnboardingComplete() {
    await kv.setString(KEY_ONBOARDING_DONE, '1')
    setShowOnboarding(false)
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
      <ActivityIndicator size="large" color={t.tint} />
    </View>
  )
}
