const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { logger } = require('./logger');
const { webEnrichmentService } = require('./web-enrichment-service');

class EnrichmentTester {
  constructor() {
    this.outputDir = config.output.dir;
    this.outputFilename = config.output.filename;
  }

  async loadExistingPlaces() {
    try {
      const outputPath = path.join(this.outputDir, this.outputFilename);
      
      if (!fs.existsSync(outputPath)) {
        throw new Error(`No existing places file found at: ${outputPath}`);
      }

      const content = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      const places = content.places || [];
      
      logger.info(`Loaded ${places.length} existing places from: ${outputPath}`);
      return { places, metadata: content.metadata || {} };
    } catch (error) {
      logger.error('Failed to load existing places:', error);
      throw error;
    }
  }

  async saveResults(originalData, enrichedPlaces) {
    try {
      const updatedData = {
        ...originalData,
        metadata: {
          ...originalData.metadata,
          lastEnrichmentTest: new Date().toISOString(),
          enrichmentStats: {
            totalPlaces: enrichedPlaces.length,
            enrichedPlaces: enrichedPlaces.filter(p => p.enrichmentStatus?.enriched).length,
            skippedPlaces: enrichedPlaces.filter(p => p.enrichmentStatus?.enriched === false).length
          }
        },
        places: enrichedPlaces
      };

      const outputPath = path.join(this.outputDir, this.outputFilename);
      
      // Create backup
      const backupPath = path.join(
        this.outputDir,
        `${path.basename(this.outputFilename, '.json')}-backup-${Date.now()}.json`
      );
      fs.copyFileSync(outputPath, backupPath);
      logger.info(`Created backup: ${backupPath}`);

      // Save updated data
      fs.writeFileSync(outputPath, JSON.stringify(updatedData, null, 2), 'utf8');
      logger.info(`Updated places saved to: ${outputPath}`);

      return outputPath;
    } catch (error) {
      logger.error('Failed to save enrichment results:', error);
      throw error;
    }
  }

  async testEnrichment(options = {}) {
    const {
      maxPlaces = 5,
      startIndex = 0,
      forceEnrichment = true,
      filterByType = null,
      dryRun = false
    } = options;

    try {
      logger.info('=== Starting Enrichment Test ===');
      logger.info(`Options: maxPlaces=${maxPlaces}, startIndex=${startIndex}, forceEnrichment=${forceEnrichment}, dryRun=${dryRun}`);

      // Load existing places
      const originalData = await this.loadExistingPlaces();
      let placesToTest = originalData.places;

      // Filter by type if specified
      if (filterByType) {
        placesToTest = placesToTest.filter(place => place.type === filterByType);
        logger.info(`Filtered to ${placesToTest.length} places of type: ${filterByType}`);
      }

      // Get subset to test
      const endIndex = Math.min(startIndex + maxPlaces, placesToTest.length);
      const testPlaces = placesToTest.slice(startIndex, endIndex);
      
      logger.info(`Testing enrichment on ${testPlaces.length} places (${startIndex} to ${endIndex-1})`);
      
      if (testPlaces.length === 0) {
        logger.warn('No places to test!');
        return;
      }

      // Log the places we're testing
      logger.info('Places to test:');
      testPlaces.forEach((place, index) => {
        const currentEnrichment = place.enrichmentStatus?.enriched ? '✅' : '❌';
        logger.info(`  ${startIndex + index + 1}. ${place.name} (${place.type}) ${currentEnrichment}`);
      });

      if (dryRun) {
        logger.info('DRY RUN - No actual enrichment will be performed');
        return;
      }

      // Temporarily override config for testing
      const originalSkipSetting = config.parsing.skipEnrichmentIfExists;
      if (forceEnrichment) {
        config.parsing.skipEnrichmentIfExists = false;
        logger.info('Forcing enrichment (ignoring existing enrichment status)');
      }

      // Test enrichment
      logger.info('Starting web enrichment...');
      const enrichedTestPlaces = await webEnrichmentService.enrichPlaces(testPlaces, []);
      
      // Restore original config
      config.parsing.skipEnrichmentIfExists = originalSkipSetting;

      // Update the full places array with enriched results
      const updatedPlaces = [...originalData.places];
      enrichedTestPlaces.forEach((enrichedPlace, index) => {
        const originalIndex = startIndex + index;
        if (filterByType) {
          // Find the original index in the unfiltered array
          const originalUnfilteredIndex = originalData.places.findIndex(p => p.id === enrichedPlace.id);
          if (originalUnfilteredIndex !== -1) {
            updatedPlaces[originalUnfilteredIndex] = enrichedPlace;
          }
        } else {
          updatedPlaces[originalIndex] = enrichedPlace;
        }
      });

      // Log results
      logger.info('=== Enrichment Results ===');
      enrichedTestPlaces.forEach((place, index) => {
        const status = place.enrichmentStatus?.enriched ? '✅ ENRICHED' : '❌ FAILED';
        const reason = place.enrichmentStatus?.reason || '';
        const hasData = (place.address || place.phone || place.website) ? '📋 HAS DATA' : '📋 NO DATA';
        
        logger.info(`  ${startIndex + index + 1}. ${place.name} - ${status} ${hasData}`);
        if (reason) {
          logger.info(`     Reason: ${reason}`);
        }
        if (place.address) {
          logger.info(`     Address: ${place.address}`);
        }
        if (place.phone) {
          logger.info(`     Phone: ${place.phone}`);
        }
        if (place.website) {
          logger.info(`     Website: ${place.website}`);
        }
      });

      // Save results
      await this.saveResults(originalData, updatedPlaces);
      
      const enrichedCount = enrichedTestPlaces.filter(p => p.enrichmentStatus?.enriched).length;
      const failedCount = enrichedTestPlaces.filter(p => p.enrichmentStatus?.enriched === false).length;
      
      logger.info(`=== Test Complete ===`);
      logger.info(`Successfully enriched: ${enrichedCount}/${testPlaces.length}`);
      logger.info(`Failed: ${failedCount}/${testPlaces.length}`);

    } catch (error) {
      logger.error('Enrichment test failed:', error);
      throw error;
    }
  }

