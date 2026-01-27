import React, { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { supabase } from '../src/platform/supabase'
import { Screen } from '../src/ui/components/Screen'
import { TopBar } from '../src/ui/components/TopBar'
import { Input } from '../src/ui/components/Input'
import { Button } from '../src/ui/components/Button'
import { useTheme } from '../src/ui/theme'
import { useSession } from '../src/providers/SessionProvider'

export default function AuthScreen() {
  const t = useTheme()
  const router = useRouter()
  const { ready, user } = useSession()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If a session already exists, go straight to the planner.
  React.useEffect(() => {
    if (ready && user) {
      router.replace('/(tabs)/plan')
    }
  }, [ready, user, router])

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })
        if (signInError) throw signInError
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password
        })
        if (signUpError) throw signUpError
        Alert.alert('Bestätigungs-E-Mail gesendet', 'Bitte E-Mail prüfen und Anmeldung bestätigen.')
      }

      // SessionProvider will pick up the new session and IndexScreen/auth effect will redirect.
      router.replace('/(tabs)/plan')
    } catch (e: any) {
      const msg = e?.message ?? 'Anmeldung fehlgeschlagen.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'signin' ? 'Anmelden' : 'Registrieren'
  const switchLabel = mode === 'signin' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'

  return (
    <Screen>
      <TopBar title={title} />
      <View style={styles.content}>
        <View style={styles.form}>
          <Input
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="default"
            placeholder="du@example.com"
          />
          <Input
            label="Passwort"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          {error ? <Text style={[styles.error, { color: t.danger }]}>{error}</Text> : null}
          <Button title={title} onPress={handleSubmit} loading={loading} />
        </View>
        <View style={styles.switchRow}>
          <Button
            title={switchLabel}
            onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
            variant="ghost"
          />
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
    gap: 24
  },
  form: {
    gap: 16
  },
  switchRow: {
    marginTop: 16
  },
  error: {
    marginTop: 4,
    fontSize: 14
  }
})
