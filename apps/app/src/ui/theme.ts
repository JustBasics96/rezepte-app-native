import { useColorScheme } from 'react-native'

export type Theme = {
  bg: string
  card: string
  text: string
  muted: string
  border: string
  tint: string
  danger: string
  success: string
}

export function useTheme(): Theme {
  const scheme = useColorScheme()
  const dark = scheme === 'dark'
  return {
    bg: dark ? '#0B0D10' : '#F6F7F9',
    card: dark ? '#12161C' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#111827',
    muted: dark ? '#9CA3AF' : '#6B7280',
    border: dark ? '#263041' : '#E5E7EB',
    tint: dark ? '#7DD3FC' : '#0284C7',
    danger: '#EF4444',
    success: '#22C55E'
  }
}
