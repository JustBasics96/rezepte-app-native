import React, { useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useTranslation } from 'react-i18next'

import { useMealPlanWeek } from '../src/features/mealPlan'
import { useRecipes } from '../src/features/recipes'
import { useCookFeedback } from '../src/providers/CookFeedbackProvider'
import { publicPhotoUrl } from '../src/features/photos'
import { Screen } from '../src/ui/components/Screen'
import { TopBar } from '../src/ui/components/TopBar'
import { Input } from '../src/ui/components/Input'
import { Chip } from '../src/ui/components/Chip'
import { Card } from '../src/ui/components/Card'
import { LoadingState, ErrorState, EmptyState } from '../src/ui/components/States'
import { RecipeImage } from '../src/ui/components/RecipeImage'
import { useTheme } from '../src/ui/theme'

export default function AddToPlan() {
  const theme = useTheme()
  const { t, i18n } = useTranslation()
  const { day, slot: slotParam } = useLocalSearchParams<{ day?: string; slot?: string }>()
  const mealSlot = slotParam ? parseInt(slotParam, 10) : 0
  const plan = useMealPlanWeek(new Date())
  const recipes = useRecipes()
  const feedback = useCookFeedback()

  const [q, setQ] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [tag, setTag] = useState<string | null>(null)

  // Quick-add new recipe
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const newInputRef = useRef<TextInput>(null)

  // Localized labels
  const dayNames = t('days.long', { returnObjects: true }) as string[]
  const slotLabels = [t('slots.breakfast'), t('slots.lunch'), t('slots.dinner'), t('slots.snack')]

  function formatDayHeader(isoDay: string, slot?: number) {
    const d = new Date(isoDay + 'T00:00:00')
    const dayStr = `${dayNames[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`
    if (slot !== undefined && slot >= 0) {
      return `${dayStr} – ${slotLabels[slot]}`
    }
    return dayStr
  }

  // Smart sorting: favorites first, then by feedback score, then by lastCooked (recent = relevant)
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    const base = recipes.recipes
      .filter((r) => (favOnly ? r.is_favorite : true))
      .filter((r) => (tag ? r.tags?.includes(tag) : true))
      .filter((r) => (query ? r.title.toLowerCase().includes(query) : true))

    // Build score map from feedback
    const scores = new Map<string, number>()
    for (const fb of feedback.items) {
      scores.set(fb.recipeId, (scores.get(fb.recipeId) ?? 0) + fb.score)
    }

    return base.sort((a, b) => {
      // Favorites first
      if (a.is_favorite && !b.is_favorite) return -1
      if (!a.is_favorite && b.is_favorite) return 1
      // Then by score (high → low)
      const sa = scores.get(a.id) ?? 0
      const sb = scores.get(b.id) ?? 0
      if (sa !== sb) return sb - sa
      // Then by last_cooked_at (recent first)
      const la = a.last_cooked_at ?? ''
      const lb = b.last_cooked_at ?? ''
      return lb.localeCompare(la)
    })
  }, [recipes.recipes, feedback.items, q, favOnly, tag])

  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const r of recipes.recipes) for (const x of r.tags ?? []) set.add(x)
    const sorted = [...set].sort((a, b) => a.localeCompare(b))
    // Quick tags first
    const quick = ['Kinder', 'Schnell', 'Meal-prep']
    const merged: string[] = []
    for (const q of quick) if (sorted.includes(q)) merged.push(q)
    for (const s of sorted) if (!merged.includes(s)) merged.push(s)
    return merged
  }, [recipes.recipes])

  // Feedback score lookup
  const scoreMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const fb of feedback.items) {
      map.set(fb.recipeId, (map.get(fb.recipeId) ?? 0) + fb.score)
    }
    return map
  }, [feedback.items])

  async function choose(recipeId: string) {
    if (!day) return
    await plan.setDay(day, recipeId, mealSlot)
    router.back()
  }

  // Create new recipe and add to plan immediately
  async function createAndAdd() {
    const title = newTitle.trim()
    if (!title || !day) return
    try {
      setCreating(true)
      const saved = await recipes.saveRecipe({ title, ingredients: '', steps: '' })
      await plan.setDay(day, saved.id, mealSlot)
      setNewTitle('')
      router.back()
    } catch (e: any) {
      console.error('[Kochplan] createAndAdd failed', e)
      Alert.alert(t('common.error'), e?.message ?? t('common.error'))
    } finally {
      setCreating(false)
    }
  }

  // Surprise me: pick a random recipe, weighted towards favorites and less-recently-cooked
  async function surpriseMe() {
    if (!day || !filtered.length) return

    // Pool candidates: Favorites get 3x weight, long-not-cooked get 2x weight
    const candidates: string[] = []
    const now = new Date()
    for (const r of filtered) {
      let weight = 1
      if (r.is_favorite) weight += 2
      // If not cooked in 30+ days, extra weight
      if (r.last_cooked_at) {
        const days = (now.getTime() - new Date(r.last_cooked_at).getTime()) / (1000 * 60 * 60 * 24)
        if (days > 30) weight += 1
      } else {
        weight += 1 // Never cooked = extra interest
      }
      for (let i = 0; i < weight; i++) candidates.push(r.id)
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    await plan.setDay(day, pick, mealSlot)
    router.back()
  }

  async function clearSlot() {
    if (!day) return
    await plan.setDay(day, null, mealSlot)
    router.back()
  }

  if (recipes.loading || plan.loading) {
    return (
      <Screen>
        <TopBar title={t('addToPlan.title')} left={<Chip label={`← ${t('common.back')}`} onPress={() => router.back()} accessibilityLabel={t('common.back')} />} />
        <LoadingState />
      </Screen>
    )
  }

  if (recipes.error) {
    return (
      <Screen>
        <TopBar title={t('addToPlan.title')} left={<Chip label={`← ${t('common.back')}`} onPress={() => router.back()} accessibilityLabel={t('common.back')} />} />
        <ErrorState message={recipes.error} onRetry={recipes.refresh} />
      </Screen>
    )
  }

  // Day header text
  const dayLabel = day ? formatDayHeader(day, mealSlot) : t('addToPlan.title')

  if (!filtered.length) {
    return (
      <Screen scroll>
        <TopBar title={dayLabel} left={<Chip label={`← ${t('common.back')}`} onPress={() => router.back()} accessibilityLabel={t('common.back')} />} />
        <Input label={t('common.search')} value={q} onChangeText={setQ} placeholder={t('recipes.searchPlaceholder')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll} contentContainerStyle={styles.tagScrollContent}>
          <Chip label={`★ ${t('recipes.favorites')}`} selected={favOnly} onPress={() => setFavOnly((x) => !x)} />
          <Chip label={t('addToPlan.surprise')} onPress={surpriseMe} accessibilityLabel={t('addToPlan.surprise')} />
          {tags.map((x) => (
            <Chip key={x} label={x} selected={tag === x} onPress={() => setTag(tag === x ? null : x)} />
          ))}
        </ScrollView>
        <EmptyState title={t('recipes.noResults')} body={t('addToPlan.noRecipesHint')} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar
        title={dayLabel}
        left={<Chip label={`← ${t('common.back')}`} onPress={() => router.back()} accessibilityLabel={t('common.back')} />}
        right={<Chip label={t('plan.clear')} onPress={clearSlot} accessibilityLabel={t('plan.clearSlot', { slot: slotLabels[mealSlot] })} />}
      />

      <Input label={t('common.search')} value={q} onChangeText={setQ} placeholder={t('recipes.searchPlaceholder')} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll} contentContainerStyle={styles.tagScrollContent}>
        <Chip label={`★ ${t('recipes.favorites')}`} selected={favOnly} onPress={() => setFavOnly((x) => !x)} />
        <Chip label={t('addToPlan.surprise')} onPress={surpriseMe} accessibilityLabel={t('addToPlan.surprise')} />
        {tags.map((x) => (
          <Chip key={x} label={x} selected={tag === x} onPress={() => setTag(tag === x ? null : x)} />
        ))}
      </ScrollView>

      {/* Quick-add new recipe */}
      <Card>
        <View style={styles.quickAddRow}>
          <TextInput
            ref={newInputRef}
            value={newTitle}
            onChangeText={setNewTitle}
            onSubmitEditing={createAndAdd}
            placeholder={t('addToPlan.newRecipePlaceholder')}
            placeholderTextColor={theme.muted}
            returnKeyType="done"
            blurOnSubmit={false}
            editable={!creating}
            style={[styles.quickAddInput, { color: theme.text }]}
            accessibilityLabel={t('recipes.newRecipe')}
          />
          {newTitle.trim().length > 0 && (
            <Pressable
              onPress={createAndAdd}
              disabled={creating}
              accessibilityRole="button"
              accessibilityLabel={t('addToPlan.createAndAdd')}
            >
              {({ pressed }) => (
                <Text style={[styles.quickAddBtn, { color: theme.tint, opacity: pressed || creating ? 0.6 : 1 }]}>
                  {creating ? '…' : t('addToPlan.createAndAdd')}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </Card>

      {filtered.map((r) => {
        const score = scoreMap.get(r.id) ?? 0
        const photoUrl = publicPhotoUrl(r.photo_path ?? null)
        return (
          <Pressable
            key={r.id}
            onPress={() => choose(r.id)}
            accessibilityRole="button"
            accessibilityLabel={r.title}
          >
            {({ pressed }) => (
              <View style={[styles.recipeRow, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1 }]}>
                <RecipeImage uri={photoUrl} style={styles.thumb} />
                <View style={styles.recipeInfo}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                      {r.title}
                    </Text>
                    {r.is_favorite && <FontAwesome name="star" size={14} color={theme.tint} />}
                    {score > 0 && <Text style={[styles.badge, { backgroundColor: theme.success + '20', color: theme.success }]}>👍</Text>}
                    {score < 0 && <Text style={[styles.badge, { backgroundColor: theme.danger + '20', color: theme.danger }]}>👎</Text>}
                  </View>
                  {r.tags?.length ? (
                    <Text style={[styles.tags, { color: theme.muted }]} numberOfLines={1}>
                      {r.tags.slice(0, 3).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <FontAwesome name="chevron-right" size={14} color={theme.muted} />
              </View>
            )}
          </Pressable>
        )
      })}
    </Screen>
  )
}

const styles = StyleSheet.create({
  tagScroll: { marginVertical: 4 },
  tagScrollContent: { gap: 8, paddingRight: 16 },
  quickAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickAddInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 4 },
  quickAddBtn: { fontSize: 14, fontWeight: '800' },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10
  },
  thumb: { width: 56, height: 42, borderRadius: 8 },
  recipeInfo: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  badge: { fontSize: 10, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  tags: { fontSize: 12, fontWeight: '600' }
})
