# Google Cloud Storage Migration Guide

## Overview

The app has been updated to use Google Cloud Storage (GCS) for storing and retrieving the `compound-places.json` file instead of relying on local file storage. This provides several benefits:

- **Persistent storage**: Data survives app restarts and deployments
- **Scalability**: No local disk space limitations
- **Global access**: Same data accessible from multiple instances
- **Backup**: Automatic versioning and backup capabilities
- **Cost-effective**: Pay only for what you use

## Architecture Changes

### Before (Local File Storage)
1. Parser generates `compound-places.json` → saves to local `output/` directory
2. Server copies file to `public/` directory after parsing
3. Frontend fetches `/compound-places.json` from static file server

### After (Google Cloud Storage)
1. Parser generates `compound-places.json` → uploads to Google Cloud Storage
2. Server serves data from GCS via `/api/compound-places` endpoint
3. Frontend fetches `/api/compound-places` from API endpoint

## Setup Instructions

### 1. Create Google Cloud Storage Bucket

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Cloud Storage** > **Buckets**
3. Click **"Create Bucket"**
4. Configuration:
   - **Name**: Choose globally unique name (e.g., `your-app-compound-places-storage`)
   - **Location**: Select region close to your users
   - **Storage Class**: Standard
   - **Access Control**: Uniform
5. Click **"Create"**

### 2. Set Bucket Permissions

1. In the bucket details, go to **"Permissions"**
2. Click **"Grant Access"**
3. Add your service account email (from your `credentials.json`)
4. Assign the **"Storage Object Admin"** role
5. Click **"Save"**

### 3. Update Environment Variables

Add these new environment variables to your configuration:

```bash
# Required
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name

# Optional (with defaults)
GOOGLE_CLOUD_STORAGE_FILE_NAME=compound-places.json
GOOGLE_CLOUD_STORAGE_ENABLED=true
```

### 4. Local Development Setup

Update your `.env.local` file:

```bash
# Existing variables...
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
GOOGLE_PLACES_API_KEY=your_places_api_key
GOOGLE_DOC_ID=your_google_doc_id
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your-super-secret-jwt-key
ADMIN_PASSWORD_HASH=your_bcrypt_password_hash

# New Google Cloud Storage variables
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_STORAGE_FILE_NAME=compound-places.json
GOOGLE_CLOUD_STORAGE_ENABLED=true
```

### 5. Heroku Deployment

Set the environment variables on Heroku:

```bash
heroku config:set \
  GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name \
  GOOGLE_CLOUD_STORAGE_FILE_NAME=compound-places.json \
  GOOGLE_CLOUD_STORAGE_ENABLED=true
```

## New Features

### Automatic Backup

- Before uploading a new version, the system creates a timestamped backup
- Backups are stored in the same bucket with naming pattern: `compound-places-backup-{timestamp}.json`
- Also creates timestamped versions: `compound-places-{timestamp}.json`

### Fallback Support

- The system includes fallback to local file storage if GCS is disabled
- Set `GOOGLE_CLOUD_STORAGE_ENABLED=false` to use local storage
- Useful for development or if you want to revert temporarily

### Enhanced Error Handling

- Graceful handling of GCS connection issues
- Detailed logging for debugging
- Fallback error messages for users

## API Changes

### New Endpoint

**`GET /api/compound-places`**
- Serves the places data from Google Cloud Storage
- Replaces the static file serving approach
- Returns the same JSON structure as before

### Updated Admin Download

**`GET /api/admin/download-output`**
- Now downloads from Google Cloud Storage when enabled
- Maintains the same download functionality
- Automatically handles authentication

## File Structure Changes

### New Files Added

```
app/src/parser/
├── google-cloud-storage.js    # New GCS service
└── ...existing files...
```

### Modified Files

```
app/
├── package.json               # Added @google-cloud/storage dependency
├── server.js                  # Added GCS endpoints
├── DEPLOYMENT.md             # Updated deployment instructions
├── ENVIRONMENT_VARIABLES.md  # Added GCS variables
└── src/
    ├── components/
    │   └── PlacesList.tsx    # Updated to use API endpoint
    └── parser/
        ├── config.js         # Added GCS configuration
        └── parser.js         # Updated to use GCS
```

## Migration Steps

### For Existing Installations

1. **Update dependencies**:
   ```bash
   npm install
   ```

2. **Set up Google Cloud Storage bucket** (see setup instructions above)

3. **Update environment variables** (see setup instructions above)

4. **Test the migration**:
   ```bash
   npm run parse  # This should now upload to GCS
   npm run start  # Frontend should load data from GCS
   ```

5. **Verify functionality**:
   - Check that parsing uploads to GCS
   - Verify frontend loads data correctly
   - Test admin download functionality

### For New Installations

Follow the standard setup process, but make sure to:
1. Create the GCS bucket before first use
2. Set all required environment variables
3. Ensure service account has proper permissions

## Troubleshooting

### Common Issues

1. **Bucket not found error**:
   - Check bucket name spelling
   - Verify bucket exists in correct project
   - Ensure GOOGLE_CLOUD_STORAGE_BUCKET is set correctly

2. **Permission denied error**:
   - Verify service account has "Storage Object Admin" role
   - Check that service account email is correct
   - Ensure credentials are properly configured

3. **File not found error**:
   - Run the parser at least once to create the initial file
   - Check that GOOGLE_CLOUD_STORAGE_FILE_NAME matches expected filename

### Debug Mode

Enable debug logging to see detailed GCS operations:

```bash
LOG_LEVEL=debug npm run parse
```

### Fallback Mode

If GCS is having issues, you can temporarily disable it:

```bash
GOOGLE_CLOUD_STORAGE_ENABLED=false npm run parse
```

## Security Considerations

- **Service Account**: Use dedicated service account with minimal permissions
- **Bucket Access**: Use uniform access control for better security
- **Environment Variables**: Never commit credentials to version control
- **Regional Storage**: Consider data residency requirements

## Cost Optimization

- **Storage Class**: Use "Standard" for frequently accessed data
- **Lifecycle Rules**: Consider setting up lifecycle rules for old backups
- **Monitoring**: Set up billing alerts to monitor usage

## Support

For issues related to:
- **Google Cloud Storage**: Check [GCS documentation](https://cloud.google.com/storage/docs)
- **Service Accounts**: Review [IAM documentation](https://cloud.google.com/iam/docs/service-accounts)
- **App-specific issues**: Check the application logs and environment variables 