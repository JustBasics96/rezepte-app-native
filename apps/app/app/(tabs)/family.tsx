import React, { useMemo, useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useTranslation } from 'react-i18next'

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
import { setLanguage, getCurrentLanguage, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '../../src/i18n'

const SLOT_KEYS = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export default function FamilyTab() {
  const theme = useTheme()
  const { t, i18n } = useTranslation()
  const { ready, household, joinCode, enabledSlots, error, joinByCode, toggleSlot, reset } = useHousehold()
  const recipes = useRecipes()
  const feedback = useCookFeedback()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [showJoin, setShowJoin] = useState(false)

  const slotLabels = useMemo(() => SLOT_KEYS.map((key) => t(`slots.${key}`)), [t])

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
    Alert.alert(t('family.copied'), t('family.copiedHint'))
  }

  async function join() {
    try {
      setBusy(true)
      await joinByCode(code)
      setCode('')
      Alert.alert(t('family.connected'), t('family.connectedHint'))
    } catch (e: any) {
      console.error('[OurRecipeBook] join failed', e)
      Alert.alert(t('common.error'), e?.message ?? 'Join failed')
    } finally {
      setBusy(false)
    }
  }

  function changeLanguage() {
    const current = getCurrentLanguage()
    const options = SUPPORTED_LANGUAGES.map((lang) => ({
      text: LANGUAGE_NAMES[lang] + (lang === current ? ' ✓' : ''),
      onPress: () => {
        setLanguage(lang)
        // Force re-render by updating i18n
        i18n.changeLanguage(lang)
      }
    }))
    Alert.alert(t('family.language'), t('family.languageHint'), [
      ...options,
      { text: t('common.cancel'), style: 'cancel' }
    ])
  }

  async function doReset() {
    Alert.alert(t('family.logout') + '?', t('family.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('family.logout').split(' / ')[0],
        style: 'destructive',
        onPress: async () => {
          await reset()
          Alert.alert(t('common.ok'), t('family.loggedOut'))
        }
      }
    ])
  }

  if (!ready) {
    return (
      <Screen>
        <TopBar title={t('family.title')} />
        <LoadingState />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen>
        <TopBar title={t('family.title')} />
        <ErrorState message={error} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar title={t('family.title')} />

      {/* Bewertete Rezepte – prominent oben */}
      <Card>
        <Text style={[styles.h, { color: theme.text }]}>{t('family.ratedRecipes')}</Text>

        {/* Suche */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('family.searchRecipe')}
          placeholderTextColor={theme.muted}
          style={[styles.searchInput, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
          accessibilityLabel={t('family.searchRecipe')}
        />

        {feedback.loading || recipes.loading ? (
          <Text style={[styles.small, { color: theme.muted }]}>{t('common.loading')}</Text>
        ) : !ratedRecipes.length ? (
          <Text style={[styles.small, { color: theme.muted }]}>
            {search ? t('family.noResults') : t('family.noRatings')}
          </Text>
        ) : (
          ratedRecipes.slice(0, 30).map((entry) => (
            <View key={entry.recipeId} style={styles.feedbackRow}>
              <Text style={[styles.scoreIcon, { color: entry.score >= 0 ? '#22c55e' : '#ef4444' }]}>
                {entry.score >= 0 ? '👍' : '👎'}
              </Text>
              <View style={styles.feedbackContent}>
                <Text style={[styles.feedbackTitle, { color: theme.text }]} numberOfLines={1}>
                  {entry.recipe.title}
                </Text>
                <Text style={[styles.feedbackMeta, { color: theme.muted }]}>
                  {t('recipes.timesGood', { count: entry.good })} · {t('recipes.timesBad', { count: entry.bad })} · {weeksAgoLabel(entry.lastAt)}
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Mahlzeiten-Einstellung */}
      <Card>
        <Text style={[styles.h, { color: theme.text }]}>{t('family.dailyPlanning')}</Text>
        <Text style={[styles.hint, { color: theme.muted, marginBottom: 10 }]}>
          {t('family.dailyPlanningHint')}
        </Text>
        <View style={styles.slotList}>
          {slotLabels.map((label, idx) => {
            const isEnabled = enabledSlots.includes(idx)
            return (
              <Pressable
                key={idx}
                onPress={() => toggleSlot(idx)}
                style={[
                  styles.slotRow,
                  { borderColor: isEnabled ? theme.tint : theme.border, backgroundColor: isEnabled ? theme.tint + '15' : theme.card }
                ]}
                accessibilityRole="checkbox"
                accessibilityLabel={label}
                accessibilityState={{ checked: isEnabled }}
              >
                <View style={[styles.slotCheck, { borderColor: isEnabled ? theme.tint : theme.border, backgroundColor: isEnabled ? theme.tint : 'transparent' }]}>
                  {isEnabled && <FontAwesome name="check" size={12} color="#fff" />}
                </View>
                <Text style={[styles.slotLabel, { color: isEnabled ? theme.tint : theme.text }]}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
      </Card>

      {/* Family Code – kompakt */}
      <Card>
        <View style={styles.rowBetween}>
          <Text style={[styles.h, { color: theme.text }]}>{t('family.familyCode')}</Text>
          <Text style={[styles.codeInline, { color: theme.text }]} selectable>
            {joinCode ?? '—'}
          </Text>
        </View>
        <Text style={[styles.hint, { color: theme.muted }]}>
          {t('family.familyCodeHint')}
        </Text>
        <Button title={t('common.copy')} variant="secondary" onPress={copy} disabled={!joinCode} />
      </Card>

      {/* Mit Familie verbinden – einklappbar */}
      <Card>
        <Pressable onPress={() => setShowJoin((v) => !v)} style={styles.rowBetween}>
          <Text style={[styles.h, { color: theme.text }]}>{t('family.connectWithCode')}</Text>
          <Text style={{ color: theme.muted }}>{showJoin ? '▲' : '▼'}</Text>
        </Pressable>
        {showJoin && (
          <>
            <Input label="Code" value={code} onChangeText={setCode} placeholder={t('family.codePlaceholder')} autoCapitalize="characters" />
            <Button title={t('family.connect')} onPress={join} loading={busy} />
          </>
        )}
      </Card>

      {/* Language selector */}
      <Card>
        <Pressable onPress={changeLanguage} style={styles.rowBetween}>
          <Text style={[styles.h, { color: theme.text }]}>{t('family.language')}</Text>
          <Text style={[styles.codeInline, { color: theme.muted }]}>{LANGUAGE_NAMES[getCurrentLanguage()]}</Text>
        </Pressable>
      </Card>

      {/* Abmelden – dezent unten */}
      <Pressable onPress={doReset} style={styles.logoutRow}>
        <Text style={[styles.logoutText, { color: theme.muted }]}>{t('family.logout')}</Text>
      </Pressable>

      {/* Legal links */}
      <View style={styles.legalRow}>
        <Pressable onPress={() => Linking.openURL('https://ruberg.dev/rezeptbuch/impressum')}>
          <Text style={[styles.legalLink, { color: theme.muted }]}>{t('family.imprint')}</Text>
        </Pressable>
        <Text style={[styles.legalDot, { color: theme.border }]}>·</Text>
        <Pressable onPress={() => Linking.openURL('https://ruberg.dev/rezeptbuch/datenschutz')}>
          <Text style={[styles.legalLink, { color: theme.muted }]}>{t('family.privacy')}</Text>
        </Pressable>
      </View>

      <Text style={[styles.tiny, { color: theme.muted }]}>{t('common.version')} 1.0.0</Text>

      {household ? (
        <Text style={[styles.tiny, { color: theme.muted }]}>ID: {household.id}</Text>
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
  mealButtons: { flexDirection: 'row', gap: 10 },
  mealButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2
  },
  mealButtonNum: { fontSize: 22, fontWeight: '900' },
  mealButtonLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  feedbackContent: { flex: 1 },
  feedbackTitle: { fontSize: 14, fontWeight: '800' },
  feedbackMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  scoreIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  codeInline: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoutRow: { paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontSize: 13, fontWeight: '700' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  legalLink: { fontSize: 12, fontWeight: '600' },
  legalDot: { fontSize: 12 },
  slotList: { gap: 8 },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2
  },
  slotCheck: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  slotLabel: { fontSize: 15, fontWeight: '700' }
})
