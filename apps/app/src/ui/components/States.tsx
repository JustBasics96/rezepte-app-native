import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme'

export function LoadingState({ label = 'Lade…' }: { label?: string }) {
  const t = useTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator />
      <Text style={[styles.text, { color: t.muted }]}>{label}</Text>
    </View>
  )
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  const t = useTheme()
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      {body ? <Text style={[styles.text, { color: t.muted }]}>{body}</Text> : null}
    </View>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useTheme()
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: t.text }]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" style={({ pressed }) => [styles.retry, { opacity: pressed ? 0.8 : 1 }]}> 
          <Text style={[styles.retryText, { color: t.tint }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  text: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  retry: { paddingHorizontal: 14, paddingVertical: 10 },
  retryText: { fontSize: 16, fontWeight: '800' }
})
