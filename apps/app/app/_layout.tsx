import React from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { AppProviders } from '../src/providers/AppProviders'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: 'index'
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="add-to-plan" />
          <Stack.Screen name="recipe-editor" />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  )
}
