import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'

import FontAwesome from '@expo/vector-icons/FontAwesome'

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

type DayStatus = 'empty' | 'planned' | 'cooked'

function dayLabel(isoDay: string) {
  const d = new Date(isoDay + 'T00:00:00')
  const name = DAY_NAMES[(d.getDay() + 6) % 7]
  return `${name} ${d.getDate()}.${d.getMonth() + 1}.`
}

function getDayStatus(it: { recipe_id?: string | null; status?: 'planned' | 'prepped' | 'cooked' } | undefined): DayStatus {
  if (!it?.recipe_id) return 'empty'
  if (it.status === 'cooked') return 'cooked'
  return 'planned'
}

export default function PlanScreen() {
  const t = useTheme()
  const { width } = useWindowDimensions()
  const chipsInline = width >= 500
  // Week navigation: offset from current week
  const [weekOffset, setWeekOffset] = useState(0)
  const anchorDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])
  const week = useMealPlanWeek(anchorDate)
  const { refresh: refreshWeek } = week
  // Refresh week data whenever this screen gains focus (e.g., after choosing a recipe)
  useFocusEffect(
    useCallback(() => {
      refreshWeek()
    }, [refreshWeek])
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

  const weekChips = (
    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
      <Chip label="‹ Woche" onPress={() => setWeekOffset((x) => x - 1)} accessibilityLabel="Vorherige Woche" />
      <Chip label="Heute" onPress={() => setWeekOffset(0)} accessibilityLabel="Zur aktuellen Woche" />
      <Chip label="Woche ›" onPress={() => setWeekOffset((x) => x + 1)} accessibilityLabel="Nächste Woche" />
    </View>
  )

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

  function confirmClearDay(day: string) {
    const label = dayLabel(day)
    Alert.alert(
      'Plan leeren',
      `${label}: Plan für diesen Tag wirklich leeren?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Leeren',
          style: 'destructive',
          onPress: () => {
            void week.setDay(day, null)
          }
        }
      ]
    )
  }

  // Prepare content for a single render path to keep hook order stable
  const content = (() => {
    if (week.loading || recipes.loading) {
      return (
        <>
          <TopBar title={headerTitle} right={chipsInline ? weekChips : undefined} />
          {!chipsInline && weekChips}
          <LoadingState />
        </>
      )
    }

    if (week.error) {
      return (
        <>
          <TopBar title={headerTitle} right={chipsInline ? weekChips : undefined} />
          {!chipsInline && weekChips}
          <ErrorState message={week.error} onRetry={week.refresh} />
        </>
      )
    }

    if (!week.days.length) {
      return (
        <>
          <TopBar title={headerTitle} right={chipsInline ? weekChips : undefined} />
          {!chipsInline && weekChips}
          <EmptyState title="Noch keine Woche" body="Bitte neu laden." />
        </>
      )
    }

    return (
      <>
        <TopBar title={headerTitle} right={chipsInline ? weekChips : undefined} />
        {!chipsInline && weekChips}

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
    const hasRecipe = !!it?.recipe_id
    const status: DayStatus = getDayStatus(it)

    const recipe = hasRecipe && it?.recipe_id ? recipes.recipesById.get(it.recipe_id) ?? null : null
    const title = recipe?.title ?? it?.recipe?.title ?? null
    const photo = recipe?.photo_path ?? it?.recipe?.photo_path ?? null
    const photoUrl = publicPhotoUrl(photo ?? null)
    const portions = recipe?.portions ?? null
    const tags = (recipe?.tags ?? []).slice(0, 2)
    const showMeta = (portions != null && portions !== 0) || tags.length > 0

    const renderRightActions = () => (
      <View style={styles.swipeDeleteContainer}>
        <Pressable
          style={styles.swipeDeleteButton}
          onPress={() => confirmClearDay(day)}
          accessibilityRole="button"
          accessibilityLabel={`${dayLabel(day)}: Plan für diesen Tag leeren`}
        >
          <FontAwesome name="trash" size={20} color="#FFFFFF" />
          <Text style={styles.swipeDeleteText}>Leeren</Text>
        </Pressable>
      </View>
    )

    const cardContent = (
      <Pressable
        key={day}
        onPress={() => onPickRecipe(day)}
        accessibilityRole="button"
        accessibilityLabel={`${dayLabel(day)}: Gericht auswählen`}
      >
        {({ pressed }) => (
          <Card style={{ opacity: pressed ? 0.92 : 1, paddingVertical: hasRecipe ? 14 : 10 }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.day, { color: t.muted }]}>{dayLabel(day)}</Text>
                {hasRecipe ? (
                  <View>
                    <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
                      {title ?? 'Gericht auswählen'}
                    </Text>
                    {showMeta && (
                      <View style={styles.metaRow}>
                        {portions ? (
                          <View style={[styles.metaPill, { borderColor: t.border }]}>
                            <Text style={[styles.metaText, { color: t.muted }]}>{`x${portions}`}</Text>
                          </View>
                        ) : null}
                        {tags.map((tag) => (
                          <View key={tag} style={[styles.metaPill, { borderColor: t.border }]}>
                            <Text style={[styles.metaText, { color: t.muted }]} numberOfLines={1}>
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyCtaRow}>
                    <FontAwesome name="plus-circle" size={18} color={t.tint} />
                    <Text style={[styles.emptyCtaText, { color: t.tint }]}>Gericht auswählen</Text>
                  </View>
                )}
              </View>

              {status !== 'empty' ? (
                <View style={styles.statusWrap}>
                  <Text
                    style={[
                      styles.status,
                      {
                        color: status === 'cooked' ? t.success : t.tint,
                        borderColor: status === 'cooked' ? t.success : t.tint
                      }
                    ]}
                  >
                    {status === 'cooked' ? 'Gekocht ✅' : 'Geplant'}
                  </Text>
                </View>
              ) : null}
            </View>

            {hasRecipe ? (
              <View style={styles.bottomRow}>
                <RecipeImage uri={photoUrl} style={styles.image} />

                <View style={styles.actions}>
                  <Chip
                    label="Gekocht"
                    selected={status === 'cooked'}
                    onPress={() => onToggleCooked(day)}
                    accessibilityLabel={
                      status === 'cooked' ? 'Als nicht gekocht markieren' : 'Als gekocht markieren'
                    }
                  />
                </View>
              </View>
            ) : null}
          </Card>
        )}
      </Pressable>
    )

    if (!hasRecipe) {
      return <View key={day}>{cardContent}</View>
    }

    return (
      <Swipeable
        key={day}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
      >
        {cardContent}
      </Swipeable>
    )
  }

  return <Screen scroll>{content}</Screen>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  day: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800' },
   metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
   metaPill: {
     paddingHorizontal: 8,
     paddingVertical: 2,
     borderRadius: 999,
     borderWidth: StyleSheet.hairlineWidth
   },
   metaText: { fontSize: 11, fontWeight: '600' },
   emptyCtaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
   emptyCtaText: { marginLeft: 8, fontSize: 16, fontWeight: '700' },
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
  swipeDeleteContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  swipeDeleteButton: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    height: '100%',
    paddingHorizontal: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4
  },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  workedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  workedTitle: { fontSize: 16, fontWeight: '800' },
  muted: { fontSize: 12, fontWeight: '700' }
})
