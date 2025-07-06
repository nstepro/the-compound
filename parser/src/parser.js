import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config.js';
import { logger } from './logger.js';
import { googleDocsService } from './google-docs.js';
import { openaiService } from './openai-service.js';
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

  async parseDocument(docId = null) {
    try {
      const documentId = docId || config.google.docId;
      
      logger.info(`Starting parsing process for document: ${documentId}`);
      
      // Step 1: Fetch document from Google Docs
      logger.info('Step 1: Fetching document from Google Docs');
      const documentData = await googleDocsService.getDocumentAsMarkdown(documentId);
      
      logger.info(`Document fetched: "${documentData.title}"`);
      logger.debug(`Document content length: ${documentData.content.length} characters`);
      
      if (!documentData.content || documentData.content.trim().length === 0) {
        throw new Error('Document content is empty');
      }

      // Step 2: Parse with OpenAI
      logger.info('Step 2: Parsing document with OpenAI');
      const parsedData = await openaiService.parseDocument(documentData.content);
      
      if (!parsedData.places || parsedData.places.length === 0) {
        throw new Error('No places found in document');
      }

      // Step 3: Generate unique IDs for places
      logger.info('Step 3: Generating unique IDs for places');
      const placesWithIds = parsedData.places.map(place => ({
        ...place,
        id: place.id || this.generatePlaceId(place.name)
      }));

      // Step 4: Optionally enrich with additional data
      logger.info('Step 4: Enriching place data (optional)');
      let enrichedPlaces;
      try {
        enrichedPlaces = await openaiService.enrichPlaceData(placesWithIds);
      } catch (enrichError) {
        logger.warn('Enrichment failed, using original data:', enrichError);
        enrichedPlaces = placesWithIds;
      }

      // Step 5: Generate summary
      logger.info('Step 5: Generating summary');
      let summary;
      try {
        summary = await openaiService.generateSummary(enrichedPlaces);
      } catch (summaryError) {
        logger.warn('Summary generation failed:', summaryError);
        summary = `Vacation compound guide with ${enrichedPlaces.length} places`;
      }

      // Step 6: Build final output
      logger.info('Step 6: Building final output');
      const finalOutput = {
        metadata: {
          generatedAt: new Date().toISOString(),
          totalPlaces: enrichedPlaces.length,
          sourceDocId: documentId,
          sourceDocTitle: documentData.title,
          parserVersion: '1.0.0',
          summary: summary,
          lastModified: documentData.lastModified
        },
        places: enrichedPlaces
      };

      // Step 7: Validate output
      logger.info('Step 7: Validating output');
      try {
        validateOutput(finalOutput);
        logger.info('Output validation successful');
      } catch (validationError) {
        logger.warn('Output validation failed:', validationError);
        // Continue with output but log the validation issue
      }

      // Step 8: Save to file
      logger.info('Step 8: Saving to file');
      await this.saveOutput(finalOutput);
      
      logger.info(`Parsing completed successfully! Generated ${finalOutput.places.length} places`);
      
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
        sourceDocTitle: content.metadata?.sourceDocTitle
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