import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../theme'

type Props = {
  label: string
  selected?: boolean
  onPress?: () => void
  accessibilityLabel?: string
}

export function Chip({ label, selected, onPress, accessibilityLabel }: Props) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.root,
        {
          backgroundColor: selected ? t.tint : t.card,
          borderColor: t.border,
          opacity: pressed ? 0.85 : 1
        }
      ]}
    >
      <Text style={[styles.text, { color: selected ? '#FFFFFF' : t.text }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: { fontSize: 14, fontWeight: '600' }
})
