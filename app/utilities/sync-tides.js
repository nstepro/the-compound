#!/usr/bin/env node

const { config } = require('../src/tides/config');
const { syncTides, getCoverage } = require('../src/tides/sync');
const { readCache } = require('../src/tides/storage');

async function main({ force = false } = {}) {
  console.log('🌊 Checking tide coverage...');

  const existing = await readCache();
  const coverage = getCoverage(existing);

  if (coverage.ok && !force) {
    console.log(`📊 Cache: ${existing.metadata.coverage.start} → ${existing.metadata.coverage.end} (${coverage.monthsRemaining} months remaining)`);
    console.log('✅ Coverage is fresh — nothing to do. Use --force to refetch.');
    return { skipped: true, coverage };
  }

  console.log(`🌊 Fetching ${config.coverageFetchMonths} months from NOAA station ${config.station.id} (${config.station.name})...`);

  const result = await syncTides({ force });
  console.log(`📊 ${result.events} predictions`);
  console.log(`🌙 ${result.moonPhases} moon phases from USNO`);

  if (result.anomalies.length) {
    const plural = result.anomalies.length === 1 ? 'anomaly' : 'anomalies';
    console.log(`⚠️  ${result.anomalies.length} ${plural}:`);
    result.anomalies.forEach((a) => {
      const kind = a.slot.startsWith('L') ? 'low' : 'high';
      console.log(`   ${a.date} extra ${kind} (kept ${a.kept}, footnoted ${a.dropped})`);
    });
  }

  if (result.target === 'gcs') {
    const bucket = require('../src/parser/config').config.googleCloudStorage.bucketName;
    console.log(`☁️  Uploaded to gs://${bucket}/${config.cacheFileName}`);
  } else {
    console.log(`💾 Written to public/${config.cacheFileName}`);
  }

  console.log('✅ Done');
  return result;
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  main({ force }).catch((error) => {
    console.error('❌ Tide sync failed:', error.message);
    process.exit(1);
  });
}

module.exports = { main };
