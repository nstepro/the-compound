#!/usr/bin/env node

const { openaiService } = require('./openai-service');
const { logger } = require('./logger');
const fs = require('fs');
const path = require('path');

// Test the parsing with the fixture input
const testInput = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'example-input.md'),
  'utf8'
);

async function debugParsing() {
  try {
    logger.info('=== Debug Parsing Test ===');
    
    const result = await openaiService.parseDocument(testInput);
    
    console.log('\n🎯 Parsing Results:');
    console.log(`Total places found: ${result.places.length}`);
    console.log('\nPlaces:');
    result.places.forEach((place, index) => {
      console.log(`${index + 1}. ${place.name} (${place.type})`);
    });
    
    console.log('\n📝 Full JSON Output:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    logger.error('Debug parsing failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  debugParsing();
}

module.exports = { debugParsing }; 