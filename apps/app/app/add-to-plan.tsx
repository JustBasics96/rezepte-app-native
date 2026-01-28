import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'

import { useMealPlanWeek } from '../src/features/mealPlan'
import { useRecipes } from '../src/features/recipes'
import { useCookFeedback } from '../src/features/cookFeedback'
import { publicPhotoUrl } from '../src/features/photos'
import { Screen } from '../src/ui/components/Screen'
import { TopBar } from '../src/ui/components/TopBar'
import { Input } from '../src/ui/components/Input'
import { Chip } from '../src/ui/components/Chip'
import { LoadingState, ErrorState, EmptyState } from '../src/ui/components/States'
import { RecipeImage } from '../src/ui/components/RecipeImage'
import { useTheme } from '../src/ui/theme'

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

function formatDayHeader(isoDay: string) {
  const d = new Date(isoDay + 'T00:00:00')
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`
}

export default function AddToPlan() {
  const t = useTheme()
  const { day } = useLocalSearchParams<{ day?: string }>()
  const plan = useMealPlanWeek(new Date())
  const recipes = useRecipes()
  const feedback = useCookFeedback()

  const [q, setQ] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [tag, setTag] = useState<string | null>(null)

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
    await plan.setDay(day, recipeId)
    router.back()
  }

  async function clearDay() {
    if (!day) return
    await plan.setDay(day, null)
    router.back()
  }

  if (recipes.loading || plan.loading) {
    return (
      <Screen>
        <TopBar title="Gericht wählen" left={<Chip label="← Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />} />
        <LoadingState />
      </Screen>
    )
  }

  if (recipes.error) {
    return (
      <Screen>
        <TopBar title="Gericht wählen" left={<Chip label="← Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />} />
        <ErrorState message={recipes.error} onRetry={recipes.refresh} />
      </Screen>
    )
  }

  // Day header text
  const dayLabel = day ? formatDayHeader(day) : 'Gericht wählen'

  if (!filtered.length) {
    return (
      <Screen scroll>
        <TopBar title={dayLabel} left={<Chip label="← Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />} />
        <Input label="Suche" value={q} onChangeText={setQ} placeholder="z.B. Nudeln" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll} contentContainerStyle={styles.tagScrollContent}>
          <Chip label="★ Favoriten" selected={favOnly} onPress={() => setFavOnly((x) => !x)} />
          {tags.map((x) => (
            <Chip key={x} label={x} selected={tag === x} onPress={() => setTag(tag === x ? null : x)} />
          ))}
        </ScrollView>
        <EmptyState title="Keine Treffer" body="Versuch es mit weniger Filtern." />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar
        title={dayLabel}
        left={<Chip label="← Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />}
        right={<Chip label="Leeren" onPress={clearDay} accessibilityLabel="Tag leeren" />}
      />

      <Input label="Suche" value={q} onChangeText={setQ} placeholder="z.B. Nudeln" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll} contentContainerStyle={styles.tagScrollContent}>
        <Chip label="★ Favoriten" selected={favOnly} onPress={() => setFavOnly((x) => !x)} />
        {tags.map((x) => (
          <Chip key={x} label={x} selected={tag === x} onPress={() => setTag(tag === x ? null : x)} />
        ))}
      </ScrollView>

      {filtered.map((r) => {
        const score = scoreMap.get(r.id) ?? 0
        const photoUrl = publicPhotoUrl(r.photo_path ?? null)
        return (
          <Pressable
            key={r.id}
            onPress={() => choose(r.id)}
            accessibilityRole="button"
            accessibilityLabel={`Gericht wählen: ${r.title}`}
          >
            {({ pressed }) => (
              <View style={[styles.recipeRow, { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.9 : 1 }]}>
                <RecipeImage uri={photoUrl} style={styles.thumb} />
                <View style={styles.recipeInfo}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
                      {r.title}
                    </Text>
                    {r.is_favorite && <FontAwesome name="star" size={14} color={t.tint} />}
                    {score > 0 && <Text style={[styles.badge, { backgroundColor: t.success + '20', color: t.success }]}>👍</Text>}
                    {score < 0 && <Text style={[styles.badge, { backgroundColor: t.danger + '20', color: t.danger }]}>👎</Text>}
                  </View>
                  {r.tags?.length ? (
                    <Text style={[styles.tags, { color: t.muted }]} numberOfLines={1}>
                      {r.tags.slice(0, 3).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <FontAwesome name="chevron-right" size={14} color={t.muted} />
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
