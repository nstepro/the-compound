const { config } = require('./config');
const { logger } = require('./logger');
const { readCache, writeCache } = require('./storage');
const { fetchPredictions } = require('./noaa-client');
const { fetchMoonPhases } = require('./usno-client');
const { detectAnomalies } = require('./transform');
const { validateTideCache } = require('./schema');
const {
  todayLocalDate, addMonths, monthsBetween, monthKey,
} = require('./clock');

const SYNC_VERSION = '1.0.0';
const CACHE_TTL_MS = 60 * 1000;
const BACKOFF_MS = 60 * 60 * 1000;
const MIN_EVENTS = 300;
const MIN_EVENTS_PER_DAY = 3;

let memo = { cache: null, fetchedAt: 0 };
let inFlight = null;
let lastAttempt = 0;

/**
 * True if any calendar month between `fromDate` and `toDate` (inclusive) has
 * zero predictions. A cache can have a reassuring last-event date while still
 * being hollow in the middle — e.g. the committed sample fixture only has
 * real events in its first and last month — so freshness can't be judged by
 * the last date alone.
 */
function hasMonthGap(predictions, fromDate, toDate) {
  const monthsWithData = new Set(predictions.map((p) => p.t.slice(0, 7)));
  const lastMonth = monthKey(toDate);
  let cursor = monthKey(fromDate);
  while (cursor <= lastMonth) {
    if (!monthsWithData.has(cursor)) return true;
    cursor = monthKey(addMonths(`${cursor}-01`, 1));
  }
  return false;
}

/** How much runway is left in the cache, relative to `today` (defaults to now). */
function getCoverage(cache, today = todayLocalDate()) {
  if (!cache?.predictions?.length) {
    return { ok: false, reason: 'empty', monthsRemaining: 0 };
  }
  const last = cache.predictions[cache.predictions.length - 1].t.slice(0, 10);
  const monthsRemaining = monthsBetween(today, last);

  if (monthsRemaining < config.coverageMinMonths) {
    return { ok: false, reason: 'stale', monthsRemaining, lastDate: last };
  }
  if (hasMonthGap(cache.predictions, today, last)) {
    return { ok: false, reason: 'gap', monthsRemaining, lastDate: last };
  }

  return { ok: true, reason: 'fresh', monthsRemaining, lastDate: last };
}

function countDistinctDays(predictions) {
  return new Set(predictions.map((p) => p.t.slice(0, 10))).size;
}

/** Short-lived in-process memo so a burst of requests doesn't re-download the cache from GCS. */
async function getCache() {
  if (memo.cache && Date.now() - memo.fetchedAt < CACHE_TTL_MS) {
    return memo.cache;
  }
  const cache = await readCache();
  memo = { cache, fetchedAt: Date.now() };
  return cache;
}

function invalidateMemo() {
  memo = { cache: null, fetchedAt: 0 };
}

/**
 * Fetches a fresh coverage window from NOAA (+ USNO for moon phases) and
 * persists it. Leaves the existing cache untouched on NOAA failure so a
 * flaky upstream never wipes out a working page (§5.2).
 */
async function syncTides({ force = false } = {}) {
  if (!force) {
    const existing = await readCache();
    const coverage = getCoverage(existing);
    if (coverage.ok) {
      return { skipped: true, coverage };
    }
  }

  // Start at the 1st of the current month, not "today" — otherwise a sync
  // that lands mid-month permanently leaves the earlier days of that month
  // uncovered (NOAA only ever fetches forward from `begin`).
  const begin = `${monthKey(todayLocalDate())}-01`;
  const end = addMonths(begin, config.coverageFetchMonths);

  const predictions = await fetchPredictions(begin, end);

  const distinctDays = countDistinctDays(predictions);
  if (predictions.length < MIN_EVENTS || !distinctDays || predictions.length / distinctDays < MIN_EVENTS_PER_DAY) {
    throw new Error(`Tide sync received a suspiciously small response: ${predictions.length} events over ${distinctDays} days`);
  }

  let moonPhases = [];
  if (config.moonPhasesEnabled) {
    try {
      moonPhases = await fetchMoonPhases(begin, end);
    } catch (error) {
      logger.error(`Moon phase fetch failed, continuing without it: ${error.message}`);
      moonPhases = [];
    }
  }

  const anomalies = detectAnomalies(predictions);
  anomalies.forEach((a) => logger.warn(`Tide anomaly ${a.date} ${a.slot}: kept ${a.kept}, dropped ${a.dropped} (${a.note})`));

  const payload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      syncVersion: SYNC_VERSION,
      source: 'NOAA CO-OPS datagetter',
      station: { ...config.station },
      datum: 'MLLW',
      units: 'english',
      timeZone: config.timeZone,
      coverage: {
        start: predictions[0].t.slice(0, 10),
        end: predictions[predictions.length - 1].t.slice(0, 10),
        days: distinctDays,
        events: predictions.length,
      },
      moonPhaseSource: 'USNO api/moon/phases',
      anomalies,
    },
    predictions,
    moonPhases,
  };

  validateTideCache(payload);

  const written = await writeCache(payload);
  invalidateMemo();

  return {
    synced: true,
    events: predictions.length,
    moonPhases: moonPhases.length,
    coverage: getCoverage(payload),
    anomalies,
    target: written.target,
  };
}

/**
 * Fire-and-forget self-heal for the lazy-refresh request path. Never throws,
 * never blocks the response — serves stale data immediately while a
 * background refetch (mutexed, backed off on failure) brings it current.
 */
function ensureCoverage(cache) {
  const cov = getCoverage(cache);
  if (cov.ok) return cov;
  if (inFlight) return cov;
  if (Date.now() - lastAttempt < BACKOFF_MS) return cov;

  lastAttempt = Date.now();
  inFlight = syncTides({ force: false })
    .then((r) => logger.info(`Tide self-heal complete: ${JSON.stringify(r)}`))
    .catch((e) => logger.error(`Tide self-heal failed: ${e.message}`))
    .finally(() => {
      inFlight = null;
    });

  return cov;
}

module.exports = { getCoverage, getCache, invalidateMemo, syncTides, ensureCoverage };
