import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

export function Screen({ children, scroll = false }: { children: React.ReactNode; scroll?: boolean }) {
  const t = useTheme()
  const insets = useSafeAreaInsets()

  if (scroll) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(16, insets.bottom + 8) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.content, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, padding: 16, gap: 12 },
  scrollContent: { padding: 16, gap: 12 }
})
