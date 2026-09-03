const { config } = require('./config');

const TZ = config.timeZone;

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** @returns {string} e.g. "2026-08-02 11:14" — directly comparable to NOAA `t` */
function nowLocalStamp(date = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

/** @returns {string} e.g. "2026-08-02" */
function todayLocalDate(date = new Date()) {
  return nowLocalStamp(date).slice(0, 10);
}

/** @returns {string} e.g. "2026-08" from "2026-08-02" */
function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

/** Number of days in a "YYYY-MM" month key. */
function daysInMonth(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Add `n` months to a "YYYY-MM-DD" date string, clamping the day to the
 * target month's length. No Date-object DST hazards — pure integer math on
 * the calendar components.
 */
function addMonths(dateStr, n) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const total = (month - 1) + n;
  const newYear = year + Math.floor(total / 12);
  const newMonth = ((total % 12) + 12) % 12;
  const key = `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
  const clampedDay = Math.min(day, daysInMonth(key));
  return `${key}-${String(clampedDay).padStart(2, '0')}`;
}

/**
 * Integer months between two "YYYY-MM-DD" (or "YYYY-MM") dates, computed
 * from the calendar year/month components only — no day-of-month precision,
 * matching the coverage math's "floor by construction" requirement.
 */
function monthsBetween(fromDateStr, toDateStr) {
  const [fy, fm] = fromDateStr.split('-').map(Number);
  const [ty, tm] = toDateStr.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

module.exports = {
  TZ,
  nowLocalStamp,
  todayLocalDate,
  monthKey,
  daysInMonth,
  addMonths,
  monthsBetween,
};
