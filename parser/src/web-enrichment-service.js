import { ChatOpenAI } from '@langchain/openai';
import axios from 'axios';
import { config } from './config.js';
import { logger } from './logger.js';

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
      const searchQuery = encodeURIComponent(query);
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${apiKey}`;
      
      logger.debug(`Searching Google Places API for: ${query}`);
      
      const response = await axios.get(searchUrl, {
        timeout: 10000
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        logger.warn(`Google Places API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
        return [];
      }

      const results = response.data.results.slice(0, maxResults).map(place => ({
        place_id: place.place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        rating: place.rating,
        price_level: place.price_level,
        types: place.types,
        geometry: place.geometry,
        opening_hours: place.opening_hours,
        photos: place.photos
      }));

      logger.debug(`Found ${results.length} places for: ${query}`);
      return results;

    } catch (error) {
      logger.warn(`Google Places search failed for "${query}":`, error.message);
      return [];
    }
  }

  async getPlaceDetails(placeId) {
    try {
      const apiKey = config.googlePlaces.apiKey;
      const fields = [
        'name',
        'formatted_address',
        'formatted_phone_number',
        'international_phone_number',
        'website',
        'opening_hours',
        'rating',
        'price_level',
        'geometry',
        'types',
        'url',
        'reviews'
      ].join(',');
      
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
      
      logger.debug(`Getting place details for: ${placeId}`);
      
      const response = await axios.get(detailsUrl, {
        timeout: 10000
      });

      if (response.data.status !== 'OK') {
        logger.warn(`Google Places Details API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
        return {};
      }

      const place = response.data.result;
      const extractedData = {};

      // Map Google Places data to our format
      if (place.formatted_address) {
        extractedData.address = place.formatted_address;
      }

      if (place.formatted_phone_number || place.international_phone_number) {
        extractedData.phone = place.formatted_phone_number || place.international_phone_number;
      }

      if (place.website) {
        extractedData.website = place.website;
      }

      if (place.opening_hours?.weekday_text) {
        extractedData.hours = place.opening_hours.weekday_text.join('\n');
      }

      if (place.rating) {
        extractedData.rating = place.rating;
      }

      if (place.price_level !== undefined) {
        // Convert Google's 0-4 price level to $ symbols
        const priceMap = { 0: '$', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
        extractedData.priceRange = priceMap[place.price_level] || null;
      }

      if (place.types && place.types.length > 0) {
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

      if (place.geometry?.location) {
        extractedData.coordinates = {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        };
      }

      if (place.url) {
        extractedData.mapsLink = place.url;
      }

      logger.debug(`Extracted place details:`, extractedData);
      return extractedData;

    } catch (error) {
      logger.warn(`Failed to get place details for ${placeId}:`, error.message);
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
      const searchQuery = `${placeName} ${searchContext}`;

      logger.info(`Enriching place: ${placeName} (${searchContext})`);

      // Check cache first
      const cacheKey = `${placeName}:${searchContext}`;
      if (this.searchCache.has(cacheKey)) {
        logger.debug(`Using cached data for: ${placeName}`);
        return { ...place, ...this.searchCache.get(cacheKey) };
      }

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
      if (bestMatch.price_level !== undefined) {
        const priceMap = { 0: '$', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
        extractedData.priceRange = priceMap[bestMatch.price_level] || null;
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
        
        return {
          ...place,
          ...extractedData,
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
              enrichedPlaces.push(existingPlace);
              continue;
            }
          }

          // Skip if place already has most information
          if (place.address && place.phone && place.website && !config.parsing.fullRefresh) {
            logger.debug(`Skipping enrichment for ${place.name} (already complete)`);
            skippedCount++;
            enrichedPlaces.push({
              ...place,
              enrichmentStatus: {
                enriched: true,
                enrichedAt: new Date().toISOString(),
                enrichmentVersion: config.parsing.enrichmentVersion,
                reason: 'Already had complete information'
              }
            });
            continue;
          }

          // Enrich the place
          const enrichedPlace = await this.enrichPlace(place);
          enrichedPlaces.push(enrichedPlace);

          // Rate limiting between places
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));

        } catch (error) {
          logger.warn(`Failed to enrich ${place.name}:`, error);
          enrichedPlaces.push({
            ...place,
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