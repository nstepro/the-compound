import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config.js';
import { logger } from './logger.js';
import { googleDocsService } from './google-docs.js';
import { openaiService } from './openai-service.js';
import { webEnrichmentService } from './web-enrichment-service.js';
import { validateOutput } from './schema.js';

class Parser {
  constructor() {
    this.outputDir = config.output.dir;
    this.outputFilename = config.output.filename;
  }

  async ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`Created output directory: ${this.outputDir}`);
    }
  }

  generatePlaceId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  async loadExistingPlaces() {
    try {
      const outputPath = path.join(this.outputDir, this.outputFilename);
      
      if (!fs.existsSync(outputPath)) {
        logger.info('No existing places file found');
        return [];
      }

      const existingContent = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      const existingPlaces = existingContent.places || [];
      
      logger.info(`Loaded ${existingPlaces.length} existing places`);
      return existingPlaces;
    } catch (error) {
      logger.warn('Failed to load existing places:', error);
      return [];
    }
  }

  async parseDocument(docId = null) {
    try {
      const documentId = docId || config.google.docId;
      
      logger.info(`Starting parsing process for document: ${documentId}`);
      logger.info(`Configuration: fullRefresh=${config.parsing.fullRefresh}, skipEnrichmentIfExists=${config.parsing.skipEnrichmentIfExists}`);
      
      // Step 1: Load existing places for enrichment optimization
      logger.info('Step 1: Loading existing places');
      const existingPlaces = await this.loadExistingPlaces();
      
      // Step 2: Fetch document from Google Docs
      logger.info('Step 2: Fetching document from Google Docs');
      const documentData = await googleDocsService.getDocumentAsMarkdown(documentId);
      
      logger.info(`Document fetched: "${documentData.title}"`);
      logger.info(`Document content length: ${documentData.content.length} characters`);
      logger.info(`Document sections: ${documentData.sections?.length || 0}`);
      
      if (!documentData.content || documentData.content.trim().length === 0) {
        throw new Error('Document content is empty');
      }

      // Step 3: Parse with OpenAI (Phase 1 of optimized flow)
      // LLM extracts ONLY what it can reliably determine from text:
      // - Place names, descriptions, notes, tags
      // - Categories from document headers
      // - Original text preservation
      logger.info('Step 3: Parsing document with OpenAI (extracting context from text)');
      const parsedData = await openaiService.parseDocument(documentData.content, documentData.sections);
      
      if (!parsedData.places || parsedData.places.length === 0) {
        throw new Error('No places found in document');
      }

      // Step 4: Generate unique IDs for places
      logger.info('Step 4: Generating unique IDs for places');
      const placesWithIds = parsedData.places.map(place => ({
        ...place,
        id: place.id || this.generatePlaceId(place.name)
      }));

      // Step 5: Enrich with Google Places API data and generate tags (Phases 2-3 of optimized flow)
      // Phase 2: Google Places API provides accurate business data:
      // - Address, phone, website, rating, review count, price level, hours, coordinates
      // Phase 3: Tag generation using original text + Google Places API types
      logger.info('Step 5: Enriching place data with Google Places API and generating comprehensive tags');
      
      let enrichedPlaces;
      try {
        enrichedPlaces = await webEnrichmentService.enrichPlaces(placesWithIds, existingPlaces);
      } catch (enrichError) {
        logger.warn('Google Places API enrichment failed, using original data:', enrichError);
        enrichedPlaces = placesWithIds.map(place => ({
          ...place,
          enrichmentStatus: {
            enriched: false,
            enrichedAt: new Date().toISOString(),
            enrichmentVersion: config.parsing.enrichmentVersion,
            reason: `Google Places API enrichment failed: ${enrichError.message}`
          }
        }));
      }

      // Step 6: Generate summary
      logger.info('Step 6: Generating summary');
      let summary;
      try {
        summary = await openaiService.generateSummary(enrichedPlaces);
      } catch (summaryError) {
        logger.warn('Summary generation failed:', summaryError);
        summary = `Vacation compound guide with ${enrichedPlaces.length} places`;
      }

      // Step 7: Build final output (Phase 4 of optimized flow)
      // Combines LLM-extracted context + Google Places API business data + comprehensive tags
      logger.info('Step 7: Building final output (merging context + business data + tags)');
      const finalOutput = {
        metadata: {
          generatedAt: new Date().toISOString(),
          totalPlaces: enrichedPlaces.length,
          sourceDocId: documentId,
          sourceDocTitle: documentData.title,
          parserVersion: '1.0.0',
          enrichmentVersion: config.parsing.enrichmentVersion,
          summary: summary,
          lastModified: documentData.lastModified,
          categories: [...new Set(enrichedPlaces.map(p => p.category).filter(Boolean))],
          enrichmentStats: {
            totalPlaces: enrichedPlaces.length,
            enrichedPlaces: enrichedPlaces.filter(p => p.enrichmentStatus?.enriched).length,
            skippedPlaces: enrichedPlaces.filter(p => p.enrichmentStatus?.enriched === false).length
          }
        },
        places: enrichedPlaces
      };

      // Step 8: Validate output
      logger.info('Step 8: Validating output');
      try {
        validateOutput(finalOutput);
        logger.info('Output validation successful');
      } catch (validationError) {
        logger.warn('Output validation failed:', validationError);
        // Continue with output but log the validation issue
      }

      // Step 9: Save to file
      logger.info('Step 9: Saving to file');
      await this.saveOutput(finalOutput);
      
      logger.info(`Parsing completed successfully! Generated ${finalOutput.places.length} places`);
      logger.info(`Categories found: ${finalOutput.metadata.categories.join(', ')}`);
      logger.info(`Enrichment stats: ${finalOutput.metadata.enrichmentStats.enrichedPlaces} enriched, ${finalOutput.metadata.enrichmentStats.skippedPlaces} skipped`);
      
      return finalOutput;

    } catch (error) {
      logger.error('Parsing failed:', error);
      throw error;
    }
  }

  async saveOutput(output) {
    try {
      await this.ensureOutputDirectory();
      
      const outputPath = path.join(this.outputDir, this.outputFilename);
      
      // Create a backup if file already exists
      if (fs.existsSync(outputPath)) {
        const backupPath = path.join(
          this.outputDir,
          `${path.basename(this.outputFilename, '.json')}-backup-${Date.now()}.json`
        );
        fs.copyFileSync(outputPath, backupPath);
        logger.info(`Created backup: ${backupPath}`);
      }

      // Save the new output
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
      logger.info(`Output saved to: ${outputPath}`);
      
      // Also save a timestamped version
      const timestampedPath = path.join(
        this.outputDir,
        `${path.basename(this.outputFilename, '.json')}-${Date.now()}.json`
      );
      fs.writeFileSync(timestampedPath, JSON.stringify(output, null, 2), 'utf8');
      logger.info(`Timestamped version saved to: ${timestampedPath}`);

      return outputPath;
    } catch (error) {
      logger.error('Failed to save output:', error);
      throw new Error(`Failed to save output: ${error.message}`);
    }
  }

  async getParsingStats() {
    try {
      const outputPath = path.join(this.outputDir, this.outputFilename);
      
      if (!fs.existsSync(outputPath)) {
        return {
          exists: false,
          lastParsed: null,
          totalPlaces: 0
        };
      }

      const stats = fs.statSync(outputPath);
      const content = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      
      return {
        exists: true,
        lastParsed: content.metadata?.generatedAt || stats.mtime.toISOString(),
        totalPlaces: content.places?.length || 0,
        sourceDocId: content.metadata?.sourceDocId,
        sourceDocTitle: content.metadata?.sourceDocTitle,
        categories: content.metadata?.categories || [],
        enrichmentStats: content.metadata?.enrichmentStats || {}
      };
    } catch (error) {
      logger.error('Failed to get parsing stats:', error);
      return {
        exists: false,
        lastParsed: null,
        totalPlaces: 0,
        error: error.message
      };
    }
  }
}

export const parser = new Parser(); 