#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../fixtures/compound-places.sample.json');
const destPath = path.join(__dirname, '../public/compound-places.json');

if (!fs.existsSync(sourcePath)) {
  console.error('❌ Sample fixture not found:', sourcePath);
  process.exit(1);
}

fs.mkdirSync(path.dirname(destPath), { recursive: true });
fs.copyFileSync(sourcePath, destPath);

const data = JSON.parse(fs.readFileSync(destPath, 'utf8'));
console.log('✅ Seeded local places data');
console.log(`📊 ${data.metadata.totalPlaces} sample places → public/compound-places.json`);
