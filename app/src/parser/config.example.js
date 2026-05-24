// Example configuration for The Compound Parser
// Copy values into .env — see config.js and documentation/ENVIRONMENT_VARIABLES.md

module.exports = {
  config: {
    openai: {
      apiKey: 'your_openai_api_key_here',
      model: 'gpt-4.1',
      temperature: 0.1,
      maxTokens: 4096,
    },

    google: {
      credentialsPath: './credentials.json',
      docId: 'your_google_doc_id_here',
    },

    googlePlaces: {
      apiKey: 'your_google_places_api_key_here',
    },

    googleCloudStorage: {
      bucketName: 'compound-places-storage',
      fileName: 'compound-places.json',
      enabled: true,
    },

    location: {
      state: 'Maine',
      country: 'USA',
      region: 'Maine, USA',
      searchContext: 'Maine, United States',
    },

    output: {
      dir: './output',
      filename: 'compound-places.json',
    },

    parsing: {
      fullRefresh: false,
      enrichmentVersion: '2.0.0',
      skipEnrichmentIfExists: true,
      useWebEnrichment: true,
    },

    logging: {
      level: 'info',
    },
  },
};
