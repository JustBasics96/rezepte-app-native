import React, { useState } from 'react'
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { useTranslation } from 'react-i18next'

import { supabase } from '../src/platform/supabase'
import { Screen } from '../src/ui/components/Screen'
import { TopBar } from '../src/ui/components/TopBar'
import { Input } from '../src/ui/components/Input'
import { Button } from '../src/ui/components/Button'
import { Card } from '../src/ui/components/Card'
import { useTheme } from '../src/ui/theme'
import { useSession } from '../src/providers/SessionProvider'

export default function AuthScreen() {
  const theme = useTheme()
  const { t } = useTranslation()
  const router = useRouter()
  const { ready, user } = useSession()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If a session already exists, go straight to the planner.
  React.useEffect(() => {
    if (ready && user) {
      router.replace('/(tabs)/plan')
    }
  }, [ready, user, router])

  async function handleAppleSignIn() {
    try {
      setAppleLoading(true)
      setError(null)

      // Generate a secure nonce
      const rawNonce = Crypto.getRandomValues(new Uint8Array(32))
        .reduce((acc, x) => acc + x.toString(16).padStart(2, '0'), '')
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      )

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      })

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple')
      }

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      })

      if (signInError) throw signInError

      router.replace('/(tabs)/plan')
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled, don't show error
        return
      }
      console.error('[OurRecipeBook] Apple Sign-In failed', e)
      setError(e?.message ?? t('auth.appleError'))
    } finally {
      setAppleLoading(false)
    }
  }

  async function handleEmailSubmit() {
    if (!email.trim() || !password) {
      setError(t('auth.emailPasswordRequired'))
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
        Alert.alert(t('auth.confirmationSent'), t('auth.checkEmail'))
        return // Don't navigate yet, user needs to confirm email
      }

      router.replace('/(tabs)/plan')
    } catch (e: any) {
      const msg = e?.message ?? t('auth.loginFailed')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'signin' ? t('auth.signIn') : t('auth.signUp')
  const switchLabel = mode === 'signin' ? t('auth.noAccount') : t('auth.hasAccount')

  return (
    <Screen scroll>
      <TopBar title={t('auth.welcome')} />
      <View style={styles.content}>
        {/* App branding */}
        <View style={styles.header}>
          <Text style={[styles.emoji]}>🍽️</Text>
          <Text style={[styles.appName, { color: theme.text }]}>Unser Rezeptbuch</Text>
          <Text style={[styles.tagline, { color: theme.muted }]}>{t('auth.tagline')}</Text>
        </View>

        {/* Apple Sign-In - iOS only, prominently displayed */}
        {Platform.OS === 'ios' && (
          <View style={styles.appleSection}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
            {appleLoading && (
              <Text style={[styles.loadingText, { color: theme.muted }]}>{t('common.loading')}</Text>
            )}
          </View>
        )}

        {/* Divider */}
        {Platform.OS === 'ios' && (
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.muted }]}>{t('auth.or')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>
        )}

        {/* Email/Password form */}
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
          <View style={styles.form}>
            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="default"
              placeholder="du@example.com"
            />
            <Input
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
            <Button title={title} onPress={handleEmailSubmit} loading={loading} />
          </View>
        </Card>

        {/* Switch mode */}
        <Pressable onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))} style={styles.switchRow}>
          <Text style={[styles.switchText, { color: theme.tint }]}>{switchLabel}</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 20
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8
  },
  emoji: {
    fontSize: 64
  },
  appName: {
    fontSize: 28,
    fontWeight: '900'
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center'
  },
  appleSection: {
    alignItems: 'center',
    gap: 8
  },
  appleButton: {
    width: '100%',
    height: 50
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600'
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8
  },
  form: {
    gap: 12
  },
  switchRow: {
    alignItems: 'center',
    paddingVertical: 8
  },
  switchText: {
    fontSize: 14,
    fontWeight: '700'
  },
  error: {
    fontSize: 13,
    fontWeight: '600'
  }
})
