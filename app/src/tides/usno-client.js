const { todayLocalDate } = require('./clock');

const BASE_URL = 'https://aa.usno.navy.mil/api/moon/phases/date';
const TIMEOUT_MS = 30000;
const MAX_ITERATIONS = 3;
const MAX_NUMP = 99;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function utcStamp(year, month, day, time) {
  return `${year}-${pad2(month)}-${pad2(day)} ${time}`;
}

/** Pure UTC date-string arithmetic — no wall-clock/DST hazard (§1.4 is about local time, not this). */
function nextDateString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

async function fetchPhasesFrom(startDate) {
  const params = new URLSearchParams({ date: startDate, nump: String(MAX_NUMP) });
  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`USNO moon phase request failed with HTTP ${response.status}`);
  }

  const body = await response.json();
  return body.phasedata || [];
}

/**
 * Fetches moon phases between two "YYYY-MM-DD" dates (inclusive). Loops
 * because a single request caps at 99 phases (§1.5), capped at 3 iterations.
 * Never throws — moon phases are garnish, and USNO has taken this API
 * offline before; any failure resolves to an empty array so a tide sync
 * never blocks on it.
 * @returns {Promise<Array<{date: string, phase: string, utc: string}>>}
 */
async function fetchMoonPhases(startDate, endDate) {
  try {
    const results = [];
    let cursor = startDate;

    for (let i = 0; i < MAX_ITERATIONS; i += 1) {
      const phasedata = await fetchPhasesFrom(cursor);
      if (!phasedata.length) break;

      for (const p of phasedata) {
        const [hour, minute] = p.time.split(':').map(Number);
        const utcInstant = new Date(Date.UTC(p.year, p.month - 1, p.day, hour, minute));
        results.push({
          date: todayLocalDate(utcInstant), // local calendar day, may differ from UTC day (§1.5)
          phase: p.phase,
          utc: utcStamp(p.year, p.month, p.day, p.time),
        });
      }

      const last = phasedata[phasedata.length - 1];
      const lastDate = `${last.year}-${pad2(last.month)}-${pad2(last.day)}`;
      if (lastDate >= endDate) break;

      cursor = nextDateString(lastDate);
    }

    // The last iteration can overshoot well past `endDate` (each request
    // returns a full batch of 99 regardless of how much is actually needed),
    // so trim before returning.
    return results.filter((p) => p.date <= endDate);
  } catch {
    return [];
  }
}

module.exports = { fetchMoonPhases };
