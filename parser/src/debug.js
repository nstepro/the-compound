#!/usr/bin/env node

import { openaiService } from './openai-service.js';
import { logger } from './logger.js';
import fs from 'fs';

// Test the parsing with the example input
const testInput = fs.readFileSync('./examples/example-input.md', 'utf8');

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

debugParsing(); 