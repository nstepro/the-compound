export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key_here',
    model: 'gpt-4-turbo-preview',
    temperature: 0.1,
    maxTokens: 4000
  },

  // Google API Configuration  
  google: {
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json',
    docId: process.env.GOOGLE_DOC_ID || 'your_google_doc_id_here'
  },

  // Output Configuration
  output: {
    dir: process.env.OUTPUT_DIR || './output',
    filename: process.env.OUTPUT_FILE || 'compound-places.json'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
}; 