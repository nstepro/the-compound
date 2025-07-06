#!/usr/bin/env node

import { parser } from './parser.js';
import { logger } from './logger.js';
import { config } from './config.js';

async function main() {
  try {
    logger.info('=== Compound Parser Started ===');
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    const docId = args[1];

    switch (command) {
      case 'parse':
        await runParse(docId);
        break;
      
      case 'stats':
        await showStats();
        break;
      
      case 'help':
        showHelp();
        break;
      
      default:
        if (docId) {
          // If a document ID is provided as first argument, treat it as parse command
          await runParse(command);
        } else {
          // Default action: parse the configured document
          await runParse();
        }
        break;
    }
    
    logger.info('=== Compound Parser Completed ===');
    
  } catch (error) {
    logger.error('Parser failed:', error);
    process.exit(1);
  }
}

async function runParse(docId = null) {
  try {
    const documentId = docId || config.google.docId;
    
    if (!documentId) {
      throw new Error('No document ID provided. Set GOOGLE_DOC_ID environment variable or provide as argument.');
    }

    logger.info(`Parsing document: ${documentId}`);
    
    const result = await parser.parseDocument(documentId);
    
    console.log('\n🎉 Parsing completed successfully!');
    console.log(`📍 Total places: ${result.places.length}`);
    console.log(`📄 Source: ${result.metadata.sourceDocTitle}`);
    console.log(`⏰ Generated: ${result.metadata.generatedAt}`);
    
    if (result.metadata.summary) {
      console.log(`📝 Summary: ${result.metadata.summary}`);
    }
    
    // Show breakdown by type
    const typeBreakdown = result.places.reduce((acc, place) => {
      acc[place.type] = (acc[place.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Places by type:');
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
  } catch (error) {
    logger.error('Parse command failed:', error);
    throw error;
  }
}

async function showStats() {
  try {
    const stats = await parser.getParsingStats();
    
    console.log('\n📊 Parser Statistics:');
    console.log(`Status: ${stats.exists ? '✅ Output file exists' : '❌ No output file found'}`);
    
    if (stats.exists) {
      console.log(`📍 Total places: ${stats.totalPlaces}`);
      console.log(`⏰ Last parsed: ${stats.lastParsed}`);
      console.log(`📄 Source document: ${stats.sourceDocTitle || stats.sourceDocId}`);
    }
    
    if (stats.error) {
      console.log(`❌ Error: ${stats.error}`);
    }
    
  } catch (error) {
    logger.error('Stats command failed:', error);
    throw error;
  }
}

function showHelp() {
  console.log(`
🏖️  Compound Parser - Convert Google Docs to structured JSON

Usage:
  npm start                    Parse the configured Google Doc
  npm start parse [docId]      Parse a specific document
  npm start stats              Show parsing statistics
  npm start help               Show this help message

Environment Variables:
  OPENAI_API_KEY              OpenAI API key (required)
  GOOGLE_DOC_ID               Google Doc ID to parse (required)
  GOOGLE_APPLICATION_CREDENTIALS  Path to Google API credentials JSON
  OUTPUT_DIR                  Output directory (default: ./output)
  OUTPUT_FILE                 Output filename (default: compound-places.json)
  LOG_LEVEL                   Logging level (default: info)

Examples:
  npm start parse 1a2b3c4d5e6f7g8h9i0j
  npm start stats
  npm start help

Setup:
  1. Create .env file with your API keys
  2. Download Google API credentials JSON
  3. Set GOOGLE_DOC_ID to your document ID
  4. Run 'npm start' to parse your document

For more information, see the README.md file.
`);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
main(); 