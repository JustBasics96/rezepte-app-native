import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import FontAwesome from '@expo/vector-icons/FontAwesome'

import { useMealPlanWeek } from '../../src/features/mealPlan'
import { useRecipes } from '../../src/features/recipes'
import { useCookFeedback } from '../../src/features/cookFeedback'
import { useHousehold } from '../../src/providers/HouseholdProvider'
import { publicPhotoUrl } from '../../src/features/photos'
import { Screen } from '../../src/ui/components/Screen'
import { TopBar } from '../../src/ui/components/TopBar'
import { LoadingState, ErrorState } from '../../src/ui/components/States'
import { RecipeImage } from '../../src/ui/components/RecipeImage'
import { useTheme } from '../../src/ui/theme'

const DAY_NAMES_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const DAY_NAMES_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const SLOT_LABELS = ['Frühstück', 'Mittag', 'Abend', 'Snack']

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
  const { enabledSlots } = useHousehold()
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

  // Handlers
  function onPickRecipe(day: string, slot: number) {
    router.push({ pathname: '/add-to-plan', params: { day, slot: String(slot) } })
  }

  function onViewRecipe(recipeId: string) {
    router.push({ pathname: '/recipe-editor', params: { id: recipeId } })
  }

  async function onMarkCooked(day: string, slot: number) {
    const key = `${day}:${slot}`
    const it = week.byDaySlot.get(key)
    if (!it?.recipe_id) return

    const next = it.status === 'cooked' ? 'planned' : 'cooked'
    await week.setStatus(day, next, slot)

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

  async function onClearSlot(day: string, slot: number) {
    const slotName = SLOT_LABELS[slot]
    Alert.alert(`${slotName} leeren?`, `${formatDay(day, true)} – ${slotName} wirklich leeren?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Leeren', style: 'destructive', onPress: () => week.setDay(day, null, slot) }
    ])
  }

  // Week label
  const weekLabel = useMemo(() => {
    if (!week.days.length) return ''
    return `${formatDay(week.days[0])} – ${formatDay(week.days[week.days.length - 1])}`
  }, [week.days])

  // Check if week is empty (no recipes planned)
  const isWeekEmpty = useMemo(() => {
    for (const day of week.days) {
      for (const slot of enabledSlots) {
        const key = `${day}:${slot}`
        if (week.byDaySlot.get(key)?.recipe_id) return false
      }
    }
    return true
  }, [week.days, week.byDaySlot, enabledSlots])

  // Render a single meal slot row
  function MealSlot({ day, slot, showSlotLabel }: { day: string; slot: number; showSlotLabel: boolean }) {
    const key = `${day}:${slot}`
    const it = week.byDaySlot.get(key)
    const hasRecipe = !!it?.recipe_id
    const isCooked = it?.status === 'cooked'

    const recipe = hasRecipe && it?.recipe_id ? recipes.recipesById.get(it.recipe_id) : null
    const title = recipe?.title ?? it?.recipe?.title ?? null
    const photoUrl = publicPhotoUrl(recipe?.photo_path ?? it?.recipe?.photo_path ?? null)

    return (
      <View style={styles.slotRow}>
        {showSlotLabel && (
          <Text style={[styles.slotLabel, { color: t.muted }]}>{SLOT_LABELS[slot]}</Text>
        )}
        {hasRecipe ? (
          <View style={styles.slotContent}>
            {/* Tap recipe to view details */}
            <Pressable 
              style={styles.recipeRow}
              onPress={() => it?.recipe_id && onViewRecipe(it.recipe_id)}
              accessibilityLabel={`${title} anzeigen`}
            >
              <RecipeImage uri={photoUrl} style={styles.recipeImage} />
              <View style={styles.recipeInfo}>
                <Text style={[styles.recipeTitle, { color: t.text }]} numberOfLines={1}>
                  {title}
                </Text>
                {recipe?.tags?.length ? (
                  <Text style={[styles.recipeTags, { color: t.muted }]} numberOfLines={1}>
                    {recipe.tags.slice(0, 2).join(' · ')}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            {/* Action buttons */}
            <Pressable
              onPress={() => onMarkCooked(day, slot)}
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
            <Pressable onPress={() => onPickRecipe(day, slot)} hitSlop={8} accessibilityLabel="Anderes Gericht wählen">
              <FontAwesome name="exchange" size={12} color={t.muted} />
            </Pressable>
            <Pressable onPress={() => onClearSlot(day, slot)} hitSlop={10} accessibilityLabel="Slot leeren">
              <FontAwesome name="times" size={14} color={t.muted} />
            </Pressable>
          </View>
        ) : (
          <Pressable 
            style={styles.emptySlot} 
            onPress={() => onPickRecipe(day, slot)}
            accessibilityLabel={`${SLOT_LABELS[slot]}: Gericht wählen`}
          >
            <FontAwesome name="plus" size={14} color={t.tint} />
            <Text style={[styles.emptyText, { color: t.tint }]}>
              {showSlotLabel ? 'Gericht wählen' : `${SLOT_LABELS[slot]} wählen`}
            </Text>
          </Pressable>
        )}
      </View>
    )
  }

  // Render a day card with all slots
  function DayCard({ day }: { day: string }) {
    const isTodayCard = isToday(day)
    const isPastDay = isPast(day)
    const showSlotLabels = enabledSlots.length > 1

    return (
      <View
        style={[
          styles.dayCard,
          {
            backgroundColor: isTodayCard ? t.tint + '15' : t.card,
            borderColor: isTodayCard ? t.tint : t.border,
            opacity: isPastDay ? 0.7 : 1
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
        </View>

        {/* Meal slots */}
        {enabledSlots.map((slot) => (
          <MealSlot key={slot} day={day} slot={slot} showSlotLabel={showSlotLabels} />
        ))}
      </View>
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

      {/* Empty week hint */}
      {isWeekEmpty && weekOffset === 0 && (
        <View style={[styles.emptyHint, { backgroundColor: t.tint + '15', borderColor: t.tint }]}>
          <Text style={[styles.emptyHintTitle, { color: t.tint }]}>🗓 Diese Woche ist noch leer</Text>
          <Text style={[styles.emptyHintBody, { color: t.muted }]}>
            Tippe auf ＋ um Gerichte zu planen – dann weißt du immer was auf den Tisch kommt!
          </Text>
        </View>
      )}

      {/* All days */}
      {week.days.map((day) => (
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
    marginBottom: 8
  },
  dayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  todayText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  dayName: { fontSize: 14, fontWeight: '700' },
  slotRow: { marginTop: 6 },
  slotLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  slotContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recipeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  recipeImage: { width: 52, height: 40, borderRadius: 8 },
  recipeInfo: { flex: 1, gap: 1 },
  recipeTitle: { fontSize: 14, fontWeight: '800' },
  recipeTags: { fontSize: 11, fontWeight: '600' },
  cookedButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cookedIcon: { fontSize: 16, fontWeight: '700' },
  emptySlot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  emptyText: { fontSize: 13, fontWeight: '700' },
  emptyHint: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center'
  },
  emptyHintTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  emptyHintBody: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 }
})
