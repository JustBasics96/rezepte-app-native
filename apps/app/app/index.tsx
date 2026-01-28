import React, { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useSession } from '../src/providers/SessionProvider'
import { useTheme } from '../src/ui/theme'

export default function IndexScreen() {
  const { ready, user } = useSession()
  const router = useRouter()
  const t = useTheme()

  useEffect(() => {
    if (!ready) return
    if (user) {
      router.replace('/(tabs)/plan')
    } else {
      router.replace('/auth')
    }
  }, [ready, user, router])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
      <ActivityIndicator size="large" color={t.tint} />
    </View>
  )
}
