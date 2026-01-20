import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'

import { weeksAgoLabel } from '@our-recipebook/core'

import { useRecipes } from '../../../src/features/recipes'
import { publicPhotoUrl } from '../../../src/features/photos'
import { Screen } from '../../../src/ui/components/Screen'
import { TopBar } from '../../../src/ui/components/TopBar'
import { Input } from '../../../src/ui/components/Input'
import { Chip } from '../../../src/ui/components/Chip'
import { Card } from '../../../src/ui/components/Card'
import { LoadingState, ErrorState, EmptyState } from '../../../src/ui/components/States'
import { RecipeImage } from '../../../src/ui/components/RecipeImage'
import { useTheme } from '../../../src/ui/theme'

export default function RecipesTab() {
  const t = useTheme()
  const recipes = useRecipes()
  const { refresh: refreshRecipes } = recipes
  const [q, setQ] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [tag, setTag] = useState<string | null>(null)

  // Ensure list reflects latest changes when returning from editor
  useFocusEffect(
    useCallback(() => {
      refreshRecipes()
    }, [refreshRecipes])
  )

  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const r of recipes.recipes) for (const x of r.tags ?? []) set.add(x)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [recipes.recipes])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return recipes.recipes
      .filter((r) => (favOnly ? r.is_favorite : true))
      .filter((r) => (tag ? r.tags?.includes(tag) : true))
      .filter((r) => (query ? r.title.toLowerCase().includes(query) : true))
  }, [recipes.recipes, q, favOnly, tag])

  function openNew() {
    router.push('/recipe-editor')
  }

  function openEdit(id: string) {
    router.push({ pathname: '/recipe-editor', params: { id } })
  }

  if (recipes.loading) {
    return (
      <Screen>
        <TopBar title="Rezepte" />
        <LoadingState />
      </Screen>
    )
  }

  if (recipes.error) {
    return (
      <Screen>
        <TopBar title="Rezepte" />
        <ErrorState message={recipes.error} onRetry={recipes.refresh} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar title="Rezepte" right={<Chip label="+ Neu" onPress={openNew} accessibilityLabel="Neues Rezept" />} />

      <Input label="Suche" value={q} onChangeText={setQ} placeholder="z.B. Lasagne" />

      <View style={styles.filters}>
        <Chip label="★ Favoriten" selected={favOnly} onPress={() => setFavOnly((x) => !x)} />
        {tags.slice(0, 10).map((x) => (
          <Chip key={x} label={x} selected={tag === x} onPress={() => setTag(tag === x ? null : x)} />
        ))}
      </View>

      {!filtered.length ? <EmptyState title="Keine Rezepte" body="Lege dein erstes Rezept an." /> : null}

      {filtered.map((r) => {
        const photo = publicPhotoUrl(r.photo_path)
        return (
          <Pressable
            key={r.id}
            onPress={() => openEdit(r.id)}
            accessibilityRole="button"
            accessibilityLabel={`Rezept öffnen: ${r.title}`}
          >
            {({ pressed }) => (
              <Card style={{ opacity: pressed ? 0.92 : 1 }}>
                <View style={styles.row}>
                  <RecipeImage uri={photo} style={styles.image} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.rowTop}>
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
                    {r.last_cooked_at ? (
                      <Text style={[styles.last, { color: t.muted }]}>Zuletzt: {weeksAgoLabel(r.last_cooked_at)}</Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            )}
          </Pressable>
        )
      })}
    </Screen>
  )
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  image: { width: 78, height: 58, borderRadius: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 18, fontWeight: '900', flex: 1 },
  star: { fontSize: 18, fontWeight: '900' },
  tags: { fontSize: 12, fontWeight: '700' },
  last: { fontSize: 12, fontWeight: '700' }
})
