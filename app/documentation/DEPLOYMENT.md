# Heroku Deployment Guide

## Prerequisites
- Heroku CLI installed and logged in
- Git repository initialized

## Deployment Steps

**Note:** Since your app is in the `app/` subdirectory, you have two deployment options:
- **Option A:** Use git subtree (recommended - simpler)
- **Option B:** Use monorepo buildpack (see Alternative section below)

### 1. Create a Heroku App
```bash
heroku create your-app-name
```

### 2. Configure Environment Variables
Set up required environment variables:
```bash
heroku config:set VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

### 3. Configure Build Settings
Heroku will automatically detect this as a Node.js app and:
- Install dependencies with `npm install`
- Build the app with `npm run build`
- Start the server with `npm run start`

### 4. Deploy (App is in subdirectory)
Since the app is in the `app/` subdirectory, use git subtree:

```bash
# First, commit your changes to the main repo
git add .
git commit -m "Prepare for Heroku deployment"

# Push only the app directory to Heroku
git subtree push --prefix app heroku main
```

**For subsequent deployments:**
```bash
git add .
git commit -m "Update app"
git subtree push --prefix app heroku main
```

### 5. Open Your App
```bash
heroku open
```

## Alternative: Monorepo Buildpack

If you prefer not to use git subtree, you can use the monorepo buildpack:

```bash
# Set the buildpack
heroku buildpacks:set https://github.com/lstoll/heroku-buildpack-monorepo

# Set the app path
heroku config:set APP_BASE=app

# Then deploy normally
git push heroku main
```

## Files Added/Modified for Heroku

1. **Procfile** - Tells Heroku how to start your app
2. **server.js** - Express server to serve static files
3. **package.json** - Added Express dependency and start script
4. **Fixed TypeScript errors** - Removed unused variables for clean build

## Environment Variables & Secrets

**❌ NEVER commit `.env` files to git!** They contain sensitive data.

### How Heroku Handles Environment Variables

Heroku uses **config vars** instead of `.env` files for environment variables:

#### Setting Config Vars (CLI)
```bash
# Set individual variables
heroku config:set VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# Set multiple variables
heroku config:set VITE_API_URL=https://api.example.com VITE_APP_NAME="Teddy Sheddy"

# View all config vars
heroku config

# Remove a config var
heroku config:unset VARIABLE_NAME
```

#### Setting Config Vars (Dashboard)
1. Go to your Heroku app dashboard
2. Click "Settings" tab
3. Click "Reveal Config Vars"
4. Add your variables there

### 🔐 Google Credentials Management

Your app uses Google APIs that require different types of credentials:

#### 1. Google Places API (Simple API Key)
```bash
# Set the Places API key
heroku config:set GOOGLE_PLACES_API_KEY=AIzaSyC...your_places_api_key_here
```

#### 2. Google Docs API (Service Account - JSON Credentials)

**Option A: Direct JSON (Recommended)**
```bash
# Copy your credentials.json content and set as environment variable
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project",...}'
```

**Option B: Base64 Encoded**
```bash
# Base64 encode your credentials.json file
cat credentials.json | base64

# Set the encoded credentials
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_BASE64=eyJ0eXBlIjoi...
```

#### 3. Required Google Environment Variables
Your app now supports flexible credential loading:

```bash
# Core API keys
heroku config:set GOOGLE_PLACES_API_KEY=your_places_api_key
heroku config:set GOOGLE_DOC_ID=your_google_doc_id

# Service account credentials (choose one method)
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
# OR
heroku config:set GOOGLE_APPLICATION_CREDENTIALS_BASE64=base64_encoded_json

# Google Cloud Storage configuration
heroku config:set GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
heroku config:set GOOGLE_CLOUD_STORAGE_FILE_NAME=compound-places.json
heroku config:set GOOGLE_CLOUD_STORAGE_ENABLED=true

