const { daysInMonth } = require('./clock');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function to12h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}`;
}

function meridiemOf(hhmm) {
  const hour = Number(hhmm.split(':')[0]);
  return hour < 12 ? 'AM' : 'PM';
}

function formatFt(v) {
  return Number(v).toFixed(1);
}

function slotKeyOf(event) {
  const hour = Number(event.t.slice(11, 13));
  return `${event.type}/${hour < 12 ? 'am' : 'pm'}`;
}

/**
 * Assign a day's raw events into the four H/L x am/pm grid slots. A slot
 * holds one event; an overflowing event (§2.2 — the DST fall-back day with
 * two A.M. lows) is resolved by keeping the more extreme reading (lowest
 * for L, highest for H) and reporting the other as overflow.
 */
function bucketDaySlots(events) {
  const slots = { 'H/am': null, 'H/pm': null, 'L/am': null, 'L/pm': null };
  const overflow = [];

  for (const event of events) {
    const key = slotKeyOf(event);
    const current = slots[key];
    if (!current) {
      slots[key] = event;
      continue;
    }

    const isLow = event.type === 'L';
    const currentValue = Number(current.v);
    const newValue = Number(event.v);
    const keepNew = isLow ? newValue < currentValue : newValue > currentValue;
    const kept = keepNew ? event : current;
    const dropped = keepNew ? current : event;

    slots[key] = kept;
    overflow.push({ slot: key, kept, dropped });
  }

  return { slots, overflow };
}

function anomalyNote(slot) {
  const half = slot.endsWith('am') ? 'A.M.' : 'P.M.';
  return `daylight saving time ends; 13-hour ${half} window`;
}

/**
 * Scan every day across the full prediction set (all 24 months, not just a
 * rendered month) for grid-slot overflow, for the sync-time cache metadata.
 */
function detectAnomalies(predictions) {
  const byDate = new Map();
  for (const event of predictions) {
    const date = event.t.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(event);
  }

  const anomalies = [];
  for (const [date, events] of byDate) {
    const { overflow } = bucketDaySlots(events);
    for (const { slot, kept, dropped } of overflow) {
      anomalies.push({
        date,
        kind: 'slot-overflow',
        slot,
        kept: kept.t.slice(11),
        dropped: dropped.t.slice(11),
        note: anomalyNote(slot),
      });
    }
  }

  return anomalies;
}

function footnoteFor(dateStr, dropped) {
  const [, month, day] = dateStr.split('-').map(Number);
  const label = dropped.type === 'H' ? 'HIGH' : 'LOW';
  const time = dropped.t.slice(11);
  const meridiem = meridiemOf(time) === 'AM' ? 'A.M.' : 'P.M.';
  return `${MONTH_ABBR[month - 1]} ${day} · EXTRA ${label} ${to12h(time)} ${meridiem} (${formatFt(dropped.v)} FT) — CLOCK CHANGE`;
}

/** Marks the greatest high and least low as extreme=true, mutating in place. */
function markExtremes(highs, lows) {
  const highKeys = ['am', 'pm'].filter((k) => highs[k]);
  if (highKeys.length) {
    const maxKey = highKeys.reduce((a, b) => (Number(highs[a].v) >= Number(highs[b].v) ? a : b));
    highs[maxKey].extreme = true;
  }

  const lowKeys = ['am', 'pm'].filter((k) => lows[k]);
  if (lowKeys.length) {
    const minKey = lowKeys.reduce((a, b) => (Number(lows[a].v) <= Number(lows[b].v) ? a : b));
    lows[minKey].extreme = true;
  }
}

function formatEntry(entry) {
  if (!entry) return null;
  return { time: to12h(entry.time), ft: formatFt(entry.v), extreme: Boolean(entry.extreme) };
}

/** Builds one calendar day's grid row plus any footnotes from slot overflow. */
function buildDay(dateStr, dayNum, events, todayDate) {
  const { slots, overflow } = bucketDaySlots(events);

  const highs = {
    am: slots['H/am'] ? { time: slots['H/am'].t.slice(11), v: slots['H/am'].v } : null,
    pm: slots['H/pm'] ? { time: slots['H/pm'].t.slice(11), v: slots['H/pm'].v } : null,
  };
  const lows = {
    am: slots['L/am'] ? { time: slots['L/am'].t.slice(11), v: slots['L/am'].v } : null,
    pm: slots['L/pm'] ? { time: slots['L/pm'].t.slice(11), v: slots['L/pm'].v } : null,
  };

  markExtremes(highs, lows);

  const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();

  const dayEntry = {
    date: dateStr,
    day: dayNum,
    dow: DOW_ABBR[dow],
    isWeekend: dow === 0 || dow === 6,
    isToday: dateStr === todayDate,
    highs: { am: formatEntry(highs.am), pm: formatEntry(highs.pm) },
    lows: { am: formatEntry(lows.am), pm: formatEntry(lows.pm) },
  };

  const footnotes = overflow.map(({ dropped }) => footnoteFor(dateStr, dropped));

  return { dayEntry, footnotes };
}

/**
 * Buckets a month of raw predictions into grid-ready days. Drives the loop
 * from the calendar (1..daysInMonth), not from the event list, so a data
 * gap still renders a row with empty cells.
 */
function buildMonth(predictions, monthKeyStr, moonPhases, todayDate) {
  const eventsByDate = new Map();
  for (const event of predictions) {
    if (!event.t.startsWith(monthKeyStr)) continue;
    const date = event.t.slice(0, 10);
    if (!eventsByDate.has(date)) eventsByDate.set(date, []);
    eventsByDate.get(date).push(event);
  }

  const numDays = daysInMonth(monthKeyStr);
  const days = [];
  const footnotes = [];
  for (let day = 1; day <= numDays; day += 1) {
    const dateStr = `${monthKeyStr}-${String(day).padStart(2, '0')}`;
    const { dayEntry, footnotes: dayFootnotes } = buildDay(dateStr, day, eventsByDate.get(dateStr) || [], todayDate);
    days.push(dayEntry);
    footnotes.push(...dayFootnotes);
  }

  const monthMoonPhases = (moonPhases || [])
    .filter((mp) => mp.date.startsWith(monthKeyStr))
    .map((mp) => ({ day: Number(mp.date.slice(8, 10)), phase: mp.phase }));

  const [year, month] = monthKeyStr.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[month - 1].toUpperCase()} ${year}`;

  return { monthKey: monthKeyStr, monthLabel, days, moonPhases: monthMoonPhases, footnotes };
}

/**
 * Next `count` tide events at or after `nowStamp`, computed over the whole
 * cache so it stays correct near month/coverage boundaries. Binary search
 * relies on `predictions` being chronologically sorted, which NOAA
 * guarantees for a single station/date-range request.
 */
function nextTides(predictions, nowStamp, count = 2) {
  let lo = 0;
  let hi = predictions.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (predictions[mid].t < nowStamp) lo = mid + 1;
    else hi = mid;
  }

  if (lo >= predictions.length) return [];

  return predictions.slice(lo, lo + count).map((event) => {
    const time = event.t.slice(11);
    return {
      type: event.type,
      label: event.type === 'H' ? 'High' : 'Low',
      date: event.t.slice(0, 10),
      time: to12h(time),
      meridiem: meridiemOf(time),
      ft: formatFt(event.v),
    };
  });
}

module.exports = {
  to12h,
  formatFt,
  bucketDaySlots,
  buildDay,
  buildMonth,
  markExtremes,
  nextTides,
  detectAnomalies,
};
