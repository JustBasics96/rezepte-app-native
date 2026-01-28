import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useTranslation } from 'react-i18next'

import { Screen } from '../src/ui/components/Screen'
import { TopBar } from '../src/ui/components/TopBar'
import { Input } from '../src/ui/components/Input'
import { Button } from '../src/ui/components/Button'
import { Chip } from '../src/ui/components/Chip'
import { Card } from '../src/ui/components/Card'
import { LoadingState, ErrorState } from '../src/ui/components/States'
import { RecipeImage } from '../src/ui/components/RecipeImage'
import { useTheme } from '../src/ui/theme'
import { useHousehold } from '../src/providers/HouseholdProvider'
import { useRecipes } from '../src/features/recipes'
import { publicPhotoUrl, uploadRecipePhoto } from '../src/features/photos'
import type { Recipe } from '@our-recipebook/core'

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
}

export default function RecipeEditorScreen() {
  const theme = useTheme()
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { household } = useHousehold()
  const recipes = useRecipes()
  const { loadRecipe } = recipes

  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [portions, setPortions] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [steps, setSteps] = useState('')
  const [notes, setNotes] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [tagsRaw, setTagsRaw] = useState('')

  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoMime, setPhotoMime] = useState<string | undefined>(undefined)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!id) return

    ;(async () => {
      try {
        setLoading(true)
        const r = await loadRecipe(id)
        setTitle(r.title ?? '')
        setPortions(r.portions != null ? String(r.portions) : '')
        setIngredients(r.ingredients ?? '')
        setSteps(r.steps ?? '')
        setNotes(r.notes ?? '')
        setFavorite(Boolean(r.is_favorite))
        setTagsRaw((r.tags ?? []).join(', '))
        setExistingPhotoPath(r.photo_path)
      } catch (e: any) {
        console.error('[OurRecipeBook] loadRecipe failed', e)
        if (mounted) setError(e?.message ?? 'Failed to load recipe')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [id, loadRecipe])

  const previewPhoto = useMemo(() => {
    if (photoUri) return photoUri
    const url = publicPhotoUrl(existingPhotoPath)
    return url
  }, [photoUri, existingPhotoPath])

  async function pickPhoto() {
    // Web: Skip ActionSheet, go directly to gallery (camera not well supported)
    if (Platform.OS === 'web') {
      await launchGallery()
      return
    }

    // Native: Show ActionSheet with Camera + Gallery options
    Alert.alert(t('editor.addPhoto'), t('editor.photoSource'), [
      { text: t('editor.camera'), onPress: () => launchCamera() },
      { text: t('editor.gallery'), onPress: () => launchGallery() },
      { text: t('common.cancel'), style: 'cancel' }
    ])
  }

  async function launchCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(t('editor.noPermission'), t('editor.cameraPermission'))
      return
    }

    const mediaTypes =
      (ImagePicker as any).MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes,
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3]
    })

    if (result.canceled) return
    const asset = result.assets[0]
    setPhotoUri(asset.uri)
    setPhotoMime(asset.mimeType)
  }

  async function launchGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(t('editor.noPermission'), t('editor.galleryPermission'))
      return
    }

    const mediaTypes =
      // Prefer new MediaType enum when available, fall back to deprecated MediaTypeOptions
      // for compatibility with older versions.
      (ImagePicker as any).MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3]
    })

    if (result.canceled) return
    const asset = result.assets[0]
    setPhotoUri(asset.uri)
    setPhotoMime(asset.mimeType)
  }

  async function save() {
    try {
      setError(null)
      if (!title.trim()) throw new Error(t('editor.titleRequired'))
      if (!household?.id) throw new Error('No household')

      const payload: Partial<Recipe> & { title: string; ingredients: string; steps: string } = {
        id: id,
        title: title.trim(),
        portions: portions.trim() ? Number(portions.trim()) : null,
        ingredients: ingredients,
        steps: steps,
        notes: notes,
        is_favorite: favorite,
        tags: parseTags(tagsRaw)
      }

      const saved = await recipes.saveRecipe(payload)

      if (photoUri) {
        const path = await uploadRecipePhoto({
          householdId: household.id,
          recipeId: saved.id,
          uri: photoUri,
          mimeType: photoMime
        })

        await recipes.saveRecipe({
          id: saved.id,
          title: saved.title,
          ingredients: saved.ingredients,
          steps: saved.steps,
          photo_path: path
        })
        setExistingPhotoPath(path)
        setPhotoUri(null)
      }

      Alert.alert(t('common.save'), t('editor.saved'))
      router.back()
    } catch (e: any) {
      console.error('[OurRecipeBook] saveRecipe failed', e)
      setError(e?.message ?? 'Save failed')
    }
  }

  async function remove() {
    if (!id) return
    Alert.alert(t('common.delete'), t('editor.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await recipes.removeRecipe(id)
            router.back()
          } catch (e: any) {
            console.error('[OurRecipeBook] deleteRecipe failed', e)
            Alert.alert(t('common.error'), e?.message ?? 'Delete failed')
          }
        }
      }
    ])
  }

  if (loading) {
    return (
      <Screen>
        <TopBar
          title={isEdit ? t('editor.editTitle') : t('editor.newTitle')}
          left={<Chip label={t('common.back')} onPress={() => router.back()} accessibilityLabel={t('common.back')} />}
        />
        <LoadingState />
      </Screen>
    )
  }

  if (error && isEdit) {
    return (
      <Screen>
        <TopBar
          title={isEdit ? t('editor.editTitle') : t('editor.newTitle')}
          left={<Chip label={t('common.back')} onPress={() => router.back()} accessibilityLabel={t('common.back')} />}
        />
        <ErrorState message={error} onRetry={() => router.back()} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar
        title={isEdit ? t('editor.editTitle') : t('editor.newTitle')}
        left={<Chip label="←" onPress={() => router.back()} accessibilityLabel={t('common.back')} />}
        right={<Chip label={`✓ ${t('common.save')}`} onPress={save} accessibilityLabel={t('common.save')} />}
      />

      {error ? (
        <Card>
          <Text style={{ color: theme.danger, fontWeight: '800' }}>{error}</Text>
        </Card>
      ) : null}

      {/* Primary: Title – most important, always visible */}
      <Input label={`${t('editor.titleLabel')} *`} value={title} onChangeText={setTitle} placeholder={t('editor.titlePlaceholder')} autoCapitalize="sentences" />

      {/* Quick meta row: Photo + Favorite */}
      <Card>
        <View style={styles.photoRow}>
          <RecipeImage uri={previewPhoto} style={styles.photo} />
          <View style={styles.photoMeta}>
            <Button title={t('editor.photo')} variant="secondary" onPress={pickPhoto} />
            <Chip label={favorite ? `★ ${t('editor.favorite')}` : `☆ ${t('editor.favorite')}`} selected={favorite} onPress={() => setFavorite((x) => !x)} />
          </View>
        </View>
      </Card>

      {/* Core content – what you need to cook */}
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('editor.whatYouNeed')}</Text>
      <Input label={t('editor.ingredientsLabel')} value={ingredients} onChangeText={setIngredients} placeholder={t('editor.ingredientsPlaceholder')} multiline />

      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('editor.howItGoes')}</Text>
      <Input label={t('editor.stepsLabel')} value={steps} onChangeText={setSteps} placeholder={t('editor.stepsPlaceholder')} multiline />

      {/* Optional extras – collapsed feel */}
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('editor.optional')}</Text>
      <View style={styles.optionalRow}>
        <View style={styles.halfInput}>
          <Input label={t('editor.portionsLabel')} value={portions} onChangeText={setPortions} placeholder={t('editor.portionsPlaceholder')} keyboardType="numeric" />
        </View>
        <View style={styles.halfInput}>
          <Input label={t('editor.tagsLabel')} value={tagsRaw} onChangeText={setTagsRaw} placeholder={t('editor.tagsPlaceholder')} />
        </View>
      </View>
      <Input label={t('editor.notesLabel')} value={notes} onChangeText={setNotes} placeholder={t('editor.notesPlaceholder')} multiline />

      {/* Danger zone */}
      {id ? (
        <View style={styles.dangerZone}>
          <Button title={t('editor.delete')} variant="danger" onPress={remove} />
        </View>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  photo: { width: 100, height: 75, borderRadius: 12 },
  photoMeta: { flex: 1, gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: -4, marginLeft: 4 },
  optionalRow: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  dangerZone: { marginTop: 24, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#3333' }
})
