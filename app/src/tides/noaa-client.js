const { config } = require('./config');

const BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const TIMEOUT_MS = 30000;

function toCompactDate(dateStr) {
  return dateStr.replace(/-/g, '');
}

/**
 * Fetches hi-lo tide predictions for the configured station between two
 * "YYYY-MM-DD" dates (inclusive). Checks for NOAA's error envelope before
 * reading `.predictions` — NOAA returns it with HTTP 400 for a bad station,
 * but sometimes with HTTP 200 for other failure shapes (§1.3).
 * @returns {Promise<Array<{t: string, v: string, type: 'H'|'L'}>>}
 */
async function fetchPredictions(beginDate, endDate) {
  const params = new URLSearchParams({
    station: config.station.id,
    product: 'predictions',
    interval: 'hilo',
    datum: 'MLLW',
    units: 'english',
    time_zone: 'lst_ldt',
    begin_date: toCompactDate(beginDate),
    end_date: toCompactDate(endDate),
    format: 'json',
    application: 'the-compound-tide-sync',
  });

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const body = await response.json();

  if (body.error) {
    const message = String(body.error.message || 'Unknown NOAA error').trim();
    throw new Error(`NOAA CO-OPS error: ${message}`);
  }

  if (!response.ok) {
    throw new Error(`NOAA CO-OPS request failed with HTTP ${response.status}`);
  }

  return body.predictions || [];
}

module.exports = { fetchPredictions };
