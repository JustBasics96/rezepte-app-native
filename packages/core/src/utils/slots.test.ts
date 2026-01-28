import { describe, it, expect } from 'vitest'
import { parseEnabledSlots, serializeEnabledSlots, DEFAULT_SLOTS, SLOT_LABELS } from './slots'

describe('parseEnabledSlots', () => {
  it('returns DEFAULT_SLOTS for null/undefined', () => {
    expect(parseEnabledSlots(null)).toEqual(DEFAULT_SLOTS)
    expect(parseEnabledSlots(undefined)).toEqual(DEFAULT_SLOTS)
  })

  it('returns DEFAULT_SLOTS for empty string', () => {
    expect(parseEnabledSlots('')).toEqual(DEFAULT_SLOTS)
  })

  it('passes through valid number arrays', () => {
    expect(parseEnabledSlots([0, 1, 2])).toEqual([0, 1, 2])
    expect(parseEnabledSlots([2])).toEqual([2])
    expect(parseEnabledSlots([0, 1, 2, 3])).toEqual([0, 1, 2, 3])
  })

  it('filters out invalid slot indices from arrays', () => {
    expect(parseEnabledSlots([0, 5, 2])).toEqual([0, 2])
    expect(parseEnabledSlots([-1, 2, 10])).toEqual([2])
    expect(parseEnabledSlots([0, 1.5, 2])).toEqual([0, 2])
  })

  it('returns DEFAULT_SLOTS for arrays with only invalid values', () => {
    expect(parseEnabledSlots([5, 6, 7])).toEqual(DEFAULT_SLOTS)
    expect(parseEnabledSlots([-1, -2])).toEqual(DEFAULT_SLOTS)
  })

  it('parses JSON string with valid array', () => {
    expect(parseEnabledSlots('[0,1,2]')).toEqual([0, 1, 2])
    expect(parseEnabledSlots('[2]')).toEqual([2])
    expect(parseEnabledSlots('[ 0 , 1 ]')).toEqual([0, 1])
  })

  it('filters invalid values from JSON string arrays', () => {
    expect(parseEnabledSlots('[0, 5, 2]')).toEqual([0, 2])
    expect(parseEnabledSlots('[-1, 2]')).toEqual([2])
  })

  it('returns DEFAULT_SLOTS for invalid JSON', () => {
    expect(parseEnabledSlots('not json')).toEqual(DEFAULT_SLOTS)
    expect(parseEnabledSlots('{}')).toEqual(DEFAULT_SLOTS)
    expect(parseEnabledSlots('42')).toEqual(DEFAULT_SLOTS)
    expect(parseEnabledSlots('"string"')).toEqual(DEFAULT_SLOTS)
  })

  it('returns DEFAULT_SLOTS for empty JSON array', () => {
    expect(parseEnabledSlots('[]')).toEqual(DEFAULT_SLOTS)
  })
})

describe('serializeEnabledSlots', () => {
  it('serializes arrays to JSON string', () => {
    expect(serializeEnabledSlots([0, 1, 2])).toBe('[0,1,2]')
    expect(serializeEnabledSlots([2])).toBe('[2]')
    expect(serializeEnabledSlots([])).toBe('[]')
  })
})

describe('SLOT_LABELS', () => {
  it('has labels for all four slots', () => {
    expect(SLOT_LABELS[0]).toBe('Frühstück')
    expect(SLOT_LABELS[1]).toBe('Mittagessen')
    expect(SLOT_LABELS[2]).toBe('Abendessen')
    expect(SLOT_LABELS[3]).toBe('Snack')
  })
})
