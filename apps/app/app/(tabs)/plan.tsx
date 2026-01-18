import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'

import { weeksAgoLabel } from '@our-recipebook/core'

import { useMealPlanWeek } from '../../src/features/mealPlan'
import { useRecipes } from '../../src/features/recipes'
import { useCookFeedback } from '../../src/features/cookFeedback'
import { publicPhotoUrl } from '../../src/features/photos'
import { Screen } from '../../src/ui/components/Screen'
import { TopBar } from '../../src/ui/components/TopBar'
import { Card } from '../../src/ui/components/Card'
import { Button } from '../../src/ui/components/Button'
import { Chip } from '../../src/ui/components/Chip'
import { LoadingState, ErrorState, EmptyState } from '../../src/ui/components/States'
import { RecipeImage } from '../../src/ui/components/RecipeImage'
import { useTheme } from '../../src/ui/theme'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function dayLabel(isoDay: string) {
  const d = new Date(isoDay + 'T00:00:00')
  const name = DAY_NAMES[(d.getDay() + 6) % 7]
  return `${name} ${d.getDate()}.${d.getMonth() + 1}.`
}

export default function PlanScreen() {
  const t = useTheme()
  // Week navigation: offset from current week
  const [weekOffset, setWeekOffset] = useState(0)
  const anchorDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])
  const week = useMealPlanWeek(anchorDate)
    // Refresh week data whenever this screen gains focus (e.g., after choosing a recipe)
    useFocusEffect(
      useCallback(() => {
        week.refresh()
      }, [week.refresh])
    )
  const recipes = useRecipes()
  const feedback = useCookFeedback()

  // Human-readable label for the current week range (e.g. "Mo 12.1. – So 18.1.")
  const weekLabel = useMemo(() => {
    if (!week.days.length) return ''
    const first = week.days[0]
    const last = week.days[week.days.length - 1]
    return `${dayLabel(first)} – ${dayLabel(last)}`
  }, [week.days])

  const headerTitle = weekLabel ? `Wochenplan · ${weekLabel}` : 'Wochenplan'

  // Collapse past days to reduce clutter — define hooks before any conditional returns
  const [collapsePast, setCollapsePast] = useState(true)
  const nowMidnight = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const isPast = useCallback((isoDay: string) => new Date(isoDay + 'T00:00:00') < nowMidnight, [nowMidnight])
  const pastDays = useMemo(() => week.days.filter((d) => isPast(d)), [week.days, isPast])
  const futureDays = useMemo(() => week.days.filter((d) => !isPast(d)), [week.days, isPast])

  const workedWell = useMemo(() => {
    const byRecipe = new Map<string, { score: 1 | -1; createdAt: string; day: string }>()
    for (const f of feedback.items) {
      if (!byRecipe.has(f.recipeId)) byRecipe.set(f.recipeId, { score: f.score, createdAt: f.createdAt, day: f.day })
    }
    return [...byRecipe.entries()]
      .filter(([, v]) => v.score === 1)
      .map(([recipeId, v]) => ({ recipeId, ...v }))
      .slice(0, 3)
  }, [feedback.items])

  function onPickRecipe(day: string) {
    router.push({ pathname: '/add-to-plan', params: { day } })
  }

  async function onToggleCooked(day: string) {
    const it = week.byDay.get(day)
    if (!it?.recipe_id) return
    const next = it.status === 'cooked' ? 'planned' : 'cooked'
    await week.setStatus(day, next)
    if (next === 'cooked') {
      try {
        await week.touchLastCooked(it.recipe_id)
      } catch (e) {
        console.warn('[OurRecipeBook] markLastCooked failed', e)
      }

      Alert.alert(
        'Hat es gut funktioniert?',
        'Optional – hilft euch später beim Erinnern.',
        [
          {
            text: '👍 War gut',
            onPress: () => feedback.record({ recipeId: it.recipe_id, day, score: 1 })
          },
          {
            text: '👎 Nope',
            onPress: () => feedback.record({ recipeId: it.recipe_id, day, score: -1 })
          },
          { text: 'Überspringen', style: 'cancel' }
        ]
      )
    }
  }

  async function repeatRecipe(recipeId: string) {
    // Simple rule: schedule on the first empty day of this week; otherwise do nothing.
    const target = week.days.find((d) => !week.byDay.get(d)?.recipe_id)
    if (!target) {
      Alert.alert('Kein freier Tag', 'Diese Woche ist schon voll geplant.')
      return
    }
    await week.setDay(target, recipeId)
    Alert.alert('Eingetragen', `${dayLabel(target)} ist jetzt geplant.`)
  }

  // Prepare content for a single render path to keep hook order stable
  const content = (() => {
    if (week.loading || recipes.loading) {
      return (
        <>
          <TopBar title={headerTitle} />
          <LoadingState />
        </>
      )
    }

    if (week.error) {
      return (
        <>
          <TopBar title={headerTitle} />
          <ErrorState message={week.error} onRetry={week.refresh} />
        </>
      )
    }

    if (!week.days.length) {
      return (
        <>
          <TopBar
            title={headerTitle}
            right={
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label="‹ Woche" onPress={() => setWeekOffset((x) => x - 1)} accessibilityLabel="Vorherige Woche" />
                <Chip label="Heute" onPress={() => setWeekOffset(0)} accessibilityLabel="Zur aktuellen Woche" />
                <Chip label="Woche ›" onPress={() => setWeekOffset((x) => x + 1)} accessibilityLabel="Nächste Woche" />
              </View>
            }
          />
          <EmptyState title="Noch keine Woche" body="Bitte neu laden." />
        </>
      )
    }

    return (
      <>
        <TopBar
          title={headerTitle}
          right={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label="‹ Woche" onPress={() => setWeekOffset((x) => x - 1)} accessibilityLabel="Vorherige Woche" />
              <Chip label="Heute" onPress={() => setWeekOffset(0)} accessibilityLabel="Zur aktuellen Woche" />
              <Chip label="Woche ›" onPress={() => setWeekOffset((x) => x + 1)} accessibilityLabel="Nächste Woche" />
            </View>
          }
        />

        {workedWell.length ? (
          <Card>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Hat gut funktioniert</Text>
            {workedWell.map((w) => {
              const r = recipes.recipesById.get(w.recipeId)
              if (!r) return null
              return (
                <View key={w.recipeId} style={styles.workedRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.workedTitle, { color: t.text }]} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text style={[styles.muted, { color: t.muted }]}>{weeksAgoLabel(w.createdAt)}</Text>
                  </View>
                  <Button title="Wiederholen" variant="secondary" onPress={() => repeatRecipe(w.recipeId)} />
                </View>
              )
            })}
          </Card>
        ) : null}

        {pastDays.length ? (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Vergangene Tage</Text>
              <Chip
                label={collapsePast ? 'Aufklappen' : 'Zuklappen'}
                onPress={() => setCollapsePast((x) => !x)}
                accessibilityLabel={collapsePast ? 'Vergangene Tage aufklappen' : 'Vergangene Tage zuklappen'}
              />
            </View>
            {collapsePast ? (
              <Text style={[styles.muted, { color: t.muted }]}>
                {pastDays.length} Tag(e) – eingeklappt
              </Text>
            ) : (
              pastDays.map((day) => (
                <View key={`past-${day}`}>{renderDay(day)}</View>
              ))
            )}
          </Card>
        ) : null}

        {futureDays.map((day) => renderDay(day))}
      </>
    )
  })()

  function renderDay(day: string) {
    const it = week.byDay.get(day)
    const status = it?.recipe_id ? it.status : 'empty'
    const title = it?.recipe?.title ?? (it?.recipe_id ? recipes.recipesById.get(it.recipe_id)?.title : null)
    const photo = it?.recipe?.photo_path ?? (it?.recipe_id ? recipes.recipesById.get(it.recipe_id)?.photo_path : null)
    const photoUrl = publicPhotoUrl(photo ?? null)

    return (
      <Pressable
        key={day}
        onPress={() => onPickRecipe(day)}
        accessibilityRole="button"
        accessibilityLabel={`${dayLabel(day)}: Rezept auswählen`}
      >
        {({ pressed }) => (
          <Card style={{ opacity: pressed ? 0.92 : 1 }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.day, { color: t.muted }]}>{dayLabel(day)}</Text>
                <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
                  {title ?? 'Tippen zum Rezept wählen'}
                </Text>
              </View>

              <View style={styles.statusWrap}>
                <Text
                  style={[
                    styles.status,
                    {
                      color: status === 'cooked' ? t.success : status === 'planned' ? t.tint : t.muted,
                      borderColor: t.border
                    }
                  ]}
                >
                  {status === 'cooked' ? '✓ gekocht' : status === 'planned' ? 'geplant' : 'leer'}
                </Text>
              </View>
            </View>

            <View style={styles.bottomRow}>
              <RecipeImage uri={photoUrl} style={styles.image} />

              <View style={styles.actions}>
                <Button
                  title={it?.status === 'cooked' ? 'Undo' : 'Gekocht'}
                  variant={it?.recipe_id ? 'secondary' : 'ghost'}
                  onPress={() => onToggleCooked(day)}
                  disabled={!it?.recipe_id}
                  accessibilityLabel="Als gekocht markieren"
                />
                <Button
                  title="Leeren"
                  variant="ghost"
                  onPress={() => week.setDay(day, null)}
                  disabled={!it?.recipe_id}
                  accessibilityLabel="Tag leeren"
                />
              </View>
            </View>
          </Card>
        )}
      </Pressable>
    )
  }

  return <Screen scroll>{content}</Screen>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  day: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800' },
  statusWrap: { alignItems: 'flex-end' },
  status: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth
  },
  bottomRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  image: { width: 84, height: 64, borderRadius: 12 },
  actions: { flex: 1, gap: 8, flexDirection: 'row', flexWrap: 'wrap' },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  workedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  workedTitle: { fontSize: 16, fontWeight: '800' },
  muted: { fontSize: 12, fontWeight: '700' }
})
