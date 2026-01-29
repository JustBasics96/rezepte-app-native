import * as Burnt from 'burnt'

/**
 * Show a brief, non-intrusive toast notification
 */
export function toast(message: string, preset: 'done' | 'error' = 'done') {
  Burnt.toast({
    title: message,
    preset,
    haptic: preset === 'done' ? 'success' : 'error',
    duration: 2,
  })
}

/**
 * Show a success toast with checkmark
 */
export function toastSuccess(message: string) {
  toast(message, 'done')
}

/**
 * Show an error toast
 */
export function toastError(message: string) {
  toast(message, 'error')
}
