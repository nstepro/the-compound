const dotenv = require('dotenv');

// Load environment variables. Deliberately does NOT require '../parser/config' —
// that module throws at load time if OpenAI/Google env vars are missing, which
// would make this public route hostage to the parser's configuration.
dotenv.config();

const config = {
  station: {
    id: process.env.TIDE_STATION_ID || '8415809',
    name: process.env.TIDE_STATION_NAME || 'Tenants Harbor',
    // Fixed metadata for the Tenants Harbor / Portland-reference pairing.
    // Not exposed as env vars — revisit if a second station is ever added.
    state: 'ME',
    lat: 43.965,
    lng: -69.2167,
    type: 'S',
    referenceStationId: '8418150',
    referenceStationName: 'Portland, ME',
    correction: {
      timeOffsetMinutes: -11,
      heightFactor: 1.02,
      appliedBy: 'NOAA',
    },
  },
  timeZone: process.env.TIDE_TIMEZONE || 'America/New_York',
  cacheFileName: process.env.TIDE_CACHE_FILE_NAME || 'tide-predictions.json',
  coverageMinMonths: parseInt(process.env.TIDE_COVERAGE_MIN_MONTHS, 10) || 12,
  coverageFetchMonths: parseInt(process.env.TIDE_COVERAGE_FETCH_MONTHS, 10) || 24,
  moonPhasesEnabled: process.env.TIDE_MOON_PHASES_ENABLED !== 'false',
};

module.exports = { config };
