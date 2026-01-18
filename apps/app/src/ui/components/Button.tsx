import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../theme'

type Props = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  loading?: boolean
  accessibilityLabel?: string
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, accessibilityLabel }: Props) {
  const t = useTheme()
  const bg =
    variant === 'primary'
      ? t.tint
      : variant === 'danger'
        ? t.danger
        : variant === 'secondary'
          ? t.card
          : 'transparent'

  const borderColor = variant === 'secondary' ? t.border : 'transparent'
  const textColor = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? '#FFFFFF' : t.text

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        styles.root,
        {
          backgroundColor: bg,
          borderColor,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1
        }
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.text, { color: textColor }]}>{title}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth
  },
  text: { fontSize: 16, fontWeight: '700' }
})
