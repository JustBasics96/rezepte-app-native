import React from 'react'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Tabs } from 'expo-router'

import { useTheme } from '../../src/ui/theme'

function TabBarIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />
}

export default function TabLayout() {
  const t = useTheme()
  return (
    <Tabs
      initialRouteName="plan"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.tint,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.border, height: 64, paddingBottom: 10, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' }
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} /> }}
      />
      <Tabs.Screen
        name="recipes/index"
        options={{ title: 'Rezepte', tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} /> }}
      />
      <Tabs.Screen
        name="family"
        options={{ title: 'Familie', tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} /> }}
      />
    </Tabs>
  )
}
