import React, { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'

import { useHousehold } from '../../src/providers/HouseholdProvider'
import { Screen } from '../../src/ui/components/Screen'
import { TopBar } from '../../src/ui/components/TopBar'
import { Card } from '../../src/ui/components/Card'
import { Input } from '../../src/ui/components/Input'
import { Button } from '../../src/ui/components/Button'
import { LoadingState, ErrorState } from '../../src/ui/components/States'
import { useTheme } from '../../src/ui/theme'

export default function FamilyTab() {
  const t = useTheme()
  const { ready, household, joinCode, error, joinByCode, reset } = useHousehold()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function copy() {
    if (!joinCode) return
    await Clipboard.setStringAsync(joinCode)
    Alert.alert('Kopiert', 'Family Code ist in der Zwischenablage.')
  }

  async function join() {
    try {
      setBusy(true)
      await joinByCode(code)
      setCode('')
      Alert.alert('Verbunden', 'Ihr seid jetzt in einer gemeinsamen Familie.')
    } catch (e: any) {
      console.error('[OurRecipeBook] join failed', e)
      Alert.alert('Fehler', e?.message ?? 'Join failed')
    } finally {
      setBusy(false)
    }
  }

  async function doReset() {
    Alert.alert('Abmelden?', 'Du wirst abgemeldet und dieses Gerät wird zurückgesetzt (lokale IDs werden gelöscht).', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          await reset()
          Alert.alert('OK', 'Du bist abgemeldet. App erneut öffnen oder neu laden.')
        }
      }
    ])
  }

  if (!ready) {
    return (
      <Screen>
        <TopBar title="Familie" />
        <LoadingState />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen>
        <TopBar title="Familie" />
        <ErrorState message={error} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar title="Familie" />

      <Card>
        <Text style={[styles.h, { color: t.text }]}>Family Code</Text>
        <Text style={[styles.code, { color: t.text, borderColor: t.border }]} selectable>
          {joinCode ?? '—'}
        </Text>
        <View style={styles.row}>
          <Button title="Code kopieren" variant="secondary" onPress={copy} disabled={!joinCode} />
        </View>
        <Text style={[styles.p, { color: t.muted }]}>Teile den Code mit deinem Partner. Auf dem zweiten Gerät: Code eingeben → Verbinden.</Text>
      </Card>

      <Card>
        <Text style={[styles.h, { color: t.text }]}>Mit Familie verbinden</Text>
        <Input label="Code" value={code} onChangeText={setCode} placeholder="z.B. 4K7W2Q" autoCapitalize="characters" />
        <Button title="Verbinden" onPress={join} loading={busy} />
      </Card>

      <Card>
        <Text style={[styles.h, { color: t.text }]}>Abmelden</Text>
        <Text style={[styles.p, { color: t.muted }]}>Meldet dieses Gerät ab und setzt lokale Daten zurück.</Text>
        <Button title="Abmelden" variant="danger" onPress={doReset} />
      </Card>

      {household ? (
        <Text style={[styles.small, { color: t.muted }]}>Household: {household.id}</Text>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '900' },
  p: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  small: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  code: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    textAlign: 'center'
  },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }
})
