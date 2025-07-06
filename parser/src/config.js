import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4.1',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.1,
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 4096
  },

  // Google API Configuration  
  google: {
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json',
    docId: process.env.GOOGLE_DOC_ID
  },

  // Google Places API Configuration
  googlePlaces: {
    apiKey: process.env.GOOGLE_PLACES_API_KEY,
  },

  // Geographic Configuration
  location: {
    state: process.env.LOCATION_STATE || 'Maine',
    country: process.env.LOCATION_COUNTRY || 'USA',
    region: process.env.LOCATION_REGION || 'Maine, USA',
    searchContext: process.env.LOCATION_SEARCH_CONTEXT || 'Maine, United States'
  },

  // Output Configuration
  output: {
    dir: process.env.OUTPUT_DIR || './output',
    filename: process.env.OUTPUT_FILE || 'compound-places.json'
  },

  // Parsing Configuration
  parsing: {
    fullRefresh: process.env.FULL_REFRESH === 'true' || false,
    enrichmentVersion: process.env.ENRICHMENT_VERSION || '2.0.0',
    skipEnrichmentIfExists: process.env.SKIP_ENRICHMENT_IF_EXISTS !== 'false', // defaults to true
    useWebEnrichment: process.env.USE_WEB_ENRICHMENT !== 'false' // defaults to true
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validate required configuration
const requiredEnvVars = ['OPENAI_API_KEY', 'GOOGLE_DOC_ID'];

// Add Google Places API key requirement if web enrichment is enabled
if (process.env.USE_WEB_ENRICHMENT !== 'false') {
  requiredEnvVars.push('GOOGLE_PLACES_API_KEY');
}

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
} 