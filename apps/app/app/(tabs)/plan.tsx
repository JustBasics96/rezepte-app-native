import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useTranslation } from 'react-i18next'

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

const SLOT_KEYS = ['breakfast', 'lunch', 'dinner', 'snack'] as const

function formatDay(isoDay: string, long = false, dayNames: { short: string[]; long: string[] }) {
  const d = new Date(isoDay + 'T00:00:00')
  const names = long ? dayNames.long : dayNames.short
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
  const theme = useTheme()
  const { t } = useTranslation()
  const { enabledSlots } = useHousehold()
  const [weekOffset, setWeekOffset] = useState(0)

  const dayNames = useMemo(() => ({
    short: t('days.short', { returnObjects: true }) as string[],
    long: t('days.long', { returnObjects: true }) as string[]
  }), [t])

  const slotLabels = useMemo(() => SLOT_KEYS.map((key) => t(`slots.${key}`)), [t])

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
      Alert.alert(t('feedback.title'), t('feedback.hint'), [
        { text: t('feedback.good'), onPress: () => feedback.record({ recipeId: it.recipe_id, day, score: 1 }) },
        { text: t('feedback.bad'), onPress: () => feedback.record({ recipeId: it.recipe_id, day, score: -1 }) },
        { text: t('feedback.skip'), style: 'cancel' }
      ])
    }
  }

  async function onClearSlot(day: string, slot: number) {
    const slotName = slotLabels[slot]
    Alert.alert(t('plan.clearSlot', { slot: slotName }), t('plan.clearSlotConfirm', { day: formatDay(day, true, dayNames), slot: slotName }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('plan.clear'), style: 'destructive', onPress: () => week.setDay(day, null, slot) }
    ])
  }

  // Week label
  const weekLabel = useMemo(() => {
    if (!week.days.length) return ''
    return `${formatDay(week.days[0], false, dayNames)} – ${formatDay(week.days[week.days.length - 1], false, dayNames)}`
  }, [week.days, dayNames])

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
          <Text style={[styles.slotLabel, { color: theme.muted }]}>{slotLabels[slot]}</Text>
        )}
        {hasRecipe ? (
          <View style={styles.slotContent}>
            {/* Tap recipe to view details */}
            <Pressable 
              style={styles.recipeRow}
              onPress={() => it?.recipe_id && onViewRecipe(it.recipe_id)}
              accessibilityLabel={t('plan.showRecipe', { title })}
            >
              <RecipeImage uri={photoUrl} style={styles.recipeImage} />
              <View style={styles.recipeInfo}>
                <Text style={[styles.recipeTitle, { color: theme.text }]} numberOfLines={1}>
                  {title}
                </Text>
                {recipe?.tags?.length ? (
                  <Text style={[styles.recipeTags, { color: theme.muted }]} numberOfLines={1}>
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
                { backgroundColor: isCooked ? theme.success : theme.card, borderColor: isCooked ? theme.success : theme.border }
              ]}
              accessibilityLabel={isCooked ? t('plan.markNotCooked') : t('plan.markCooked')}
            >
              <Text style={[styles.cookedIcon, { color: isCooked ? '#fff' : theme.muted }]}>
                {isCooked ? '✓' : '○'}
              </Text>
            </Pressable>
            <Pressable onPress={() => onPickRecipe(day, slot)} hitSlop={8} accessibilityLabel={t('plan.swapRecipe')}>
              <FontAwesome name="exchange" size={12} color={theme.muted} />
            </Pressable>
            <Pressable onPress={() => onClearSlot(day, slot)} hitSlop={10} accessibilityLabel={t('plan.clear')}>
              <FontAwesome name="times" size={14} color={theme.muted} />
            </Pressable>
          </View>
        ) : (
          <Pressable 
            style={styles.emptySlot} 
            onPress={() => onPickRecipe(day, slot)}
            accessibilityLabel={t('plan.chooseSlot', { slot: slotLabels[slot] })}
          >
            <FontAwesome name="plus" size={14} color={theme.tint} />
            <Text style={[styles.emptyText, { color: theme.tint }]}>
              {showSlotLabel ? t('plan.chooseRecipe') : t('plan.chooseSlot', { slot: slotLabels[slot] })}
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
            backgroundColor: isTodayCard ? theme.tint + '15' : theme.card,
            borderColor: isTodayCard ? theme.tint : theme.border,
            opacity: isPastDay ? 0.7 : 1
          }
        ]}
      >
        {/* Day header */}
        <View style={styles.dayHeader}>
          <View style={styles.dayLabelRow}>
            {isTodayCard && (
              <View style={[styles.todayBadge, { backgroundColor: theme.tint }]}>
                <Text style={styles.todayText}>{t('plan.today')}</Text>
              </View>
            )}
            <Text style={[styles.dayName, { color: isTodayCard ? theme.tint : theme.muted }]}>
              {formatDay(day, true, dayNames)}
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
        <TopBar title={t('plan.title')} />
        <LoadingState />
      </Screen>
    )
  }

  if (week.error) {
    return (
      <Screen>
        <TopBar title={t('plan.title')} />
        <ErrorState message={week.error} onRetry={week.refresh} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar title={t('plan.title')} />

      {/* Week navigation - compact */}
      <View style={styles.weekNav}>
        <Pressable onPress={() => setWeekOffset((x) => x - 1)} hitSlop={12}>
          <Text style={[styles.navArrow, { color: theme.tint }]}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setWeekOffset(0)}>
          <Text style={[styles.weekLabel, { color: theme.text }]}>{weekLabel}</Text>
        </Pressable>
        <Pressable onPress={() => setWeekOffset((x) => x + 1)} hitSlop={12}>
          <Text style={[styles.navArrow, { color: theme.tint }]}>›</Text>
        </Pressable>
      </View>

      {/* Empty week hint */}
      {isWeekEmpty && weekOffset === 0 && (
        <View style={[styles.emptyHint, { backgroundColor: theme.tint + '15', borderColor: theme.tint }]}>
          <Text style={[styles.emptyHintTitle, { color: theme.tint }]}>🗓 {t('plan.emptyWeek')}</Text>
          <Text style={[styles.emptyHintBody, { color: theme.muted }]}>
            {t('plan.emptyWeekHint')}
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
