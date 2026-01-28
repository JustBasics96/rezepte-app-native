import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'

import { weeksAgoLabel } from '@our-recipebook/core'

import { useHousehold } from '../../src/providers/HouseholdProvider'
import { useRecipes } from '../../src/features/recipes'
import { useCookFeedback } from '../../src/features/cookFeedback'
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
  const recipes = useRecipes()
  const feedback = useCookFeedback()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [showJoin, setShowJoin] = useState(false)

  // Aggregiere Feedback pro Rezept
  const feedbackByRecipe = useMemo(() => {
    const map = new Map<string, { good: number; bad: number; lastAt: string }>()
    for (const f of feedback.items) {
      const cur = map.get(f.recipeId) ?? { good: 0, bad: 0, lastAt: f.createdAt }
      if (f.score === 1) cur.good++
      if (f.score === -1) cur.bad++
      if (f.createdAt > cur.lastAt) cur.lastAt = f.createdAt
      map.set(f.recipeId, cur)
    }
    return [...map.entries()].map(([recipeId, stats]) => ({ recipeId, ...stats }))
  }, [feedback.items])

  // Alle bewerteten Rezepte, gefiltert nach Suche, sortiert nach Score
  const ratedRecipes = useMemo(() => {
    const q = search.trim().toLowerCase()
    return feedbackByRecipe
      .map((entry) => {
        const recipe = recipes.recipesById.get(entry.recipeId)
        if (!recipe) return null
        // Netto-Score: positiv = gut, negativ = schlecht
        const score = entry.good - entry.bad
        return { ...entry, recipe, score }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .filter((x) => !q || x.recipe.title.toLowerCase().includes(q))
      .sort((a, b) => b.score - a.score || b.good - a.good || a.recipe.title.localeCompare(b.recipe.title))
  }, [feedbackByRecipe, recipes.recipesById, search])

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

      {/* Bewertete Rezepte – prominent oben */}
      <Card>
        <Text style={[styles.h, { color: t.text }]}>Bewertete Rezepte</Text>

        {/* Suche */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rezept suchen …"
          placeholderTextColor={t.muted}
          style={[styles.searchInput, { backgroundColor: t.bg, borderColor: t.border, color: t.text }]}
          accessibilityLabel="Rezept suchen"
        />

        {feedback.loading || recipes.loading ? (
          <Text style={[styles.small, { color: t.muted }]}>Lade …</Text>
        ) : !ratedRecipes.length ? (
          <Text style={[styles.small, { color: t.muted }]}>
            {search ? 'Keine Treffer.' : 'Noch keine Bewertungen.'}
          </Text>
        ) : (
          ratedRecipes.slice(0, 30).map((entry) => (
            <View key={entry.recipeId} style={styles.feedbackRow}>
              <Text style={[styles.scoreIcon, { color: entry.score >= 0 ? '#22c55e' : '#ef4444' }]}>
                {entry.score >= 0 ? '👍' : '👎'}
              </Text>
              <View style={styles.feedbackContent}>
                <Text style={[styles.feedbackTitle, { color: t.text }]} numberOfLines={1}>
                  {entry.recipe.title}
                </Text>
                <Text style={[styles.feedbackMeta, { color: t.muted }]}>
                  {entry.good}× gut · {entry.bad}× schlecht · {weeksAgoLabel(entry.lastAt)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Family Code – kompakt */}
      <Card>
        <View style={styles.rowBetween}>
          <Text style={[styles.h, { color: t.text }]}>Family Code</Text>
          <Text style={[styles.codeInline, { color: t.text }]} selectable>
            {joinCode ?? '—'}
          </Text>
        </View>
        <Text style={[styles.hint, { color: t.muted }]}>
          Teile den Code, damit ein zweites Gerät beitreten kann.
        </Text>
        <Button title="Kopieren" variant="secondary" onPress={copy} disabled={!joinCode} />
      </Card>

      {/* Mit Familie verbinden – einklappbar */}
      <Card>
        <Pressable onPress={() => setShowJoin((v) => !v)} style={styles.rowBetween}>
          <Text style={[styles.h, { color: t.text }]}>Mit Code verbinden</Text>
          <Text style={{ color: t.muted }}>{showJoin ? '▲' : '▼'}</Text>
        </Pressable>
        {showJoin && (
          <>
            <Input label="Code" value={code} onChangeText={setCode} placeholder="z.B. 4K7W2Q" autoCapitalize="characters" />
            <Button title="Verbinden" onPress={join} loading={busy} />
          </>
        )}
      </Card>

      {/* Abmelden – dezent unten */}
      <Pressable onPress={doReset} style={styles.logoutRow}>
        <Text style={[styles.logoutText, { color: t.muted }]}>Abmelden / Zurücksetzen</Text>
      </Pressable>

      {household ? (
        <Text style={[styles.tiny, { color: t.muted }]}>ID: {household.id}</Text>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '900' },
  hint: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  small: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  tiny: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14
  },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  feedbackContent: { flex: 1 },
  feedbackTitle: { fontSize: 14, fontWeight: '800' },
  feedbackMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  scoreIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  codeInline: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoutRow: { paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontSize: 13, fontWeight: '700' }
})
