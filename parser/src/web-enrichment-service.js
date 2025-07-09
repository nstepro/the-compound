import { ChatOpenAI } from '@langchain/openai';
import axios from 'axios';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Web Enrichment Service
 * 
 * This service implements an optimized 4-phase enrichment flow:
 * 1. LLM Quick Pass (already completed) - Extracts context from document text:
 *    - Place name, description, notes
 *    - Category (from document headers)
 *    - Original text preservation
 * 2. Google Places API Enrichment (this service) - Gets real business data:
 *    - Address, phone, website
 *    - Rating, review count, price level
 *    - Hours, coordinates
 *    - Google Places types
 * 3. Tag Generation (this service) - Creates comprehensive tags using:
 *    - Original text context (from LLM)
 *    - Google Places API types
 *    - Combined intelligent tag generation
 * 4. Final JSON Construction - Merges all data sources
 * 
 * This approach ensures accurate business data while preserving valuable context
 * from the original document text and generating comprehensive search tags.
 */
class WebEnrichmentService {
  constructor() {
    this.model = null;
    this.searchCache = new Map();
    this.rateLimitDelay = 1000; // 1 second between API requests
  }

  initialize() {
    if (!config.googlePlaces?.apiKey) {
      throw new Error('Google Places API key is required for web enrichment. Please set GOOGLE_PLACES_API_KEY in your environment.');
    }

    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key is required for data validation');
    }

    this.model = new ChatOpenAI({
      apiKey: config.openai.apiKey,
      model: config.openai.model,
      temperature: 0.1,
      maxTokens: 1000,
    });

