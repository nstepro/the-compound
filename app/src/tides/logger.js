// A standalone console logger, deliberately not src/parser/logger.js — that
// module requires src/parser/config.js, which throws at load time if OpenAI/
// Google env vars are missing. The public tide route must not depend on that.
const logger = {
  info: (...args) => console.log('[tides]', ...args),
  warn: (...args) => console.warn('[tides]', ...args),
  error: (...args) => console.error('[tides]', ...args),
};

module.exports = { logger };
