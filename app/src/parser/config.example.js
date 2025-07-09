// Example configuration for The Compound Parser
// Copy this to config.js and update with your values

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: 'your_openai_api_key_here',
    model: 'gpt-4.1',
    temperature: 0.1,
    maxTokens: 4096
  },

  // Google API Configuration  
  google: {
    credentialsPath: './credentials.json',
    docId: 'your_google_doc_id_here'
  },

  // Google Places API Configuration
  googlePlaces: {
    apiKey: 'your_google_places_api_key_here',    // Get from Google Cloud Console
  },

  // Geographic Configuration
  // This ensures enrichment finds the correct places in the right location
  location: {
    state: 'Maine',
    country: 'USA',
    region: 'Maine, USA',
    searchContext: 'Maine, United States'
  },

  // Output Configuration
  output: {
    dir: './output',
    filename: 'compound-places.json'
  },

  // Parsing Configuration
  parsing: {
    fullRefresh: false,                    // Set to true to force re-enrichment of all places
    enrichmentVersion: '2.0.0',           // Version tracking for enrichment
    skipEnrichmentIfExists: true,         // Skip enrichment if place already enriched
    useWebEnrichment: true                // Use web-based enrichment (recommended) vs LLM-based (deprecated)
  },

  // Logging Configuration
  logging: {
    level: 'info'
  }
}; 