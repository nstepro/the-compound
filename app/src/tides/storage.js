const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { logger } = require('./logger');

const LOCAL_PATH = path.join(__dirname, '../../public', config.cacheFileName);
const FIXTURE_PATH = path.join(__dirname, '../../fixtures/tide-predictions.sample.json');

/**
 * Reads the tide cache from GCS (if enabled), falling back to the local
 * synced copy, falling back to the committed fixture so a developer with no
 * .env at all still gets a working tide chart (§2.6).
 *
 * Requires src/parser/config.js and google-cloud-storage.js lazily, inside
 * this function, wrapped in try/catch — those modules throw at load time if
 * OpenAI/Google env vars are missing, and this public route must not be
 * hostage to the parser's configuration.
 */
async function readCache() {
  try {
    const parserConfig = require('../parser/config').config;
    if (parserConfig.googleCloudStorage.enabled) {
      const { googleCloudStorageService } = require('../parser/google-cloud-storage');
      const data = await googleCloudStorageService.downloadFile(config.cacheFileName);
      if (data) return data;
    }
  } catch (error) {
    logger.warn(`GCS read unavailable, falling back to local file: ${error.message}`);
  }

  try {
    if (fs.existsSync(LOCAL_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8'));
    }
  } catch (error) {
    logger.warn(`Local tide cache read failed: ${error.message}`);
  }

  try {
    if (fs.existsSync(FIXTURE_PATH)) {
      return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    }
  } catch (error) {
    logger.warn(`Tide fixture read failed: ${error.message}`);
  }

  return null;
}

/**
 * Writes the tide cache to GCS (if enabled), falling back to the local
 * public/ file. Same lazy-require-and-try/catch shape as readCache (§2.6).
 */
async function writeCache(payload) {
  try {
    const parserConfig = require('../parser/config').config;
    if (parserConfig.googleCloudStorage.enabled) {
      const { googleCloudStorageService } = require('../parser/google-cloud-storage');
      await googleCloudStorageService.uploadFile(payload, config.cacheFileName, 'application/json');
      return { target: 'gcs' };
    }
  } catch (error) {
    logger.warn(`GCS write unavailable, falling back to local file: ${error.message}`);
  }

  fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(payload, null, 2));
  return { target: 'local' };
}

module.exports = { readCache, writeCache };
