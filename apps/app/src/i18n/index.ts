import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'

import de from './de.json'
import en from './en.json'

export const SUPPORTED_LANGUAGES = ['de', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  de: 'Deutsch',
  en: 'English'
}

// Detect device language, default to German
function getDeviceLanguage(): SupportedLanguage {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'de'
  return SUPPORTED_LANGUAGES.includes(locale as SupportedLanguage)
    ? (locale as SupportedLanguage)
    : 'de'
}

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en }
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'de',
  interpolation: {
    escapeValue: false // React already escapes
  },
  // Disable suspense for now
  react: {
    useSuspense: false
  }
})

export default i18n

/**
 * Change the app language. Call this from settings.
 */
export function setLanguage(lang: SupportedLanguage): void {
  i18n.changeLanguage(lang)
}

/**
 * Get the current language.
 */
export function getCurrentLanguage(): SupportedLanguage {
  return i18n.language as SupportedLanguage
}
