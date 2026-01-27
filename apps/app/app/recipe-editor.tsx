import React, { useEffect, useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'

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
  const t = useTheme()
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
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Keine Berechtigung', 'Bitte erlaube Zugriff auf deine Fotos.')
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
      if (!title.trim()) throw new Error('Bitte Titel eingeben')
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

      Alert.alert('Gespeichert', 'Rezept wurde gespeichert.')
      router.back()
    } catch (e: any) {
      console.error('[OurRecipeBook] saveRecipe failed', e)
      setError(e?.message ?? 'Save failed')
    }
  }

  async function remove() {
    if (!id) return
    Alert.alert('Löschen?', 'Rezept wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await recipes.removeRecipe(id)
            router.back()
          } catch (e: any) {
            console.error('[OurRecipeBook] deleteRecipe failed', e)
            Alert.alert('Fehler', e?.message ?? 'Delete failed')
          }
        }
      }
    ])
  }

  if (loading) {
    return (
      <Screen>
        <TopBar
          title={isEdit ? 'Rezept' : 'Neues Rezept'}
          left={<Chip label="Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />}
        />
        <LoadingState />
      </Screen>
    )
  }

  if (error && isEdit) {
    return (
      <Screen>
        <TopBar
          title={isEdit ? 'Rezept' : 'Neues Rezept'}
          left={<Chip label="Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />}
        />
        <ErrorState message={error} onRetry={() => router.back()} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar
        title={isEdit ? 'Rezept bearbeiten' : 'Neues Rezept'}
        left={<Chip label="Zurück" onPress={() => router.back()} accessibilityLabel="Zurück" />}
        right={<Chip label="Speichern" onPress={save} accessibilityLabel="Rezept speichern" />}
      />

      {error ? (
        <Card>
          <Text style={{ color: t.danger, fontWeight: '800' }}>{error}</Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.photoRow}>
          <RecipeImage uri={previewPhoto} style={styles.photo} />
          <View style={{ flex: 1, gap: 10 }}>
            <Button title="Foto wählen" variant="secondary" onPress={pickPhoto} />
            <View style={styles.chipsRow}>
              <Chip label={favorite ? '★ Favorit' : '☆ Favorit'} selected={favorite} onPress={() => setFavorite((x) => !x)} />
            </View>
          </View>
        </View>
      </Card>

      <Input label="Titel" value={title} onChangeText={setTitle} placeholder="z.B. Spaghetti" autoCapitalize="sentences" />
      <Input label="Portionen" value={portions} onChangeText={setPortions} placeholder="z.B. 2" keyboardType="numeric" />
      <Input label="Tags (kommagetrennt)" value={tagsRaw} onChangeText={setTagsRaw} placeholder="Kinder, Meal-prep" />

      <Input label="Zutaten" value={ingredients} onChangeText={setIngredients} placeholder="1 x Tomaten\n200 g Nudeln" multiline />
      <Input label="Schritte" value={steps} onChangeText={setSteps} placeholder="1) ..." multiline />
      <Input label="Notizen" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />

      {id ? (
        <View style={styles.actions}>
          <Button title="Löschen" variant="danger" onPress={remove} />
        </View>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  photo: { width: 120, height: 90, borderRadius: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' }
})