  async listPlaces(options = {}) {
    const { maxPlaces = 20, showEnrichmentStatus = true } = options;
    
    try {
      const data = await this.loadExistingPlaces();
      const places = data.places.slice(0, maxPlaces);
      
      logger.info(`=== First ${places.length} Places ===`);
      places.forEach((place, index) => {
        const enriched = place.enrichmentStatus?.enriched ? '✅' : '❌';
        const hasData = (place.address || place.phone || place.website) ? '📋' : '📭';
        const status = showEnrichmentStatus ? `${enriched} ${hasData}` : '';
        
        logger.info(`  ${index + 1}. ${place.name} (${place.type}) ${status}`);
      });
      
      const enrichedCount = data.places.filter(p => p.enrichmentStatus?.enriched).length;
      const totalCount = data.places.length;
      
      logger.info(`Total: ${totalCount} places, ${enrichedCount} enriched`);
      
    } catch (error) {
      logger.error('Failed to list places:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  const tester = new EnrichmentTester();
  
  try {
    switch (command) {
      case 'list':
        await tester.listPlaces({ maxPlaces: parseInt(args[1]) || 20 });
        break;
        
      case 'test':
        const maxPlaces = parseInt(args[1]) || 3;
        const startIndex = parseInt(args[2]) || 0;
        await tester.testEnrichment({ 
          maxPlaces, 
          startIndex, 
          forceEnrichment: true,
          dryRun: args.includes('--dry-run')
        });
        break;
        
      case 'test-type':
        const type = args[1];
        const count = parseInt(args[2]) || 3;
        if (!type) {
          logger.error('Usage: test-type <type> [count]');
          break;
        }
        await tester.testEnrichment({ 
          maxPlaces: count, 
          filterByType: type,
          forceEnrichment: true,
          dryRun: args.includes('--dry-run')
        });
        break;
        
      case 'help':
      default:
        console.log(`
🧪 Enrichment Tester - Debug web enrichment without full parsing

Commands:
  list [count]              List first N places with enrichment status (default: 20)
  test [count] [start]      Test enrichment on N places starting at index (default: 3, 0)
  test-type <type> [count]  Test enrichment on places of specific type (restaurant, activity, etc.)
  
Flags:
  --dry-run                 Show what would be tested without actually running enrichment

Examples:
  node src/test-enrichment.js list 10
  node src/test-enrichment.js test 3 0
  node src/test-enrichment.js test 5 10 --dry-run
  node src/test-enrichment.js test-type restaurant 2
        `);
        break;
    }
  } catch (error) {
    logger.error('Command failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { EnrichmentTester }; 