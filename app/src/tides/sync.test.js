import { describe, it, expect } from 'vitest'
import { getCoverage } from './sync.js'

describe('getCoverage', () => {
  it('is fresh with a full ~24-month window', () => {
    const cache = { predictions: [{ t: '2028-07-31 07:27' }] }
    const coverage = getCoverage(cache, '2026-08-02')
    expect(coverage.ok).toBe(true)
    expect(coverage.reason).toBe('fresh')
    expect(coverage.monthsRemaining).toBe(23)
  })

  it('is stale with 11 months remaining (below the 12-month default threshold)', () => {
    const cache = { predictions: [{ t: '2027-07-02 07:27' }] }
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
})
