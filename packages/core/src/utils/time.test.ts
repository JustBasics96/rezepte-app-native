import { describe, it, expect } from 'vitest'
import { weeksAgoLabel } from './time'

describe('weeksAgoLabel', () => {
	it('returns "vor 1 Woche" for same day and up to one week', () => {
		const now = new Date('2026-01-26T12:00:00.000Z')

		expect(weeksAgoLabel('2026-01-26T00:00:00.000Z', now)).toBe('vor 1 Woche')
		expect(weeksAgoLabel('2026-01-20T00:00:00.000Z', now)).toBe('vor 1 Woche')
	})

	it('rounds to the closest whole week for older dates', () => {
		const now = new Date('2026-01-26T12:00:00.000Z')

		// Exactly 2 weeks ago
		expect(weeksAgoLabel('2026-01-12T00:00:00.000Z', now)).toBe('vor 2 Wochen')

		// Roughly 3.5 weeks ago -> rounds to 4 weeks
		expect(weeksAgoLabel('2025-12-30T00:00:00.000Z', now)).toBe('vor 4 Wochen')
	})

	it('clamps negative differences to 0 weeks', () => {
		const now = new Date('2026-01-26T12:00:00.000Z')

		// Future date should not produce a negative week count
		expect(weeksAgoLabel('2026-02-10T00:00:00.000Z', now)).toBe('vor 1 Woche')
	})
})
