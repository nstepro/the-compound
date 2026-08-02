import { describe, it, expect } from 'vitest'
import {
  to12h,
  formatFt,
  bucketDaySlots,
  buildDay,
  buildMonth,
  markExtremes,
  nextTides,
  detectAnomalies,
} from './transform.js'

// Real NOAA station 8415809 (Tenants Harbor) predictions, verified live against
// api.tidesandcurrents.noaa.gov on 2026-08-02. See plans/tide-chart-elaborated.md.
const AUG_2026 = [
  { t: '2026-08-01 01:08', v: '10.087', type: 'H' },
  { t: '2026-08-01 07:25', v: '0.033', type: 'L' },
  { t: '2026-08-01 13:40', v: '9.321', type: 'H' },
  { t: '2026-08-01 19:34', v: '0.802', type: 'L' },
  { t: '2026-08-07 05:53', v: '8.697', type: 'H' },
  { t: '2026-08-07 11:53', v: '0.902', type: 'L' },
  { t: '2026-08-07 18:14', v: '10.265', type: 'H' },
  { t: '2026-08-08 00:47', v: '0.341', type: 'L' },
  { t: '2026-08-08 07:00', v: '8.57', type: 'H' },
  { t: '2026-08-08 12:55', v: '0.99', type: 'L' },
  { t: '2026-08-08 19:19', v: '10.405', type: 'H' },
  { t: '2026-08-10 03:01', v: '-0.203', type: 'L' },
  { t: '2026-08-10 09:15', v: '8.963', type: 'H' },
  { t: '2026-08-10 15:07', v: '0.589', type: 'L' },
  { t: '2026-08-10 21:29', v: '10.998', type: 'H' },
  { t: '2026-08-13 05:48', v: '-1.086', type: 'L' },
  { t: '2026-08-13 12:02', v: '10.131', type: 'H' },
  { t: '2026-08-13 17:59', v: '-0.315', type: 'L' },
  { t: '2026-08-28 05:42', v: '0.118', type: 'L' },
  { t: '2026-08-28 11:55', v: '9.367', type: 'H' },
  { t: '2026-08-28 17:50', v: '0.575', type: 'L' },
]

// Real NOAA data for the DST fall-back Sunday — the two-A.M.-lows day (§2.2).
const NOV_2027_SNIPPET = [
  { t: '2027-11-06 05:27', v: '8.131', type: 'H' },
  { t: '2027-11-06 11:21', v: '2.153', type: 'L' },
  { t: '2027-11-06 17:35', v: '8.682', type: 'H' },
  { t: '2027-11-07 00:00', v: '1.406', type: 'L' },
  { t: '2027-11-07 05:21', v: '8.217', type: 'H' },
  { t: '2027-11-07 11:19', v: '2.104', type: 'L' },
  { t: '2027-11-07 17:32', v: '8.558', type: 'H' },
  { t: '2027-11-07 23:52', v: '1.453', type: 'L' },
]

describe('to12h', () => {
  it('renders midnight as 12', () => {
    expect(to12h('00:47')).toBe('12:47')
  })

  it('renders the noon hour as 12', () => {
    expect(to12h('12:55')).toBe('12:55')
  })

  it('renders other hours mod 12', () => {
    expect(to12h('07:00')).toBe('7:00')
    expect(to12h('19:19')).toBe('7:19')
  })
})

describe('formatFt', () => {
  it('formats to one decimal, including negatives', () => {
    expect(formatFt('10.087')).toBe('10.1')
    expect(formatFt('-1.94')).toBe('-1.9')
    expect(formatFt('-0.203')).toBe('-0.2')
    expect(formatFt('0.033')).toBe('0.0')
  })
})

describe('bucketDaySlots', () => {
  it('keeps the more extreme low and reports the other as overflow (2027-11-07)', () => {
    const dayEvents = NOV_2027_SNIPPET.filter((e) => e.t.startsWith('2027-11-07'))
    const { slots, overflow } = bucketDaySlots(dayEvents)

    expect(slots['L/am'].t).toBe('2027-11-07 00:00')
    expect(overflow).toHaveLength(1)
    expect(overflow[0]).toMatchObject({ slot: 'L/am' })
    expect(overflow[0].dropped.t).toBe('2027-11-07 11:19')
  })
})

