#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../parser/output/compound-places.json');
const destPath = path.join(__dirname, 'public/compound-places.json');

try {
  // Check if source file exists
  if (!fs.existsSync(sourcePath)) {
    console.error('❌ Source file not found:', sourcePath);
    console.log('💡 Make sure to run the parser first to generate the data');
    process.exit(1);
  }

  // Copy the file
  fs.copyFileSync(sourcePath, destPath);
  
  // Get file stats for info
  const stats = fs.statSync(destPath);
  const data = JSON.parse(fs.readFileSync(destPath, 'utf8'));
  
  console.log('✅ Data updated successfully!');
  console.log(`📊 ${data.metadata.totalPlaces} places loaded`);
  console.log(`📁 File size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`🕐 Last updated: ${new Date(data.metadata.generatedAt).toLocaleString()}`);
  
} catch (error) {
  console.error('❌ Error updating data:', error.message);
  process.exit(1);
} 