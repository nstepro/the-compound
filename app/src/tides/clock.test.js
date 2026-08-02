import { describe, it, expect } from 'vitest'
import { nowLocalStamp, todayLocalDate, monthKey, daysInMonth, addMonths, monthsBetween } from './clock.js'

describe('nowLocalStamp', () => {
  it('formats a UTC instant into America/New_York wall-clock', () => {
    expect(nowLocalStamp(new Date('2026-08-02T15:14:00Z'))).toBe('2026-08-02 11:14')
  })

  it('shifts correctly across the fall-back DST boundary', () => {
    // Verified live against real clock behavior — see plans/tide-chart-elaborated.md §1.4
    expect(nowLocalStamp(new Date('2026-10-31T19:28:00Z'))).toBe('2026-10-31 15:28') // EDT
    expect(nowLocalStamp(new Date('2026-11-01T20:35:00Z'))).toBe('2026-11-01 15:35') // EST
  })
})

describe('todayLocalDate', () => {
  it('resolves a moon-phase UTC timestamp to the correct local calendar day', () => {
    // Full Moon 2026-08-28 04:18 UTC -> 00:18 EDT, same local day
    expect(todayLocalDate(new Date(Date.UTC(2026, 7, 28, 4, 18)))).toBe('2026-08-28')
    // 01:30 UTC in August -> 21:30 EDT the previous local day
    expect(todayLocalDate(new Date(Date.UTC(2026, 7, 28, 1, 30)))).toBe('2026-08-27')
  })
})

describe('monthKey', () => {
  it('derives the month key from a date string', () => {
    expect(monthKey('2026-08-02')).toBe('2026-08')
  })
})

describe('daysInMonth', () => {
  it('computes days in month, including leap-year February', () => {
    expect(daysInMonth('2026-08')).toBe(31)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2027-02')).toBe(28)
  })
})

describe('addMonths', () => {
  it('adds months and rolls the year over', () => {
    expect(addMonths('2026-08-01', 24)).toBe('2028-08-01')
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
  })

  it('clamps the day to the target month length', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  })
})

describe('monthsBetween', () => {
  it('counts whole calendar months between two dates', () => {
    expect(monthsBetween('2026-08-02', '2028-07-31')).toBe(23)
    expect(monthsBetween('2026-08-02', '2027-07-02')).toBe(11)
    expect(monthsBetween('2026-08-02', '2026-08-02')).toBe(0)
  })
})
