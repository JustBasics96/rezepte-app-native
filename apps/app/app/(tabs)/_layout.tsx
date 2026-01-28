import React from 'react'
import { Platform } from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { useTheme } from '../../src/ui/theme'

function TabBarIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />
}

export default function TabLayout() {
  const t = useTheme()
  const { t: tr } = useTranslation()
  const insets = useSafeAreaInsets()

  // Tab bar height: base + safe area bottom (for Home Indicator)
  const tabBarHeight = 56 + Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 8)

  return (
    <Tabs
      initialRouteName="plan"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.tint,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          height: tabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' }
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{ title: tr('tabs.plan'), tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} /> }}
      />
      <Tabs.Screen
        name="shopping"
        options={{ title: tr('tabs.shopping'), tabBarIcon: ({ color }) => <TabBarIcon name="shopping-cart" color={color} /> }}
      />
      <Tabs.Screen
        name="recipes/index"
        options={{ title: tr('tabs.recipes'), tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} /> }}
      />
      <Tabs.Screen
        name="family"
        options={{ title: tr('tabs.family'), tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} /> }}
      />
    </Tabs>
  )
}
