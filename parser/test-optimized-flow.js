import { parser } from './src/parser.js';
import { logger } from './src/logger.js';
import { webEnrichmentService } from './src/web-enrichment-service.js';
import { googleDocsService } from './src/google-docs.js';
import { openaiService } from './src/openai-service.js';
import { config } from './src/config.js';

async function runLimitedTest(limit = 3) {
  try {
    logger.info(`🔬 Running limited test with ${limit} places...`);
    
    // Phase 1: Get document and parse with LLM (this is relatively cheap)
    logger.info('Phase 1: Fetching document and parsing with LLM...');
    const documentData = await googleDocsService.getDocumentAsMarkdown(config.google.docId);
    const parsedData = await openaiService.parseDocument(documentData.content, documentData.sections);
    
    const totalPlaces = parsedData.places.length;
    logger.info(`Found ${totalPlaces} places total, testing first ${limit} places`);
    
    // Phase 2-3: Only enrich the first few places (this is the expensive part)
    const placesToTest = parsedData.places.slice(0, limit);
    logger.info(`Phase 2-3: Enriching ${placesToTest.length} places with Google Places API and generating tags...`);
    
    // Add IDs to places
    const placesWithIds = placesToTest.map(place => ({
      ...place,
      id: place.id || parser.generatePlaceId(place.name)
    }));
    
    // Enrich with Google Places API and generate tags
    const enrichedPlaces = await webEnrichmentService.enrichPlaces(placesWithIds, []);
    
    // Count enriched places
    const enrichedCount = enrichedPlaces.filter(p => p.enrichmentStatus?.enriched).length;
    
    // Get categories
    const categories = [...new Set(enrichedPlaces.map(p => p.category).filter(Boolean))];
    
    return {
      totalPlaces,
      testedPlaces: enrichedPlaces,
      enrichedCount,
      categories
    };
    
  } catch (error) {
    logger.error('Limited test failed:', error);
    throw error;
  }
}

async function testOptimizedFlow() {
  try {
    logger.info('🚀 Testing optimized parsing flow (LIMITED TO 3 PLACES)...');
    logger.info('Expected flow:');
    logger.info('  Phase 1: LLM extracts context from text (name, description, notes, category, origText)');
    logger.info('  Phase 2: Google Places API provides business data (address, phone, website, rating, hours, coordinates)');
    logger.info('  Phase 3: LLM generates comprehensive tags using original text + Google Places API types');
    logger.info('  Phase 4: Merge context + business data + tags into final JSON');
    logger.info('');
    logger.info('💰 Cost-saving mode: Only processing first 3 places to avoid high API costs');
    logger.info('');
    
    // Create a custom limited test flow
    const TEST_LIMIT = 3;
    const result = await runLimitedTest(TEST_LIMIT);
    
    logger.info('✅ Limited parsing test completed successfully!');
    logger.info(`📊 Statistics:`);
    logger.info(`  - Total places parsed: ${result.totalPlaces}`);
    logger.info(`  - Places tested: ${result.testedPlaces.length} (limited to ${TEST_LIMIT})`);
    logger.info(`  - Enriched places: ${result.enrichedCount}`);
    logger.info(`  - Categories: ${result.categories.join(', ')}`);
    
    // Verify that places have the expected structure
    if (result.testedPlaces.length > 0) {
      const samplePlace = result.testedPlaces[0];
      logger.info('');
      logger.info('📋 Sample place structure:');
      logger.info(`  - LLM-extracted context: ${samplePlace.origText ? '✅' : '❌'} origText, ${samplePlace.category ? '✅' : '❌'} category`);
      logger.info(`  - Google Places API data: ${samplePlace.address ? '✅' : '❌'} address, ${samplePlace.phone ? '✅' : '❌'} phone`);
      logger.info(`  - Generated tags: ${samplePlace.tags && samplePlace.tags.length > 0 ? '✅' : '❌'} tags (${samplePlace.tags?.length || 0} total)`);
      logger.info(`  - Enrichment status: ${samplePlace.enrichmentStatus?.enriched ? '✅' : '❌'} enriched`);
      logger.info(`  - Source: ${samplePlace.enrichmentStatus?.source || 'N/A'}`);
      
      if (samplePlace.tags && samplePlace.tags.length > 0) {
        logger.info(`  - Sample tags: ${samplePlace.tags.slice(0, 5).join(', ')}${samplePlace.tags.length > 5 ? '...' : ''}`);
      }
    }
    
    // Show all tested places
    logger.info('');
    logger.info('🧪 All tested places:');
    result.testedPlaces.forEach((place, index) => {
      logger.info(`  ${index + 1}. ${place.name} (${place.type}) - ${place.tags ? place.tags.length : 0} tags`);
    });
    
    logger.info('');
    logger.info('💰 Cost savings achieved:');
    logger.info(`  - LLM parsing: 1 call (would be 1 call anyway)`);
    logger.info(`  - Google Places API: ${result.testedPlaces.length} calls (vs ${result.totalPlaces} for full run)`);
    logger.info(`  - Tag generation: ${result.testedPlaces.length} calls (vs ${result.totalPlaces} for full run)`);
    logger.info(`  - Total API savings: ~${Math.round(((result.totalPlaces - result.testedPlaces.length) / result.totalPlaces) * 100)}% reduction`);
    
    return result;
  } catch (error) {
    logger.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testOptimizedFlow()
  .then(() => {
    logger.info('🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('💥 Test failed:', error);
    process.exit(1);
  }); 