describe('buildDay', () => {
  it('buckets a full 4-tide day correctly (2026-08-01)', () => {
    const events = AUG_2026.filter((e) => e.t.startsWith('2026-08-01'))
    const { dayEntry, footnotes } = buildDay('2026-08-01', 1, events, '2026-08-02')

    expect(dayEntry.dow).toBe('Sa')
    expect(dayEntry.isWeekend).toBe(true)
    expect(dayEntry.isToday).toBe(false)
    expect(dayEntry.highs.am).toEqual({ time: '1:08', ft: '10.1', extreme: true })
    expect(dayEntry.highs.pm).toEqual({ time: '1:40', ft: '9.3', extreme: false })
    expect(dayEntry.lows.am).toEqual({ time: '7:25', ft: '0.0', extreme: true })
    expect(dayEntry.lows.pm).toEqual({ time: '7:34', ft: '0.8', extreme: false })
    expect(footnotes).toEqual([])
  })

  it('renders a null cell for a missing P.M. low (2026-08-07)', () => {
    const events = AUG_2026.filter((e) => e.t.startsWith('2026-08-07'))
    const { dayEntry } = buildDay('2026-08-07', 7, events, '2026-08-02')

    expect(dayEntry.lows.pm).toBeNull()
    expect(dayEntry.lows.am.extreme).toBe(true) // solitary low is still the extreme
  })

  it('renders a null cell for a missing A.M. high (2026-08-13)', () => {
    const events = AUG_2026.filter((e) => e.t.startsWith('2026-08-13'))
    const { dayEntry } = buildDay('2026-08-13', 13, events, '2026-08-02')

    expect(dayEntry.highs.am).toBeNull()
    expect(dayEntry.highs.pm).toEqual({ time: '12:02', ft: '10.1', extreme: true })
    expect(formatFt('-1.086')).toBe('-1.1')
  })

  it('renders a null cell for a missing P.M. high (2026-08-28)', () => {
    const events = AUG_2026.filter((e) => e.t.startsWith('2026-08-28'))
    const { dayEntry } = buildDay('2026-08-28', 28, events, '2026-08-02')

    expect(dayEntry.highs.pm).toBeNull()
    expect(dayEntry.highs.am).toEqual({ time: '11:55', ft: '9.4', extreme: true })
  })

  it('formats midnight/noon and marks the correct extremes (2026-08-08)', () => {
    const events = AUG_2026.filter((e) => e.t.startsWith('2026-08-08'))
    const { dayEntry } = buildDay('2026-08-08', 8, events, '2026-08-02')

    expect(dayEntry.lows.am).toEqual({ time: '12:47', ft: '0.3', extreme: true })
    expect(dayEntry.lows.pm).toEqual({ time: '12:55', ft: '1.0', extreme: false })
    expect(dayEntry.highs.am).toEqual({ time: '7:00', ft: '8.6', extreme: false })
    expect(dayEntry.highs.pm).toEqual({ time: '7:19', ft: '10.4', extreme: true })
  })

  it('formats a negative low without truncation (2026-08-10)', () => {
    const events = AUG_2026.filter((e) => e.t.startsWith('2026-08-10'))
    const { dayEntry } = buildDay('2026-08-10', 10, events, '2026-08-02')

    expect(dayEntry.lows.am.ft).toBe('-0.2')
  })

  it('marks today when the date matches', () => {
    const events = AUG_2026.filter((e) => e.t.startsWith('2026-08-01'))
    const { dayEntry } = buildDay('2026-08-01', 1, events, '2026-08-01')
    expect(dayEntry.isToday).toBe(true)
  })

  it('keeps the extra low and footnotes the dropped one on the DST day (2027-11-07)', () => {
    const events = NOV_2027_SNIPPET.filter((e) => e.t.startsWith('2027-11-07'))
    const { dayEntry, footnotes } = buildDay('2027-11-07', 7, events, '2026-08-02')

    expect(dayEntry.dow).toBe('Su')
    expect(dayEntry.lows.am).toEqual({ time: '12:00', ft: '1.4', extreme: true })
    expect(footnotes).toEqual(['NOV 7 · EXTRA LOW 11:19 A.M. (2.1 FT) — CLOCK CHANGE'])
  })
})

