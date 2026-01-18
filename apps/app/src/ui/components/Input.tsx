import React from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../theme'

type Props = {
  label?: string
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  multiline?: boolean
  keyboardType?: 'default' | 'numeric'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  secureTextEntry?: boolean
  accessibilityLabel?: string
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  accessibilityLabel
}: Props) {
  const t = useTheme()
  return (
    <View style={styles.root}>
      {label ? <Text style={[styles.label, { color: t.muted }]}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          {
            backgroundColor: t.card,
            borderColor: t.border,
            color: t.text,
            minHeight: multiline ? 120 : 48
          }
        ]}
        accessibilityLabel={accessibilityLabel ?? label}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16
  }
})
