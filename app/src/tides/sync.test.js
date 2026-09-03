import { describe, it, expect } from 'vitest'
import { getCoverage } from './sync.js'
import { addMonths } from './clock.js'

/** One event per calendar month from `startDate` through `endDate` — a gap-free window. */
function monthlyPredictions(startDate, endDate) {
  const events = []
  let cursor = startDate
  const lastMonth = endDate.slice(0, 7)
  while (cursor.slice(0, 7) <= lastMonth) {
    events.push({ t: `${cursor.slice(0, 7)}-15 07:27` })
    cursor = addMonths(cursor, 1)
  }
  return events
}

describe('getCoverage', () => {
  it('is fresh with a full ~24-month window and no gaps', () => {
    const cache = { predictions: monthlyPredictions('2026-08-02', '2028-07-31') }
    const coverage = getCoverage(cache, '2026-08-02')
    expect(coverage.ok).toBe(true)
    expect(coverage.reason).toBe('fresh')
    expect(coverage.monthsRemaining).toBe(23)
  })

  it('is stale with 11 months remaining (below the 12-month default threshold)', () => {
    const cache = { predictions: monthlyPredictions('2026-08-02', '2027-07-02') }
    const coverage = getCoverage(cache, '2026-08-02')
    expect(coverage.ok).toBe(false)
    expect(coverage.reason).toBe('stale')
    expect(coverage.monthsRemaining).toBe(11)
  })

  it('treats a missing or empty cache as empty (stale)', () => {
    expect(getCoverage(null).reason).toBe('empty')
    expect(getCoverage(null).ok).toBe(false)
    expect(getCoverage({ predictions: [] }).reason).toBe('empty')
  })

  it('flags a cache with a reassuring last date but empty months in between as a gap', () => {
    // Mirrors the production incident: the committed sample fixture has real
    // events in 2026-08 and 2027-11 only, so a last-date-only check would
    // wrongly call 15 months of empty months in between "fresh".
    const cache = {
      predictions: [{ t: '2026-08-01 01:08' }, { t: '2027-11-30 18:24' }],
    }
    const coverage = getCoverage(cache, '2026-08-02')
    expect(coverage.ok).toBe(false)
    expect(coverage.reason).toBe('gap')
  })
})
