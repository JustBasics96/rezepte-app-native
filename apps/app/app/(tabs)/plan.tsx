import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import FontAwesome from '@expo/vector-icons/FontAwesome'

import { useMealPlanWeek } from '../../src/features/mealPlan'
import { useRecipes } from '../../src/features/recipes'
import { useCookFeedback } from '../../src/features/cookFeedback'
import { publicPhotoUrl } from '../../src/features/photos'
import { Screen } from '../../src/ui/components/Screen'
import { TopBar } from '../../src/ui/components/TopBar'
import { LoadingState, ErrorState } from '../../src/ui/components/States'
import { RecipeImage } from '../../src/ui/components/RecipeImage'
import { useTheme } from '../../src/ui/theme'

const DAY_NAMES_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const DAY_NAMES_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

function formatDay(isoDay: string, long = false) {
  const d = new Date(isoDay + 'T00:00:00')
  const names = long ? DAY_NAMES_LONG : DAY_NAMES_SHORT
  const name = names[(d.getDay() + 6) % 7]
  return long ? `${name}, ${d.getDate()}.${d.getMonth() + 1}.` : `${name} ${d.getDate()}.`
}

function isToday(isoDay: string) {
  const today = new Date()
  const d = new Date(isoDay + 'T00:00:00')
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

function isPast(isoDay: string) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return new Date(isoDay + 'T00:00:00') < now
}

