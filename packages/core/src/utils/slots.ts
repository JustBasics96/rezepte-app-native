/**
 * Slot indices for meal times:
 * 0 = Frühstück (Breakfast)
 * 1 = Mittagessen (Lunch)
 * 2 = Abendessen (Dinner)
 * 3 = Snack
 */

export const DEFAULT_SLOTS = [2] // Just dinner by default

export const SLOT_LABELS: Record<number, string> = {
  0: 'Frühstück',
  1: 'Mittagessen',
  2: 'Abendessen',
  3: 'Snack'
}

/**
 * Parse enabled_slots from DB (JSON string or array) into number[].
 * Handles edge cases gracefully, returning DEFAULT_SLOTS on failure.
 */
export function parseEnabledSlots(raw: string | number[] | null | undefined): number[] {
  if (!raw) return DEFAULT_SLOTS
  if (Array.isArray(raw)) {
    // Filter out invalid values
    const valid = raw.filter((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 3)
    return valid.length > 0 ? valid : DEFAULT_SLOTS
  }
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 3)
      return valid.length > 0 ? valid : DEFAULT_SLOTS
    }
    return DEFAULT_SLOTS
  } catch {
    return DEFAULT_SLOTS
  }
}

/**
 * Serialize enabled slots to JSON string for DB storage.
 */
export function serializeEnabledSlots(slots: number[]): string {
  return JSON.stringify(slots)
}
