import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { logger } from './logger.js';
import { generateParsingPrompt, generateEnrichmentPrompt } from './prompts.js';
import { PlaceSchema, validatePlace } from './schema.js';

class OpenAIService {
  constructor() {
    this.model = null;
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    const logsDir = './logs';
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      logger.info(`Created logs directory: ${logsDir}`);
    }
  }

  saveToLogs(filename, content) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logPath = path.join('./logs', `${timestamp}-${filename}`);
      fs.writeFileSync(logPath, content, 'utf8');
      logger.info(`Saved log: ${logPath}`);
      return logPath;
    } catch (error) {
      logger.error('Failed to save log:', error);
    }
  }

  initialize() {
    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const modelConfig = {
      apiKey: config.openai.apiKey,
      model: config.openai.model,
      temperature: config.openai.temperature,
    };
    
    // Only set maxTokens if it's not 0 (0 means unlimited)
    if (config.openai.maxTokens > 0) {
      modelConfig.maxTokens = config.openai.maxTokens;
    }
    
    this.model = new ChatOpenAI(modelConfig);

    logger.info('OpenAI service initialized');
  }

  async parseDocument(documentContent) {
    try {
      if (!this.model) {
        this.initialize();
      }

      logger.info('Starting document parsing with OpenAI');
      logger.info(`Document content length: ${documentContent.length} characters`);
      
      const prompt = generateParsingPrompt(documentContent);
      logger.info(`Generated prompt length: ${prompt.length} characters`);
      
      // Save the input prompt to logs
      const promptLogPath = this.saveToLogs('input-prompt.txt', prompt);
      logger.info(`Input prompt saved to: ${promptLogPath}`);
      
      // Save the raw document content too
      const docLogPath = this.saveToLogs('raw-document.md', documentContent);
      logger.info(`Raw document saved to: ${docLogPath}`);
      
      const messages = [
        new SystemMessage("You are an expert data parser. Return only valid JSON."),
        new HumanMessage(prompt)
      ];

      const response = await this.model.invoke(messages);
      
      logger.info('Received response from OpenAI');
      
      // Save the raw AI response to logs
      const responseLogPath = this.saveToLogs('ai-response.txt', response.content);
      logger.info(`AI response saved to: ${responseLogPath}`);
      
      // Log token usage if available
      if (response.usage) {
        logger.info('Token usage:', {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens
        });
        
        // Save token usage to logs
        const usageInfo = `Token Usage:
Prompt tokens: ${response.usage.prompt_tokens}
Completion tokens: ${response.usage.completion_tokens}
Total tokens: ${response.usage.total_tokens}
Model: ${config.openai.model}
Max tokens configured: ${config.openai.maxTokens}`;
        this.saveToLogs('token-usage.txt', usageInfo);
      }
      
      // Parse the JSON response
      let parsedData;
      try {
        // Clean the response content to extract JSON
        const content = response.content.trim();
        
        // Try to extract JSON from code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.match(/```\s*([\s\S]*?)\s*```/) ||
                         [null, content];
        
        const jsonString = jsonMatch[1] || content;
        parsedData = JSON.parse(jsonString);
        
                logger.info(`Successfully parsed ${parsedData.places?.length || 0} places`);
        
        // Save the parsed JSON to logs
        const parsedJsonLogPath = this.saveToLogs('parsed-json.json', JSON.stringify(parsedData, null, 2));
        logger.info(`Parsed JSON saved to: ${parsedJsonLogPath}`);
        
        // Log place names for debugging
        if (parsedData.places && parsedData.places.length > 0) {
          logger.debug('Parsed places:', parsedData.places.map(p => p.name));
          
          // Save place summary to logs
          const placeSummary = `Places Found (${parsedData.places.length} total):
${parsedData.places.map((p, i) => `${i + 1}. ${p.name} (${p.type})`).join('\n')}`;
          this.saveToLogs('places-summary.txt', placeSummary);
        }
        
      } catch (parseError) {
        logger.error('Failed to parse JSON response:', parseError);
        logger.debug('Raw response:', response.content);
        throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
      }

      // Validate the parsed data
      if (!parsedData.places || !Array.isArray(parsedData.places)) {
        throw new Error('Invalid response format: missing places array');
      }

      // Validate each place against the schema
      const validatedPlaces = [];
      for (const place of parsedData.places) {
        try {
          const validatedPlace = validatePlace(place);
          validatedPlaces.push(validatedPlace);
        } catch (validationError) {
          logger.warn(`Place validation failed:`, {
            place: place.name || 'Unknown',
            error: validationError.message
          });
          // Still include the place but log the validation issue
          validatedPlaces.push(place);
        }
      }

      return {
        places: validatedPlaces,
        metadata: {
          totalPlaces: validatedPlaces.length,
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('OpenAI parsing failed:', error);
      throw new Error(`Parsing failed: ${error.message}`);
    }
  }

  async enrichPlaceData(places) {
    try {
      if (!this.model) {
        this.initialize();
      }

      logger.info(`Starting enrichment for ${places.length} places`);
      
      const enrichedPlaces = [];
      
      // Process places in batches to avoid rate limits
      const batchSize = 3;
      for (let i = 0; i < places.length; i += batchSize) {
        const batch = places.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (place) => {
          try {
            // Skip if place already has most information
            if (place.address && place.phone && place.url) {
              logger.debug(`Skipping enrichment for ${place.name} (already complete)`);
              return place;
            }

            const prompt = generateEnrichmentPrompt(place);
            
            const messages = [
              new SystemMessage("You are a research assistant. Find and return factual information about places."),
              new HumanMessage(prompt)
            ];

            const response = await this.model.invoke(messages);
            
            let enrichedData;
            try {
              const content = response.content.trim();
              const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                               content.match(/```\s*([\s\S]*?)\s*```/) ||
                               [null, content];
              
              const jsonString = jsonMatch[1] || content;
              enrichedData = JSON.parse(jsonString);
              
              logger.debug(`Enriched place: ${place.name}`);
              return { ...place, ...enrichedData };
              
            } catch (parseError) {
              logger.warn(`Failed to parse enrichment for ${place.name}:`, parseError);
              return place; // Return original place if enrichment fails
            }
            
          } catch (error) {
            logger.warn(`Enrichment failed for ${place.name}:`, error);
            return place; // Return original place if enrichment fails
          }
        });

        const batchResults = await Promise.all(batchPromises);
        enrichedPlaces.push(...batchResults);
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < places.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`Enrichment completed for ${enrichedPlaces.length} places`);
      return enrichedPlaces;

    } catch (error) {
      logger.error('Enrichment failed:', error);
      throw new Error(`Enrichment failed: ${error.message}`);
    }
  }

  async generateSummary(places) {
    try {
      if (!this.model) {
        this.initialize();
      }

      const prompt = `Generate a brief summary of this vacation compound guide with ${places.length} places. 
      
      Include:
      - Total number of places by category
      - Highlighted recommendations
      - Any notable patterns or themes
      
      Places data:
      ${JSON.stringify(places.map(p => ({ name: p.name, type: p.type, description: p.description })), null, 2)}
      
      Return a concise summary in 2-3 sentences.`;

      const messages = [
        new SystemMessage("You are a travel guide writer. Create engaging summaries."),
        new HumanMessage(prompt)
      ];

      const response = await this.model.invoke(messages);
      
      logger.info('Generated summary');
      return response.content.trim();

    } catch (error) {
      logger.error('Summary generation failed:', error);
      return `Vacation compound guide with ${places.length} places including restaurants, activities, and attractions.`;
    }
  }
}

export const openaiService = new OpenAIService(); 