    logger.info('Web enrichment service initialized with Google Places API');
  }

  async searchGooglePlaces(query, maxResults = 5) {
    try {
      const apiKey = config.googlePlaces.apiKey;
      
      logger.debug(`Searching Google Places API (New) for: ${query}`);
      
      // Use the new Google Places API Text Search endpoint
      const response = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        {
          textQuery: query,
          pageSize: Math.min(maxResults, 20), // New API has max 20 per request
          languageCode: 'en',
          regionCode: 'US'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': [
              'places.id',
              'places.name', 
              'places.displayName',
              'places.formattedAddress',
              'places.location',
              'places.rating',
              'places.userRatingCount',
              'places.priceLevel',
              'places.types',
              'places.nationalPhoneNumber',
              'places.websiteUri',
              'places.regularOpeningHours.weekdayDescriptions'
            ].join(',')
          },
          timeout: 10000
        }
      );

      if (!response.data || !response.data.places) {
        logger.warn(`No places found in Google Places API response for: ${query}`);
        return [];
      }

      const results = response.data.places.map(place => ({
        place_id: place.id,
        name: place.displayName?.text || place.name,
        formatted_address: place.formattedAddress,
        rating: place.rating,
        price_level: place.priceLevel,
        types: place.types,
        geometry: place.location ? {
          location: {
            lat: place.location.latitude,
            lng: place.location.longitude
          }
        } : null,
        opening_hours: place.regularOpeningHours?.weekdayDescriptions,
        phone: place.nationalPhoneNumber,
        website: place.websiteUri,
        user_rating_count: place.userRatingCount,
        other_attributes: place
      }));

      logger.debug(`Found ${results.length} places for: ${query}`);
      return results;

    } catch (error) {
      if (error.response) {
        logger.error(`Google Places API search error for "${query}":`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        if (error.response.status === 403) {
          logger.error('API key may be invalid or Places API (New) not enabled. Please check your Google Cloud Console settings.');
        }
      } else {
        logger.warn(`Google Places search failed for "${query}":`, error.message);
      }
      return [];
    }
  }

  async getPlaceDetails(placeId) {
    try {
      const apiKey = config.googlePlaces.apiKey;
      
      logger.debug(`Getting place details for: ${placeId}`);
      
      // Use the new Google Places API Place Details endpoint
      const response = await axios.get(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': [
              'displayName',
              'formattedAddress',
              'nationalPhoneNumber',
              'internationalPhoneNumber',
              'websiteUri',
              'regularOpeningHours.weekdayDescriptions',
              'rating',
              'userRatingCount',
              'priceLevel',
              'location',
              'types',
              'googleMapsUri'
            ].join(',')
          },
          timeout: 10000
        }
      );

      if (!response.data) {
        logger.warn(`No data returned from Google Places Details API for: ${placeId}`);
        return {};
      }

      const place = response.data;
      const extractedData = {};

      // Map Google Places (New) data to our format
      if (place.formattedAddress) {
        extractedData.address = place.formattedAddress;
      }

      if (place.nationalPhoneNumber || place.internationalPhoneNumber) {
        extractedData.phone = place.nationalPhoneNumber || place.internationalPhoneNumber;
      }

      if (place.websiteUri) {
        extractedData.website = place.websiteUri;
      }

      if (place.regularOpeningHours?.weekdayDescriptions) {
        extractedData.rawHours = place.regularOpeningHours.weekdayDescriptions;
      }

      if (place.rating) {
        extractedData.rating = place.rating;
      }

      if (place.userRatingCount) {
        extractedData.reviewCount = place.userRatingCount;
      }

      if (place.priceLevel !== undefined) {
        // Convert Google's new price level format to $ symbols
        const priceMap = { 
          'PRICE_LEVEL_FREE': '',
          'PRICE_LEVEL_INEXPENSIVE': '$',
          'PRICE_LEVEL_MODERATE': '$$',
          'PRICE_LEVEL_EXPENSIVE': '$$$',
          'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
        };
        extractedData.priceRange = priceMap[place.priceLevel] || null;
      }

      if (place.types && place.types.length > 0) {
        // Store Google Places API types for tag generation (prefer detailed types over search types)
        extractedData.googlePlacesTypes = place.types;
        
        // Map Google types to our business types
        const typeMapping = {
          restaurant: 'restaurant',
          food: 'restaurant', 
          meal_takeaway: 'restaurant',
          cafe: 'restaurant',
          bar: 'restaurant',
          tourist_attraction: 'attraction',
          lodging: 'accommodation',
          store: 'shopping',
          shopping_mall: 'shopping'
        };
        
        for (const type of place.types) {
          if (typeMapping[type]) {
            extractedData.type = typeMapping[type];
            break;
          }
        }
      }

      if (place.location) {
        extractedData.coordinates = {
          lat: place.location.latitude,
          lng: place.location.longitude
        };
      }

      if (place.googleMapsUri) {
        extractedData.mapsLink = place.googleMapsUri;
      }

      logger.debug(`Extracted place details:`, extractedData);
      return extractedData;

    } catch (error) {
      if (error.response) {
        logger.error(`Google Places Details API error for ${placeId}:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        if (error.response.status === 403) {
          logger.error('API key may be invalid or Places API (New) not enabled. Please check your Google Cloud Console settings.');
        }
      } else {
        logger.warn(`Failed to get place details for ${placeId}:`, error.message);
      }
      return {};
    }
  }

  async enrichPlace(place) {
    try {
      if (!this.model) {
        this.initialize();
      }

      const placeName = place.name;
      const searchContext = config.location.searchContext;
      
      // Build a more comprehensive search query including description and category for better accuracy
      let searchQuery = `${placeName}`;
      
      // Add category if available (e.g., "restaurant", "attraction")
      if (place.category) {
        searchQuery += ` ${place.category}`;
      }
      
      // Add description if available (helps with disambiguation)
      if (place.description) {
        // Limit description to avoid overly long queries
        const descriptionWords = place.description.split(' ').slice(0, 5).join(' ');
        searchQuery += ` ${descriptionWords}`;
      }
      
      // Add location context
      searchQuery += ` ${searchContext}`;

      logger.info(`Enriching place: ${placeName} (query: "${searchQuery}")`);

      // Check cache first
      const cacheKey = `${placeName}:${searchContext}`;
      if (this.searchCache.has(cacheKey)) {
        logger.debug(`Using cached data for: ${placeName}`);
        return { ...place, ...this.searchCache.get(cacheKey) };
      }

      // This method enriches places that already have LLM-extracted context
      // (name, description, notes, tags, origText, category) with real business data
      // from Google Places API (address, phone, website, rating, hours, coordinates)

      // Step 1: Search Google Places for the place
      const searchResults = await this.searchGooglePlaces(searchQuery);
      
      if (searchResults.length === 0) {
        logger.warn(`No places found for: ${placeName}`);
        return {
          ...place,
          enrichmentStatus: {
            enriched: false,
            enrichedAt: new Date().toISOString(),
            enrichmentVersion: config.parsing.enrichmentVersion,
            reason: 'No places found in Google Places API'
          }
        };
      }

      // Step 2: Get detailed information for the best match
      const bestMatch = searchResults[0]; // Google Places API returns results by relevance
      let extractedData = {};

      // Use basic data from search result
      if (bestMatch.formatted_address) {
        extractedData.address = bestMatch.formatted_address;
      }
      if (bestMatch.rating) {
        extractedData.rating = bestMatch.rating;
      }
      
      // Store Google Places API types for tag generation
      if (bestMatch.types && bestMatch.types.length > 0) {
        extractedData.googlePlacesTypes = bestMatch.types;
      }
      if (bestMatch.price_level !== undefined) {
        // Handle both old format (numbers) and new format (strings)
        if (typeof bestMatch.price_level === 'string') {
          const priceMap = { 
            'PRICE_LEVEL_FREE': '',
            'PRICE_LEVEL_INEXPENSIVE': '$',
            'PRICE_LEVEL_MODERATE': '$$',
            'PRICE_LEVEL_EXPENSIVE': '$$$',
            'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
          };
          extractedData.priceRange = priceMap[bestMatch.price_level] || null;
        } else {
          // Legacy fallback for old format
          const priceMap = { 0: '$', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
          extractedData.priceRange = priceMap[bestMatch.price_level] || null;
        }
      }

      // Step 3: Get detailed place information
      try {
        const detailedData = await this.getPlaceDetails(bestMatch.place_id);
        
        // Merge detailed data, preferring detailed information over basic search data
        extractedData = { ...extractedData, ...detailedData };

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        
      } catch (error) {
        logger.warn(`Failed to get details for ${bestMatch.place_id}:`, error.message);
        // Continue with basic search data if details fail
      }

      // Step 4: Return enriched place data
      if (Object.keys(extractedData).length > 0) {
        // Cache the results
        this.searchCache.set(cacheKey, extractedData);
        
        logger.info(`Successfully enriched: ${placeName} with Google Places API`);
        
        // Preserve LLM-extracted context and add Google Places API business data
        return {
          ...place, // LLM-extracted: id, name, type, description, notes, tags, origText, category
          ...extractedData, // Google Places API: address, phone, website, rating, hours, priceRange, coordinates, etc.
          enrichmentStatus: {
            enriched: true,
            enrichedAt: new Date().toISOString(),
            enrichmentVersion: config.parsing.enrichmentVersion,
            source: 'Google Places API',
            place_id: bestMatch.place_id,
            confidence: searchResults.length > 0 ? 'high' : 'medium'
          }
        };
      }

      // Step 5: If no data was extracted, return original place
      logger.warn(`No data extracted for: ${placeName}`);
      return {
        ...place,
        enrichmentStatus: {
          enriched: false,
          enrichedAt: new Date().toISOString(),
          enrichmentVersion: config.parsing.enrichmentVersion,
          reason: 'No data available from Google Places API',
          searchResultsCount: searchResults.length
        }
      };

    } catch (error) {
      logger.error(`Enrichment failed for ${place.name}:`, error);
      return {
        ...place,
        enrichmentStatus: {
          enriched: false,
          enrichedAt: new Date().toISOString(),
          enrichmentVersion: config.parsing.enrichmentVersion,
          reason: `Error: ${error.message}`
        }
      };
    }
  }

  async generateTags(place) {
    try {
      if (!this.model) {
        this.initialize();
      }

      const prompt = `Generate relevant tags for this place based on the original text and Google Places API types.

**Place Information:**
- Name: ${place.name}
- Description: ${place.description || 'N/A'}
- Notes: ${place.notes || 'N/A'}
- Original text: ${place.origText || 'N/A'}
- Google Places API types: ${place.googlePlacesTypes ? place.googlePlacesTypes.join(', ') : 'N/A'}

**Instructions:**
- Generate 3-8 descriptive tags that would be useful for search and filtering
- Use information from BOTH the original text AND the Google Places API types
- Include tags for key features mentioned in the text (e.g., "cash only", "weekend busy", "harbor view")
- Include relevant category tags from the Google Places types (e.g., "restaurant", "tourist attraction")
- Include experience-based tags from the text (e.g., "breakfast", "family friendly", "quick bite", "kid friendly")
- Keep tags concise and search-friendly (lowercase, split multi-word tags with a space)
- Return only the tags as a JSON array

Example: ["restaurant", "breakfast", "harbor view", "weekend busy", "pizza", "cash only"]

Return only the JSON array of tags, nothing else.`;

      const response = await this.model.invoke([
        { role: 'system', content: 'You are a helpful assistant that generates search tags. Return only a JSON array of tags.' },
        { role: 'user', content: prompt }
      ]);

      try {
        const content = response.content.trim();
        
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\[(.*?)\]/s);
        if (jsonMatch) {
          const tagsArray = JSON.parse(jsonMatch[0]);
          if (Array.isArray(tagsArray)) {
            logger.debug(`Generated ${tagsArray.length} tags for ${place.name}:`, tagsArray);
            return tagsArray;
          }
        }
        
        // Fallback parsing
        const parsedTags = JSON.parse(content);
        if (Array.isArray(parsedTags)) {
          logger.debug(`Generated ${parsedTags.length} tags for ${place.name}:`, parsedTags);
          return parsedTags;
        }
      } catch (parseError) {
        logger.warn(`Failed to parse tags for ${place.name}:`, parseError);
      }

      // Fallback: generate basic tags from available data
      const fallbackTags = [];
      if (place.type) fallbackTags.push(place.type);
      if (place.googlePlacesTypes) {
        place.googlePlacesTypes.forEach(type => {
          const cleaned = type.replace(/_/g, '-').toLowerCase();
          if (!fallbackTags.includes(cleaned)) {
            fallbackTags.push(cleaned);
          }
        });
      }
      
      logger.debug(`Using fallback tags for ${place.name}:`, fallbackTags);
      return fallbackTags;

    } catch (error) {
      logger.warn(`Tag generation failed for ${place.name}:`, error);
      return [place.type || 'place'].filter(Boolean);
    }
  }

  async summarizeHours(rawHours) {
    try {
      if (!rawHours || rawHours.length === 0) {
        return null;
      }

      if (!this.model) {
        this.initialize();
      }

      const prompt = `Summarize these business hours into a user-friendly format.

**Raw Hours:**
${rawHours.join('\n')}

**Instructions:**
- If the hours are the same every day, use a simple format like "Every day from 8a to 5p"
- If hours vary by day, return an array of strings like ["Monday 8a-5p", "Tuesday Closed", "Wednesday 9a-6p"]
- Use "a" and "p" for AM/PM (e.g., "8a", "5p")
- Use "Closed" for days when the business is closed
- If hours are complex or have multiple periods per day, preserve the detail
- Return either a single string for uniform hours or a JSON array for varied hours

Examples:
- Uniform: "Every day from 9a to 6p"
- Varied: ["Monday 9a-6p", "Tuesday 9a-6p", "Wednesday 9a-6p", "Thursday 9a-6p", "Friday 9a-6p", "Saturday 10a-4p", "Sunday Closed"]

Return only the string or JSON array, nothing else.`;

      const response = await this.model.invoke([
        { role: 'system', content: 'You are a helpful assistant that summarizes business hours. Return only a string or JSON array.' },
        { role: 'user', content: prompt }
      ]);

      try {
        const content = response.content.trim();
        
        // Try to parse as JSON array first
        if (content.startsWith('[') && content.endsWith(']')) {
          const hoursArray = JSON.parse(content);
          if (Array.isArray(hoursArray)) {
            logger.debug(`Summarized hours as array with ${hoursArray.length} entries`);
            return hoursArray;
          }
        }
        
        // Otherwise, treat as a string (remove quotes if present)
        const hoursString = content.replace(/^["']|["']$/g, '');
        logger.debug(`Summarized hours as string: "${hoursString}"`);
        return hoursString;
        
      } catch (parseError) {
        logger.warn(`Failed to parse hours summary:`, parseError);
      }

      // Fallback: return the raw hours joined with newlines
      return rawHours.join('\n');

    } catch (error) {
      logger.warn(`Hours summarization failed:`, error);
      return rawHours ? rawHours.join('\n') : null;
    }
  }

  async enrichPlaces(places, existingPlaces = []) {
    try {
      logger.info(`Starting web-based enrichment for ${places.length} places`);
      
      // Create a map of existing places for quick lookup
      const existingPlacesMap = new Map();
      existingPlaces.forEach(place => {
        if (place.id && place.enrichmentStatus?.enriched) {
          existingPlacesMap.set(place.id, place);
        }
      });

      const enrichedPlaces = [];
      let skippedCount = 0;

      for (const place of places) {
        try {
          // Check if enrichment should be skipped
          if (config.parsing.skipEnrichmentIfExists && !config.parsing.fullRefresh) {
            const existingPlace = existingPlacesMap.get(place.id);
            if (existingPlace && existingPlace.enrichmentStatus?.enriched) {
              logger.debug(`Skipping enrichment for ${place.name} (already enriched)`);
              skippedCount++;
              
              // Generate tags if not already present
              if (!existingPlace.tags || existingPlace.tags.length === 0) {
                const tags = await this.generateTags(existingPlace);
                
                // Summarize hours if available and not already summarized
                let summarizedHours = existingPlace.hours;
                if (existingPlace.rawHours && !existingPlace.hours) {
                  summarizedHours = await this.summarizeHours(existingPlace.rawHours);
                }
                
                enrichedPlaces.push({
                  ...existingPlace,
                  tags: tags,
                  ...(summarizedHours && { hours: summarizedHours })
                });
              } else {
                enrichedPlaces.push(existingPlace);
              }
              continue;
            }
          }

          // Skip if place already has most information
          if (place.address && place.phone && place.website && !config.parsing.fullRefresh) {
            logger.debug(`Skipping enrichment for ${place.name} (already complete)`);
            skippedCount++;
            
            // Generate tags if not already present
            const tags = (!place.tags || place.tags.length === 0) ? await this.generateTags(place) : place.tags;
            
            // Summarize hours if available and not already summarized
            let summarizedHours = place.hours;
            if (place.rawHours && !place.hours) {
              summarizedHours = await this.summarizeHours(place.rawHours);
            }
            
            enrichedPlaces.push({
              ...place,
              tags: tags,
              ...(summarizedHours && { hours: summarizedHours }),
              enrichmentStatus: {
                enriched: true,
                enrichedAt: new Date().toISOString(),
                enrichmentVersion: config.parsing.enrichmentVersion,
                reason: 'Already had complete information'
              }
            });
            continue;
          }

          // Enrich the place with Google Places API data
          const enrichedPlace = await this.enrichPlace(place);
          
          // Generate tags using both original text and Google Places API types
          const tags = await this.generateTags(enrichedPlace);
          
          // Summarize hours if available
          let summarizedHours = null;
          if (enrichedPlace.rawHours) {
            summarizedHours = await this.summarizeHours(enrichedPlace.rawHours);
          }
          
          const finalPlace = {
            ...enrichedPlace,
            tags: tags,
            ...(summarizedHours && { hours: summarizedHours })
          };
          
          enrichedPlaces.push(finalPlace);

          // Rate limiting between places
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));

        } catch (error) {
          logger.warn(`Failed to enrich ${place.name}:`, error);
          
          // Generate tags even if enrichment fails
          const tags = await this.generateTags(place);
          
          // Summarize hours if available and not already summarized
          let summarizedHours = place.hours;
          if (place.rawHours && !place.hours) {
            summarizedHours = await this.summarizeHours(place.rawHours);
          }
          
          enrichedPlaces.push({
            ...place,
            tags: tags,
            ...(summarizedHours && { hours: summarizedHours }),
            enrichmentStatus: {
              enriched: false,
              enrichedAt: new Date().toISOString(),
              enrichmentVersion: config.parsing.enrichmentVersion,
              reason: `Error: ${error.message}`
            }
          });
        }
      }

      logger.info(`Web enrichment completed for ${enrichedPlaces.length} places (${skippedCount} skipped)`);
      return enrichedPlaces;

    } catch (error) {
      logger.error('Web enrichment failed:', error);
      throw new Error(`Web enrichment failed: ${error.message}`);
    }
  }
}

export const webEnrichmentService = new WebEnrichmentService(); 