import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../theme'

export function LoadingState({ label }: { label?: string }) {
  const theme = useTheme()
  const { t } = useTranslation()
  const text = label ?? t('common.loading')
  return (
    <View style={styles.center}>
      <ActivityIndicator />
      <Text style={[styles.text, { color: theme.muted }]}>{text}</Text>
    </View>
  )
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  const theme = useTheme()
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {body ? <Text style={[styles.text, { color: theme.muted }]}>{body}</Text> : null}
    </View>
  )
}

function isOfflineError(msg: string) {
  const lower = msg.toLowerCase()
  return (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('connection') ||
    lower.includes('offline') ||
    lower.includes('timeout') ||
    lower.includes('econnrefused')
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const theme = useTheme()
  const { t } = useTranslation()
  const isOffline = isOfflineError(message)
  
  const displayTitle = isOffline ? `📡 ${t('states.offline').split('.')[0]}` : `⚠️ ${t('common.error')}`
  const displayBody = isOffline 
    ? t('states.offline')
    : message

  return (
    <View style={styles.center}>
      <Text style={styles.errorEmoji}>{isOffline ? '📡' : '⚠️'}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{displayTitle}</Text>
      <Text style={[styles.text, { color: theme.muted }]}>{displayBody}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" style={({ pressed }) => [styles.retry, { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 }]}> 
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  text: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  errorEmoji: { fontSize: 48, marginBottom: 8 },
  retry: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  retryText: { fontSize: 15, fontWeight: '800', color: '#fff' }
})
