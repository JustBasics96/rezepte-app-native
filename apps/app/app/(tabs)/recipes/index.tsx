import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'

import { weeksAgoLabel } from '@our-recipebook/core'

import { useRecipes } from '../../../src/features/recipes'
import { useCookFeedback } from '../../../src/features/cookFeedback'
import { publicPhotoUrl } from '../../../src/features/photos'
import { Screen } from '../../../src/ui/components/Screen'
import { TopBar } from '../../../src/ui/components/TopBar'
import { Chip } from '../../../src/ui/components/Chip'
import { Card } from '../../../src/ui/components/Card'
import { LoadingState, ErrorState, EmptyState } from '../../../src/ui/components/States'
import { RecipeImage } from '../../../src/ui/components/RecipeImage'
import { useTheme } from '../../../src/ui/theme'

type SortMode = 'recent' | 'alpha' | 'rating'

export default function RecipesTab() {
  const theme = useTheme()
  const { t } = useTranslation()
  const recipes = useRecipes()
  const feedback = useCookFeedback()
  const { refresh: refreshRecipes } = recipes
  const { refresh: refreshFeedback } = feedback

  const [q, setQ] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [tag, setTag] = useState<string | null>(null)
  const [sort, setSort] = useState<SortMode>('recent')
  const [quickTitle, setQuickTitle] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)
  const quickInputRef = useRef<TextInput>(null)

  // Refresh data when returning from editor
  useFocusEffect(
    useCallback(() => {
      refreshRecipes()
      refreshFeedback()
    }, [refreshRecipes, refreshFeedback])
  )

  // Aggregate feedback scores per recipe
  const feedbackByRecipe = useMemo(() => {
    const map = new Map<string, { good: number; bad: number }>()
    for (const f of feedback.items) {
      const cur = map.get(f.recipeId) ?? { good: 0, bad: 0 }
      if (f.score === 1) cur.good++
      if (f.score === -1) cur.bad++
      map.set(f.recipeId, cur)
    }
    return map
  }, [feedback.items])

  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const r of recipes.recipes) for (const x of r.tags ?? []) set.add(x)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [recipes.recipes])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    const list = recipes.recipes
      .filter((r) => (favOnly ? r.is_favorite : true))
      .filter((r) => (tag ? r.tags?.includes(tag) : true))
      .filter((r) => (query ? r.title.toLowerCase().includes(query) : true))

    // Sort based on selected mode
    return [...list].sort((a, b) => {
      if (sort === 'alpha') {
        return a.title.localeCompare(b.title)
      }
      if (sort === 'rating') {
        const scoreA = (feedbackByRecipe.get(a.id)?.good ?? 0) - (feedbackByRecipe.get(a.id)?.bad ?? 0)
        const scoreB = (feedbackByRecipe.get(b.id)?.good ?? 0) - (feedbackByRecipe.get(b.id)?.bad ?? 0)
        if (scoreB !== scoreA) return scoreB - scoreA
        return a.title.localeCompare(b.title)
      }
      // 'recent' – by last_cooked_at or updated_at
      const dateA = a.last_cooked_at ?? a.updated_at ?? a.created_at
      const dateB = b.last_cooked_at ?? b.updated_at ?? b.created_at
      return dateB.localeCompare(dateA)
    })
  }, [recipes.recipes, q, favOnly, tag, sort, feedbackByRecipe])

  function openNew() {
    router.push('/recipe-editor')
  }

  function openEdit(id: string) {
    router.push({ pathname: '/recipe-editor', params: { id } })
  }

  // Quick-add: create recipe with just a title
  async function handleQuickAdd() {
    const title = quickTitle.trim()
    if (!title) return
    try {
      setQuickSaving(true)
      const saved = await recipes.saveRecipe({ title, ingredients: '', steps: '' })
      setQuickTitle('')
      // Open editor for the new recipe so user can add details
      router.push({ pathname: '/recipe-editor', params: { id: saved.id } })
    } catch (e: any) {
      console.error('[OurRecipeBook] quickAdd failed', e)
      Alert.alert(t('common.error'), e?.message ?? t('common.error'))
    } finally {
      setQuickSaving(false)
    }
  }

  if (recipes.loading) {
    return (
      <Screen>
        <TopBar title={t('recipes.title')} />
        <LoadingState />
      </Screen>
    )
  }

  if (recipes.error) {
    return (
      <Screen>
        <TopBar title={t('recipes.title')} />
        <ErrorState message={recipes.error} onRetry={recipes.refresh} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar title={t('recipes.title')} />

      {/* Search bar – clean, no label */}
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t('recipes.searchPlaceholder')}
        placeholderTextColor={theme.muted}
        style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
        accessibilityLabel={t('common.search')}
      />

      {/* Sort + Filter row */}
      <View style={styles.sortRow}>
        <Chip label={t('recipes.sortRecent')} selected={sort === 'recent'} onPress={() => setSort('recent')} />
        <Chip label={t('recipes.sortAlpha')} selected={sort === 'alpha'} onPress={() => setSort('alpha')} />
        <Chip label={t('recipes.sortRating')} selected={sort === 'rating'} onPress={() => setSort('rating')} />
        <View style={styles.spacer} />
        <Chip label="★" selected={favOnly} onPress={() => setFavOnly((x) => !x)} accessibilityLabel={t('recipes.favorites')} />
      </View>

      {/* Tags – horizontal scroll */}
      {tags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll} contentContainerStyle={styles.tagsContent}>
          {tags.map((x) => (
            <Chip key={x} label={x} selected={tag === x} onPress={() => setTag(tag === x ? null : x)} />
          ))}
        </ScrollView>
      )}

      {/* Quick-add inline – type title and create instantly */}
      <View style={[styles.quickAddRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          ref={quickInputRef}
          value={quickTitle}
          onChangeText={setQuickTitle}
          onSubmitEditing={handleQuickAdd}
          placeholder={t('recipes.quickAddPlaceholder')}
          placeholderTextColor={theme.muted}
          returnKeyType="done"
          blurOnSubmit={false}
          editable={!quickSaving}
          style={[styles.quickInput, { color: theme.text }]}
          accessibilityLabel={t('recipes.newRecipe')}
        />
        {quickTitle.trim().length > 0 && (
          <Pressable
            onPress={handleQuickAdd}
            disabled={quickSaving}
            accessibilityRole="button"
            accessibilityLabel={t('common.add')}
          >
            {({ pressed }) => (
              <Text style={[styles.quickBtn, { color: theme.tint, opacity: pressed || quickSaving ? 0.6 : 1 }]}>
                {quickSaving ? '…' : t('common.add')}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      {!filtered.length ? <EmptyState title={t('recipes.emptyTitle')} body={t('recipes.emptyHint')} /> : null}

      {filtered.map((r) => {
        const photo = publicPhotoUrl(r.photo_path)
        const fb = feedbackByRecipe.get(r.id)
        const score = fb ? fb.good - fb.bad : null
        return (
          <Pressable
            key={r.id}
            onPress={() => openEdit(r.id)}
            accessibilityRole="button"
            accessibilityLabel={r.title}
          >
            {({ pressed }) => (
              <Card style={{ opacity: pressed ? 0.92 : 1 }}>
                <View style={styles.row}>
                  <RecipeImage uri={photo} style={styles.image} />
                  <View style={styles.content}>
                    <View style={styles.rowTop}>
                      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                        {r.title}
                      </Text>
                      <View style={styles.badges}>
                        {score !== null && (
                          <Text style={[styles.scoreBadge, { color: score >= 0 ? theme.success : theme.danger }]}>
                            {score >= 0 ? '👍' : '👎'} {Math.abs(score) > 0 ? Math.abs(score) : ''}
                          </Text>
                        )}
                        {r.is_favorite && <Text style={[styles.star, { color: theme.tint }]}>★</Text>}
                      </View>
                    </View>
                    <View style={styles.meta}>
                      {r.tags?.length ? (
                        <Text style={[styles.metaText, { color: theme.muted }]} numberOfLines={1}>
                          {r.tags.join(' · ')}
                        </Text>
                      ) : null}
                      {r.last_cooked_at ? (
                        <Text style={[styles.metaText, { color: theme.muted }]}>{weeksAgoLabel(r.last_cooked_at)}</Text>
                      ) : null}
                    </View>
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
  search: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    marginBottom: 4
  },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  spacer: { flex: 1 },
  tagsScroll: { marginBottom: 4 },
  tagsContent: { gap: 8, paddingRight: 16 },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4
  },
  quickInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 10 },
  quickBtn: { fontSize: 15, fontWeight: '700', paddingVertical: 8, paddingHorizontal: 4 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  content: { flex: 1, gap: 4 },
  image: { width: 78, height: 58, borderRadius: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 17, fontWeight: '800', flex: 1 },
  star: { fontSize: 16, fontWeight: '900' },
  scoreBadge: { fontSize: 13, fontWeight: '700' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaText: { fontSize: 12, fontWeight: '600' }
})
