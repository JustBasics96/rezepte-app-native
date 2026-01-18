import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useMealPlanWeek } from '../../src/features/mealPlan'
import { useRecipes } from '../../src/features/recipes'
import { useShoppingList } from '../../src/features/shoppingList'
import { Screen } from '../../src/ui/components/Screen'
import { TopBar } from '../../src/ui/components/TopBar'
import { Chip } from '../../src/ui/components/Chip'
import { Card } from '../../src/ui/components/Card'
import { LoadingState, ErrorState, EmptyState } from '../../src/ui/components/States'
import { useTheme } from '../../src/ui/theme'

export default function ShoppingListTab() {
  const t = useTheme()
  const list = useShoppingList()
  const plan = useMealPlanWeek(new Date())
  const recipes = useRecipes()

  const canBuild = !plan.loading && !recipes.loading

  async function rebuild() {
    await list.rebuildFromPlan(plan.items, recipes.recipesById)
  }

  if (list.loading) {
    return (
      <Screen>
        <TopBar title="Einkauf" />
        <LoadingState />
      </Screen>
    )
  }

  if (list.error) {
    return (
      <Screen>
        <TopBar title="Einkauf" />
        <ErrorState message={list.error} onRetry={list.refresh} />
      </Screen>
    )
  }

  return (
    <Screen scroll>
      <TopBar
        title="Einkauf"
        right={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Chip label="Neu aus Plan" onPress={canBuild ? rebuild : undefined} />
            <Chip label="Abgehakt löschen" onPress={list.clearChecked} />
          </View>
        }
      />

      {!list.items.length ? (
        <EmptyState title="Liste ist leer" body="Tippe auf „Neu aus Plan“, um Zutaten zu übernehmen." />
      ) : null}

      {list.items.map((it) => (
        <Pressable
          key={it.id}
          onPress={() => list.toggle(it.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: it.checked }}
          accessibilityLabel={`Einkaufspunkt: ${it.text}`}
        >
          {({ pressed }) => (
            <Card style={{ opacity: pressed ? 0.92 : 1 }}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: t.border,
                      backgroundColor: it.checked ? t.success : 'transparent'
                    }
                  ]}
                />
                <Text
                  style={[
                    styles.text,
                    { color: t.text, textDecorationLine: it.checked ? 'line-through' : 'none', opacity: it.checked ? 0.6 : 1 }
                  ]}
                >
                  {it.text}
                </Text>
              </View>
            </Card>
          )}
        </Pressable>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, fontSize: 16, fontWeight: '800' }
})
