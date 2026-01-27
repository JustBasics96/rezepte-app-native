import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

export function Screen({ children, scroll = false }: { children: React.ReactNode; scroll?: boolean }) {
  const t = useTheme()
  if (scroll) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, padding: 16, gap: 12 },
  scrollContent: { padding: 16, gap: 12 }
})
