import React from 'react'
import { I18nextProvider } from 'react-i18next'

import i18n from '../i18n'
import { SessionProvider } from './SessionProvider'
import { HouseholdProvider } from './HouseholdProvider'
import { CookFeedbackProvider } from './CookFeedbackProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <SessionProvider>
        <HouseholdProvider>
          <CookFeedbackProvider>{children}</CookFeedbackProvider>
        </HouseholdProvider>
      </SessionProvider>
    </I18nextProvider>
  )
}
