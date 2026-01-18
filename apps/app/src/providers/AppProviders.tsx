import React from 'react'
import { SessionProvider } from './SessionProvider'
import { HouseholdProvider } from './HouseholdProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <HouseholdProvider>{children}</HouseholdProvider>
    </SessionProvider>
  )
}
