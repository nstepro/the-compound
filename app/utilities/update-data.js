#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function getUpdatePaths(baseDir = __dirname) {
  return {
    sourcePath: path.join(baseDir, '../src/parser/output/compound-places.json'),
    destPath: path.join(baseDir, '../public/compound-places.json'),
  };
}

function updateData(baseDir = __dirname) {
  const { sourcePath, destPath } = getUpdatePaths(baseDir);

  if (!fs.existsSync(sourcePath)) {
    console.error('❌ Source file not found:', sourcePath);
    console.log('💡 Run the parser first: npm run parse');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(sourcePath, destPath);

  const stats = fs.statSync(destPath);
  const data = JSON.parse(fs.readFileSync(destPath, 'utf8'));

  console.log('✅ Data updated successfully!');
  console.log(`📊 ${data.metadata.totalPlaces} places loaded`);
  console.log(`📁 File size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`🕐 Last updated: ${new Date(data.metadata.generatedAt).toLocaleString()}`);
}

if (require.main === module) {
  try {
    updateData();
  } catch (error) {
    console.error('❌ Error updating data:', error.message);
    process.exit(1);
  }
}

module.exports = { getUpdatePaths, updateData };
