import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from '../theme'

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme()
  return <View style={[styles.root, { backgroundColor: t.card, borderColor: t.border }, style]}>{children}</View>
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10
  }
})
