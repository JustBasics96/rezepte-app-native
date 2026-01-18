import React from 'react'
import { Link } from 'expo-router'
import { Text, View } from 'react-native'

export default function NotFound() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: '800' }}>Not found</Text>
      <Link href="/(tabs)/plan">Go to Plan</Link>
    </View>
  )
}
