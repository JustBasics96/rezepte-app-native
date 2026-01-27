import { describe, it, expect } from 'vitest'
import { addDays, startOfWeek, toIsoDay, weekRange } from './date'

describe('toIsoDay', () => {
	it('formats dates as YYYY-MM-DD with zero padding', () => {
		expect(toIsoDay(new Date(2026, 0, 5))).toBe('2026-01-05')
		expect(toIsoDay(new Date(2026, 9, 31))).toBe('2026-10-31')
	})
})

describe('startOfWeek', () => {
	it('returns Monday as start of week when weekStartsOnMonday is true', () => {
		const wednesday = new Date(2026, 0, 7) // Wed
		const start = startOfWeek(wednesday, true)
		expect(start.getDay()).toBe(1)
		expect(toIsoDay(start)).toBe('2026-01-05')
	})

	it('handles Sunday correctly when week starts on Monday', () => {
		const sunday = new Date(2026, 0, 11) // Sun
		const start = startOfWeek(sunday, true)
		expect(start.getDay()).toBe(1)
		expect(toIsoDay(start)).toBe('2026-01-05')
	})

	it('can use Sunday as start of week when flag is false', () => {
		const wednesday = new Date(2026, 0, 7) // Wed
		const start = startOfWeek(wednesday, false)
		expect(start.getDay()).toBe(0)
		expect(toIsoDay(start)).toBe('2026-01-04')
	})
})

describe('addDays', () => {
	it('adds positive and negative day offsets', () => {
		const base = new Date(2026, 0, 10)
		expect(toIsoDay(addDays(base, 1))).toBe('2026-01-11')
		expect(toIsoDay(addDays(base, -5))).toBe('2026-01-05')
	})
})

describe('weekRange', () => {
	it('returns the full ISO date range for a week', () => {
		const { from, to, days } = weekRange(new Date(2026, 0, 7)) // Wed

		expect(from).toBe('2026-01-05')
		expect(to).toBe('2026-01-11')
		expect(days).toHaveLength(7)
		expect(days[0]).toBe(from)
		expect(days[6]).toBe(to)
	})
})
