import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import FontAwesome from '@expo/vector-icons/FontAwesome'

import { useMealPlanWeek } from '../../src/features/mealPlan'
import { useRecipes } from '../../src/features/recipes'
import { useShoppingList } from '../../src/features/shoppingList'
import { Screen } from '../../src/ui/components/Screen'
import { TopBar } from '../../src/ui/components/TopBar'
import { Card } from '../../src/ui/components/Card'
import { Chip } from '../../src/ui/components/Chip'
import { LoadingState, ErrorState } from '../../src/ui/components/States'
import { useTheme } from '../../src/ui/theme'

export default function ShoppingTab() {
  const t = useTheme()
  const week = useMealPlanWeek(new Date())
  const recipes = useRecipes()
  const shopping = useShoppingList()

  const [rebuilding, setRebuilding] = useState(false)
  const [newItem, setNewItem] = useState('')
  const inputRef = useRef<TextInput>(null)

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      shopping.refresh()
    }, [shopping.refresh])
  )

  // Rebuild list from current week's plan
  async function rebuildList() {
    try {
      setRebuilding(true)
      await week.refresh()
      await shopping.rebuildFromPlan(week.items, recipes.recipesById)
      Alert.alert('Aktualisiert', 'Einkaufsliste wurde aus dem Wochenplan erstellt.')
    } catch (e: any) {
      console.error('[OurRecipeBook] rebuildShoppingList failed', e)
      Alert.alert('Fehler', e?.message ?? 'Rebuild failed')
    } finally {
      setRebuilding(false)
    }
  }

  // Share as text
  async function shareList() {
    const unchecked = shopping.items.filter((i) => !i.checked)
    if (!unchecked.length) {
      Alert.alert('Liste leer', 'Alle Zutaten sind bereits abgehakt.')
      return
    }

    const text = unchecked.map((i) => `☐ ${i.text}`).join('\n')
    const header = '🛒 Einkaufsliste\n\n'

    try {
      await Share.share({ message: header + text })
    } catch (e) {
      console.warn('[OurRecipeBook] share failed', e)
    }
  }

  // Clear checked items
  function clearChecked() {
    const checkedCount = shopping.items.filter((i) => i.checked).length
    if (!checkedCount) return

    Alert.alert('Abgehakte löschen?', `${checkedCount} Einträge werden entfernt.`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => shopping.clearChecked() }
    ])
  }

  // Add manual item
  async function handleAddItem() {
    if (!newItem.trim()) return
    await shopping.addItem(newItem)
    setNewItem('')
    inputRef.current?.focus()
  }

  // Remove single item
  function handleRemove(id: string, text: string) {
    Alert.alert('Löschen?', `"${text}" entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => shopping.removeItem(id) }
    ])
  }

  // Stats
  const stats = useMemo(() => {
    const total = shopping.items.length
    const checked = shopping.items.filter((i) => i.checked).length
    return { total, checked, remaining: total - checked }
  }, [shopping.items])

  // Sorted: unchecked first, then checked
  const sorted = useMemo(() => {
    return [...shopping.items].sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1
      return a.norm.localeCompare(b.norm)
    })
  }, [shopping.items])

  if (shopping.loading || recipes.loading) {
    return (
      <Screen>
        <TopBar title="Einkauf" />
        <LoadingState />
      </Screen>
    )
  }

  if (shopping.error) {
    return (
      <Screen>
        <TopBar title="Einkauf" />
        <ErrorState message={shopping.error} onRetry={shopping.refresh} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar title="Einkauf" />

      {/* Manual add input */}
      <View style={[styles.addRow, { backgroundColor: t.card, borderColor: t.border }]}>
        <TextInput
          ref={inputRef}
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={handleAddItem}
          placeholder="＋ Eintrag hinzufügen …"
          placeholderTextColor={t.muted}
          returnKeyType="done"
          blurOnSubmit={false}
          style={[styles.addInput, { color: t.text }]}
          accessibilityLabel="Neuen Eintrag hinzufügen"
        />
        {newItem.trim().length > 0 && (
          <Pressable onPress={handleAddItem} accessibilityLabel="Hinzufügen">
            {({ pressed }) => (
              <Text style={[styles.addBtn, { color: t.tint, opacity: pressed ? 0.6 : 1 }]}>Hinzufügen</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Action row */}
      <View style={styles.actions}>
        <Chip
          label={rebuilding ? '⏳ …' : '🔄 Aus Plan'}
          onPress={rebuildList}
          accessibilityLabel="Liste aus Wochenplan erstellen"
        />
        <Chip label="📤 Teilen" onPress={shareList} accessibilityLabel="Liste teilen" />
        {stats.checked > 0 && (
          <Chip label="🗑 Abgehakte" onPress={clearChecked} accessibilityLabel="Abgehakte löschen" />
        )}
      </View>

      {/* Progress */}
      {stats.total > 0 && (
        <View style={styles.progress}>
          <View style={[styles.progressBar, { backgroundColor: t.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: t.success, width: `${(stats.checked / stats.total) * 100}%` }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: t.muted }]}>
            {stats.checked} von {stats.total} erledigt
          </Text>
        </View>
      )}

      {/* Empty state */}
      {!sorted.length && (
        <Card>
          <Text style={[styles.emptyTitle, { color: t.text }]}>Noch keine Einkaufsliste</Text>
          <Text style={[styles.emptyBody, { color: t.muted }]}>
            Tippe auf "Aus Plan" um die Zutaten aus deinem Wochenplan zu sammeln.
          </Text>
        </Card>
      )}

      {/* Items */}
      {sorted.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => shopping.toggle(item.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          accessibilityLabel={item.text}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.item,
                {
                  backgroundColor: t.card,
                  borderColor: t.border,
                  opacity: pressed ? 0.85 : item.checked ? 0.6 : 1
                }
              ]}
            >
              <View style={[styles.checkbox, { borderColor: item.checked ? t.success : t.border, backgroundColor: item.checked ? t.success : 'transparent' }]}>
                {item.checked && <FontAwesome name="check" size={12} color="#fff" />}
              </View>
              <Text
                style={[
                  styles.itemText,
                  { color: t.text, textDecorationLine: item.checked ? 'line-through' : 'none' }
                ]}
                numberOfLines={2}
              >
                {item.text}
              </Text>
              {item.sourceRecipeIds.length > 1 && (
                <Text style={[styles.countBadge, { color: t.muted }]}>
                  ×{item.sourceRecipeIds.length}
                </Text>
              )}
              <Pressable
                onPress={() => handleRemove(item.id, item.text)}
                hitSlop={8}
                accessibilityLabel={`${item.text} löschen`}
              >
                <FontAwesome name="times" size={14} color={t.muted} />
              </Pressable>
            </View>
          )}
        </Pressable>
      ))}

      {/* Footer hint */}
      {sorted.length > 0 && (
        <Text style={[styles.hint, { color: t.muted }]}>
          Tippe zum Abhaken · Lang drücken zum Löschen
        </Text>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8
  },
  addInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 10 },
  addBtn: { fontSize: 15, fontWeight: '700', paddingVertical: 8, paddingHorizontal: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  progress: { marginBottom: 12 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyBody: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  itemText: { flex: 1, fontSize: 15, fontWeight: '600' },
  countBadge: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8, marginBottom: 20 }
})