# Other required variables
heroku config:set OPENAI_API_KEY=your_openai_api_key
heroku config:set JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
heroku config:set ADMIN_PASSWORD_HASH=your_bcrypt_password_hash
```

#### 4. Google Cloud Storage Setup

**Create a GCS Bucket:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to Cloud Storage > Buckets
3. Click "Create Bucket"
4. Choose a globally unique name (e.g., `your-app-compound-places-storage`)
5. Select a region close to your users
6. Choose "Standard" storage class
7. Enable "Uniform" access control
8. Click "Create"

**Set Bucket Permissions:**
1. In the bucket details, go to "Permissions"
2. Click "Grant Access"
3. Add your service account email (from your credentials JSON)
4. Assign the "Storage Object Admin" role
5. Click "Save"

**Update Environment Variables:**
```bash
heroku config:set GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
```

### 🚀 Complete Deployment Command

After setting up your credentials, deploy with:

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
  RATE_LIMIT_WINDOW_MS=900000 \
  RATE_LIMIT_MAX_ATTEMPTS=5 \
  GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name \
  GOOGLE_CLOUD_STORAGE_FILE_NAME=compound-places.json \
  GOOGLE_CLOUD_STORAGE_ENABLED=true

# Deploy
git add .
git commit -m "Update for Heroku deployment"
git subtree push --prefix app heroku main
```

### Current Environment Variables Needed

Your app currently uses:
- `VITE_MAPBOX_ACCESS_TOKEN` - Required for the map functionality
- `GOOGLE_PLACES_API_KEY` - Required for place enrichment
- `GOOGLE_DOC_ID` - Required for parsing Google Docs
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` - Service account credentials (JSON)
- `GOOGLE_APPLICATION_CREDENTIALS_BASE64` - Alternative: Base64 encoded credentials
- `OPENAI_API_KEY` - Required for AI processing
- `JWT_SECRET` - Required for admin authentication
- `ADMIN_PASSWORD_HASH` - Required for admin login
- `GUEST_PASSWORD_HASH` - Required for guest access to protected content
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window in milliseconds (optional, default: 900000)
- `RATE_LIMIT_MAX_ATTEMPTS` - Maximum login attempts per window (optional, default: 5)
- `GOOGLE_CLOUD_STORAGE_BUCKET` - Name of the GCS bucket to store compound-places.json
- `GOOGLE_CLOUD_STORAGE_FILE_NAME` - Name of the file in the bucket (default: compound-places.json)
- `GOOGLE_CLOUD_STORAGE_ENABLED` - Enable/disable Google Cloud Storage (default: true)

### Local Development
For local development, create a `.env.local` file (already in `.gitignore`):
```bash
# .env.local (DO NOT COMMIT THIS FILE)
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
GOOGLE_PLACES_API_KEY=your_places_api_key
GOOGLE_DOC_ID=your_google_doc_id
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_PASSWORD_HASH=your_bcrypt_password_hash
GUEST_PASSWORD_HASH=your_bcrypt_guest_password_hash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_ATTEMPTS=5
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_STORAGE_FILE_NAME=compound-places.json
GOOGLE_CLOUD_STORAGE_ENABLED=true
```

**Pro tip:** You can create a `.env.local.example` file (safe to commit) to document what environment variables are needed:
```bash
# .env.local.example
# Copy this file to .env.local and fill in your actual values
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
GOOGLE_PLACES_API_KEY=your_places_api_key
GOOGLE_DOC_ID=your_google_doc_id
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_PASSWORD_HASH=your_bcrypt_password_hash
GUEST_PASSWORD_HASH=your_bcrypt_guest_password_hash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_ATTEMPTS=5
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_STORAGE_FILE_NAME=compound-places.json
GOOGLE_CLOUD_STORAGE_ENABLED=true
```

## Notes
- The app serves static files from the `dist` directory
- Client-side routing is handled by serving `index.html` for all routes
- The places data is currently served from the static file in `public/`
- Since the app is in a subdirectory, use git subtree or monorepo buildpack for deployment
- Environment variables are managed through Heroku config vars, not `.env` files
- `.env` files are in `.gitignore` and should NEVER be committed to git
- When you're ready to connect the parser and use S3, you'll need to update the data fetching logic 