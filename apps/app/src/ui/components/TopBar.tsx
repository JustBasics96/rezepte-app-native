import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme'

export function TopBar({ title, left, right }: { title: string; left?: React.ReactNode; right?: React.ReactNode }) {
  const t = useTheme()
  return (
    <View style={[styles.root, { borderBottomColor: t.border }]} accessibilityRole="header">
      <View style={styles.left}>{left}</View>
      <View style={styles.center}>
        <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">{title}</Text>
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { flex: 1, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 }
})