export default function PlanScreen() {
  const t = useTheme()
  const [weekOffset, setWeekOffset] = useState(0)

  const anchorDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])

  const week = useMealPlanWeek(anchorDate)
  const recipes = useRecipes()
  const feedback = useCookFeedback()

  useFocusEffect(
    useCallback(() => {
      week.refresh()
    }, [week.refresh])
  )

  // Split days: past (excluding today) vs current/future
  const { pastDays, currentDays } = useMemo(() => {
    const past: string[] = []
    const current: string[] = []
    for (const d of week.days) {
      if (isPast(d) && !isToday(d)) past.push(d)
      else current.push(d)
    }
    return { pastDays: past, currentDays: current }
  }, [week.days])

  const [showPast, setShowPast] = useState(false)

  // Handlers
  function onPickRecipe(day: string) {
    router.push({ pathname: '/add-to-plan', params: { day } })
  }

  async function onMarkCooked(day: string) {
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
      Alert.alert("Wie war's?", 'Hilft beim Erinnern was gut funktioniert.', [
        { text: '👍 Gut!', onPress: () => feedback.record({ recipeId: it.recipe_id, day, score: 1 }) },
        { text: '👎 Naja', onPress: () => feedback.record({ recipeId: it.recipe_id, day, score: -1 }) },
        { text: 'Überspringen', style: 'cancel' }
      ])
    }
  }

  async function onClearDay(day: string) {
    Alert.alert('Tag leeren?', `${formatDay(day, true)} wirklich leeren?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Leeren', style: 'destructive', onPress: () => week.setDay(day, null) }
    ])
  }

  // Week label
  const weekLabel = useMemo(() => {
    if (!week.days.length) return ''
    return `${formatDay(week.days[0])} – ${formatDay(week.days[week.days.length - 1])}`
  }, [week.days])

  // Render a single day card
  function DayCard({ day }: { day: string }) {
    const it = week.byDay.get(day)
    const hasRecipe = !!it?.recipe_id
    const isCooked = it?.status === 'cooked'
    const isTodayCard = isToday(day)
    const isPastDay = isPast(day)

    const recipe = hasRecipe && it?.recipe_id ? recipes.recipesById.get(it.recipe_id) : null
    const title = recipe?.title ?? it?.recipe?.title ?? null
    const photoUrl = publicPhotoUrl(recipe?.photo_path ?? it?.recipe?.photo_path ?? null)

    return (
      <Pressable onPress={() => onPickRecipe(day)} accessibilityLabel={`${formatDay(day, true)}: Gericht wählen`}>
        {({ pressed }) => (
          <View
            style={[
              styles.dayCard,
              {
                backgroundColor: isTodayCard ? t.tint + '15' : t.card,
                borderColor: isTodayCard ? t.tint : t.border,
                opacity: pressed ? 0.9 : isPastDay ? 0.7 : 1
              }
            ]}
          >
            {/* Day header */}
            <View style={styles.dayHeader}>
              <View style={styles.dayLabelRow}>
                {isTodayCard && (
                  <View style={[styles.todayBadge, { backgroundColor: t.tint }]}>
                    <Text style={styles.todayText}>Heute</Text>
                  </View>
                )}
                <Text style={[styles.dayName, { color: isTodayCard ? t.tint : t.muted }]}>
                  {formatDay(day, true)}
                </Text>
              </View>
              {hasRecipe && (
                <Pressable
                  onPress={() => onClearDay(day)}
                  hitSlop={12}
                  accessibilityLabel="Tag leeren"
                >
                  <FontAwesome name="times" size={16} color={t.muted} />
                </Pressable>
              )}
            </View>

            {/* Content */}
            {hasRecipe ? (
              <View style={styles.recipeRow}>
                <RecipeImage uri={photoUrl} style={styles.recipeImage} />
                <View style={styles.recipeInfo}>
                  <Text style={[styles.recipeTitle, { color: t.text }]} numberOfLines={2}>
                    {title}
                  </Text>
                  {recipe?.tags?.length ? (
                    <Text style={[styles.recipeTags, { color: t.muted }]} numberOfLines={1}>
                      {recipe.tags.slice(0, 3).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                {/* Cooked button - always visible */}
                <Pressable
                  onPress={() => onMarkCooked(day)}
                  style={[
                    styles.cookedButton,
                    { backgroundColor: isCooked ? t.success : t.card, borderColor: isCooked ? t.success : t.border }
                  ]}
                  accessibilityLabel={isCooked ? 'Als nicht gekocht markieren' : 'Als gekocht markieren'}
                >
                  <Text style={[styles.cookedIcon, { color: isCooked ? '#fff' : t.muted }]}>
                    {isCooked ? '✓' : '○'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyRow}>
                <FontAwesome name="plus" size={16} color={t.tint} />
                <Text style={[styles.emptyText, { color: t.tint }]}>Gericht wählen</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    )
  }

  // Loading / Error states
  if (week.loading || recipes.loading) {
    return (
      <Screen>
        <TopBar title="Wochenplan" />
        <LoadingState />
      </Screen>
    )
  }

  if (week.error) {
    return (
      <Screen>
        <TopBar title="Wochenplan" />
        <ErrorState message={week.error} onRetry={week.refresh} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar title="Wochenplan" />

      {/* Week navigation - compact */}
      <View style={styles.weekNav}>
        <Pressable onPress={() => setWeekOffset((x) => x - 1)} hitSlop={12} accessibilityLabel="Vorherige Woche">
          <Text style={[styles.navArrow, { color: t.tint }]}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setWeekOffset(0)} accessibilityLabel="Zur aktuellen Woche">
          <Text style={[styles.weekLabel, { color: t.text }]}>{weekLabel}</Text>
        </Pressable>
        <Pressable onPress={() => setWeekOffset((x) => x + 1)} hitSlop={12} accessibilityLabel="Nächste Woche">
          <Text style={[styles.navArrow, { color: t.tint }]}>›</Text>
        </Pressable>
      </View>

      {/* Past days - collapsed by default */}
      {pastDays.length > 0 && (
        <Pressable onPress={() => setShowPast((x) => !x)} style={styles.pastToggle}>
          <Text style={[styles.pastToggleText, { color: t.muted }]}>
            {showPast ? '▼' : '▶'} {pastDays.length} vergangene{pastDays.length === 1 ? 'r Tag' : ' Tage'}
          </Text>
        </Pressable>
      )}
      {showPast && pastDays.map((day) => <DayCard key={day} day={day} />)}

      {/* Current and future days */}
      {currentDays.map((day) => (
        <DayCard key={day} day={day} />
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 4
  },
  navArrow: { fontSize: 28, fontWeight: '300', paddingHorizontal: 12 },
  weekLabel: { fontSize: 15, fontWeight: '700' },
  pastToggle: { paddingVertical: 10, paddingHorizontal: 4 },
  pastToggleText: { fontSize: 13, fontWeight: '600' },
  dayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  dayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  todayText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  dayName: { fontSize: 14, fontWeight: '700' },
  recipeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recipeImage: { width: 64, height: 48, borderRadius: 10 },
  recipeInfo: { flex: 1, gap: 2 },
  recipeTitle: { fontSize: 16, fontWeight: '800' },
  recipeTags: { fontSize: 12, fontWeight: '600' },
  cookedButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cookedIcon: { fontSize: 20, fontWeight: '700' },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  emptyText: { fontSize: 15, fontWeight: '700' }
})
