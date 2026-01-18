import React, { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

import { useMealPlanWeek } from '../src/features/mealPlan'
import { useRecipes } from '../src/features/recipes'
import { Screen } from '../src/ui/components/Screen'
import { TopBar } from '../src/ui/components/TopBar'
import { Input } from '../src/ui/components/Input'
import { Chip } from '../src/ui/components/Chip'
import { Card } from '../src/ui/components/Card'
import { LoadingState, ErrorState, EmptyState } from '../src/ui/components/States'
import { useTheme } from '../src/ui/theme'

export default function AddToPlan() {
  const t = useTheme()
  const { day } = useLocalSearchParams<{ day?: string }>()
  const plan = useMealPlanWeek(new Date())
  const recipes = useRecipes()

  const [q, setQ] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [tag, setTag] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return recipes.recipes
      .filter((r) => (favOnly ? r.is_favorite : true))
      .filter((r) => (tag ? r.tags?.includes(tag) : true))
      .filter((r) => (query ? r.title.toLowerCase().includes(query) : true))
  }, [recipes.recipes, q, favOnly, tag])

  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const r of recipes.recipes) for (const x of r.tags ?? []) set.add(x)
    // Quick tags first if present
    const sorted = [...set].sort((a, b) => a.localeCompare(b))
    const quick = ['Kinder', 'Meal-prep']
    const merged: string[] = []
    for (const q of quick) if (sorted.includes(q)) merged.push(q)
    for (const s of sorted) if (!merged.includes(s)) merged.push(s)
    return merged
  }, [recipes.recipes])

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
        <TopBar title="Rezept wählen" left={<Chip label="Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />} />
        <LoadingState />
      </Screen>
    )
  }

  if (recipes.error) {
    return (
      <Screen>
        <TopBar title="Rezept wählen" left={<Chip label="Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />} />
        <ErrorState message={recipes.error} onRetry={recipes.refresh} />
      </Screen>
    )
  }

  if (!filtered.length) {
    return (
      <Screen scroll>
        <TopBar title="Rezept wählen" left={<Chip label="Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />} />
        <Input label="Suche" value={q} onChangeText={setQ} placeholder="z.B. Nudeln" />
        <View style={styles.chips}>
          <Chip label="★ Favoriten" selected={favOnly} onPress={() => setFavOnly((x) => !x)} />
          <Chip label="Kinder" selected={tag === 'Kinder'} onPress={() => setTag(tag === 'Kinder' ? null : 'Kinder')} />
          <Chip label="Meal-prep" selected={tag === 'Meal-prep'} onPress={() => setTag(tag === 'Meal-prep' ? null : 'Meal-prep')} />
        </View>
        <EmptyState title="Keine Treffer" body="Versuch es mit weniger Filtern." />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar
        title="Rezept wählen"
        left={<Chip label="Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />}
        right={<Chip label="Leeren" onPress={clearDay} accessibilityLabel="Tag leeren" />}
      />

      <Input label="Suche" value={q} onChangeText={setQ} placeholder="z.B. Nudeln" />

      <View style={styles.chips}>
        <Chip label="★ Favoriten" selected={favOnly} onPress={() => setFavOnly((x) => !x)} />
        {tags.slice(0, 8).map((x) => (
          <Chip key={x} label={x} selected={tag === x} onPress={() => setTag(tag === x ? null : x)} />
        ))}
      </View>

      {filtered.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => choose(r.id)}
          accessibilityRole="button"
          accessibilityLabel={`Rezept wählen: ${r.title}`}
        >
          {({ pressed }) => (
            <Card style={{ opacity: pressed ? 0.92 : 1 }}>
              <View style={styles.row}>
                <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
                  {r.title}
                </Text>
                {r.is_favorite ? <Text style={[styles.star, { color: t.tint }]}>★</Text> : null}
              </View>
              {r.tags?.length ? (
                <Text style={[styles.tags, { color: t.muted }]} numberOfLines={1}>
                  {r.tags.join(' · ')}
                </Text>
              ) : null}
            </Card>
          )}
        </Pressable>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 18, fontWeight: '900', flex: 1 },
  star: { fontSize: 18, fontWeight: '900' },
  tags: { fontSize: 12, fontWeight: '700' }
})