describe('markExtremes', () => {
  it('marks a solitary high or low as extreme', () => {
    const highs = { am: { time: '05:53', v: '8.697' }, pm: null }
    const lows = { am: null, pm: { time: '11:53', v: '0.902' } }
    markExtremes(highs, lows)
    expect(highs.am.extreme).toBe(true)
    expect(lows.pm.extreme).toBe(true)
  })
})

describe('buildMonth', () => {
  it('renders every calendar day, including gaps, and collects footnotes', () => {
    const month = buildMonth(NOV_2027_SNIPPET, '2027-11', [], '2027-11-01')

    expect(month.monthKey).toBe('2027-11')
    expect(month.monthLabel).toBe('NOVEMBER 2027')
    expect(month.days).toHaveLength(30)

    const day7 = month.days.find((d) => d.date === '2027-11-07')
    expect(day7.lows.am).toEqual({ time: '12:00', ft: '1.4', extreme: true })

    const day1 = month.days.find((d) => d.date === '2027-11-01')
    expect(day1.highs.am).toBeNull()
    expect(day1.lows.am).toBeNull()

    expect(month.footnotes).toEqual(['NOV 7 · EXTRA LOW 11:19 A.M. (2.1 FT) — CLOCK CHANGE'])
  })

  it('maps a moon phase to its calendar day', () => {
    const month = buildMonth(AUG_2026, '2026-08', [{ date: '2026-08-28', phase: 'Full Moon' }], '2026-08-02')
    expect(month.moonPhases).toEqual([{ day: 28, phase: 'Full Moon' }])
  })
})

describe('nextTides', () => {
  it('returns the next two events at or after now', () => {
    const result = nextTides(AUG_2026, '2026-08-01 05:00', 2)
    expect(result[0]).toMatchObject({ type: 'L', label: 'Low', date: '2026-08-01', time: '7:25', meridiem: 'AM' })
    expect(result[1]).toMatchObject({ type: 'H', label: 'High', date: '2026-08-01', time: '1:40', meridiem: 'PM' })
  })

  it('crosses a month boundary', () => {
    const predictions = [
      { t: '2026-08-31 13:39', v: '10.264', type: 'H' },
      { t: '2026-08-31 19:51', v: '-0.114', type: 'L' },
      { t: '2026-09-01 01:20', v: '10.096', type: 'H' },
      { t: '2026-09-01 07:27', v: '-0.063', type: 'L' },
    ]
    const result = nextTides(predictions, '2026-08-31 20:00', 2)
    expect(result).toEqual([
      { type: 'H', label: 'High', date: '2026-09-01', time: '1:20', meridiem: 'AM', ft: '10.1' },
      { type: 'L', label: 'Low', date: '2026-09-01', time: '7:27', meridiem: 'AM', ft: '-0.1' },
    ])
  })

  it('returns an empty array past the end of coverage', () => {
    expect(nextTides(AUG_2026, '2099-01-01 00:00', 2)).toEqual([])
  })
})

describe('detectAnomalies', () => {
  it('finds the DST slot-overflow day and nothing else', () => {
    const anomalies = detectAnomalies([...AUG_2026, ...NOV_2027_SNIPPET])
    expect(anomalies).toHaveLength(1)
    expect(anomalies[0]).toMatchObject({
      date: '2027-11-07',
      kind: 'slot-overflow',
      slot: 'L/am',
      kept: '00:00',
      dropped: '11:19',
    })
  })
})
