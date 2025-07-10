# Environment Variables Documentation

This document explains all the environment variables needed to run the application.

## Required Environment Variables

### Frontend Configuration
- `VITE_MAPBOX_ACCESS_TOKEN` - Mapbox access token for map functionality

### Google API Configuration
- `GOOGLE_PLACES_API_KEY` - API key for Google Places API
- `GOOGLE_DOC_ID` - ID of the Google Doc to parse

### Google Service Account Credentials (choose one method)

**Method 1: File path (for local development)**
```bash
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
```

**Method 2: Direct JSON (for Heroku - recommended)**
```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project",...}'
```

**Method 3: Base64 encoded (for Heroku - alternative)**
```bash
GOOGLE_APPLICATION_CREDENTIALS_BASE64=base64_encoded_json
```

### Google Cloud Storage Configuration
- `GOOGLE_CLOUD_STORAGE_BUCKET` - Name of the GCS bucket to store compound-places.json (default: compound-places-storage)
- `GOOGLE_CLOUD_STORAGE_FILE_NAME` - Name of the file in the bucket (default: compound-places.json)
- `GOOGLE_CLOUD_STORAGE_ENABLED` - Enable/disable Google Cloud Storage (default: true)

### OpenAI Configuration
- `OPENAI_API_KEY` - OpenAI API key for AI processing

### Security Configuration
- `JWT_SECRET` - Secret key for JWT token generation
- `ADMIN_PASSWORD_HASH` - Bcrypt hash of admin password
- `GUEST_PASSWORD_HASH` - Bcrypt hash of guest password (for accessing Lofty/Shady content)
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window in milliseconds (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX_ATTEMPTS` - Maximum login attempts per window (default: 5)

**Generate password hashes:**
```bash
# Interactive mode (prompts for password)
node utilities/generate-password.js admin
node utilities/generate-password.js guest

# Direct mode (password as argument)
node utilities/generate-password.js admin mySecurePassword123
node utilities/generate-password.js guest myGuestPassword456
```

## Optional Environment Variables

### OpenAI Settings
- `OPENAI_MODEL` - OpenAI model to use (default: gpt-4.1)
- `OPENAI_TEMPERATURE` - Temperature setting (default: 0.1)
- `OPENAI_MAX_TOKENS` - Maximum tokens (default: 4096)

### Server Configuration
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (default: info)

### Parser Configuration
- `OUTPUT_DIR` - Output directory (default: ./output)
- `OUTPUT_FILE` - Output filename (default: compound-places.json)
- `FULL_REFRESH` - Force re-enrichment of all places (default: false)

### Location Settings
- `LOCATION_STATE` - State for location context (default: Maine)
- `LOCATION_COUNTRY` - Country for location context (default: USA)
- `LOCATION_REGION` - Region for location context (default: Maine, USA)
- `LOCATION_SEARCH_CONTEXT` - Search context (default: Maine, United States)

## Local Development Setup

1. Create a `.env.local` file in the app directory
2. Copy the example below and fill in your actual values
3. Make sure `.env.local` is in your `.gitignore` (it already is)

### Example .env.local file:
```bash
# Copy this content to .env.local and fill in your actual values
# DO NOT commit .env or .env.local files - they contain sensitive data

# Frontend Configuration
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# Google API Configuration
GOOGLE_PLACES_API_KEY=your_places_api_key
GOOGLE_DOC_ID=your_google_doc_id
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random
ADMIN_PASSWORD_HASH=your_bcrypt_password_hash
GUEST_PASSWORD_HASH=your_bcrypt_guest_password_hash

# Rate Limiting Configuration (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_ATTEMPTS=5

# Google Cloud Storage Configuration (optional)
GOOGLE_CLOUD_STORAGE_BUCKET=compound-places-storage
GOOGLE_CLOUD_STORAGE_FILE_NAME=compound-places.json
GOOGLE_CLOUD_STORAGE_ENABLED=true
```

## Heroku Deployment

For Heroku deployment, use config vars instead of files:

```bash
# Set all required environment variables
heroku config:set \
  VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token \
  GOOGLE_PLACES_API_KEY=your_places_api_key \
  GOOGLE_DOC_ID=your_google_doc_id \
  GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}' \
  OPENAI_API_KEY=your_openai_api_key \
  JWT_SECRET=your-super-secret-jwt-key-change-this-in-production \
  ADMIN_PASSWORD_HASH=your_bcrypt_password_hash \
  GUEST_PASSWORD_HASH=your_bcrypt_guest_password_hash \
  RATE_LIMIT_WINDOW_MS=900000 \
  RATE_LIMIT_MAX_ATTEMPTS=5 \
  GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name \
  GOOGLE_CLOUD_STORAGE_FILE_NAME=compound-places.json \
  GOOGLE_CLOUD_STORAGE_ENABLED=true
```

## Security Notes

- **Never commit credential files** to version control
- Use strong, unique secrets for JWT_SECRET
- Store sensitive data in environment variables, not in code
- The app automatically detects environment-based credentials for cloud deployment
- Credentials are loaded in order: environment variables → files (fallback) 