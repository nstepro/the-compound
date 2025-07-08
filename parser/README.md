# The Compound Parser

A powerful document parsing system that extracts structured place data from Google Docs and enriches it with additional information using OpenAI.

## Features

### 🆕 New Features

- **🌐 Google Places API Enrichment**: Real place data from Google's official API instead of LLM-generated information
- **Original Text Preservation**: Maintains the original text from the document for each place in the `origText` field
- **Smart Enrichment**: Only enriches places that haven't been enriched before, dramatically improving performance
- **Category Tracking**: Preserves document structure by tracking which section/header each place was found under
- **Full Refresh Mode**: Optional parameter to force re-enrichment of all places
- **Geographic Context**: Configurable location context ensures enrichment finds the correct places (Maine, USA by default)

### Core Functionality

- **Google Docs Integration**: Fetches and parses documents directly from Google Docs
- **AI-Powered Parsing**: Uses OpenAI to intelligently extract and structure place information
- **🌐 Google Places API Enrichment**: Official Google API provides accurate business information
- **Comprehensive Logging**: Detailed logging and debugging information saved to logs directory
- **Validation**: Built-in schema validation ensures data quality

### Google Places API (New) Enrichment

The parser now uses **Google Places API (New)** to find accurate information about places:

1. **Places Search**: Searches Google Places database for each place name + location context
2. **Official Data**: Gets verified business information directly from Google
3. **Rich Information**: Extracts address, phone, website, hours, rating, price level, and coordinates
4. **Caching**: Caches results to avoid redundant API calls

This replaces the previous LLM-based enrichment that generated hallucinated data.

## Setup

### Google Places API Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select an existing one
3. **Enable the Places API (New)**:
   - Go to "APIs & Services" > "Library"
   - Search for "Places API (New)"
   - Click "Enable"
   - **⚠️ Important**: Make sure you enable the **NEW** Places API, not the legacy version
4. **Create an API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key
5. **⚠️ Secure your API key**:
   - Click the edit button on your API key
   - Under "API restrictions", select "Restrict key"
   - Choose "Places API (New)"
   - Add application restrictions (optional but recommended)

### Installation

```bash
npm install
```

Add your API key to your `.env` file:
```env
GOOGLE_PLACES_API_KEY=your_api_key_here
```

### Testing Your Setup

Before running the full parser, test your Google Places API (New) configuration:

```bash
npm run test-google-places
```

This will:
- Check if your API key is configured
- Test the Places Search functionality
- Test the Place Details functionality
- Verify that the new API is working correctly

If you see errors about "legacy API" or "REQUEST_DENIED", make sure you:
1. Enabled the **NEW** Places API, not the legacy version
2. Your API key has permissions for the Places API (New)
3. Your API key is properly configured in your `.env` file

## Configuration

### Environment Variables

```env
# Required
OPENAI_API_KEY=your_openai_api_key
GOOGLE_DOC_ID=your_google_doc_id

# Optional
OPENAI_MODEL=gpt-4.1
OPENAI_TEMPERATURE=0.1
OPENAI_MAX_TOKENS=4096
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
OUTPUT_DIR=./output
OUTPUT_FILE=compound-places.json
LOG_LEVEL=info

# Google Places API (Required for enrichment)
GOOGLE_PLACES_API_KEY=your_api_key   # Get from Google Cloud Console

# New: Enrichment Configuration
FULL_REFRESH=false                    # Set to 'true' to force re-enrichment of all places
ENRICHMENT_VERSION=2.0.0             # Version tracking for enrichment
SKIP_ENRICHMENT_IF_EXISTS=true       # Skip enrichment if place already enriched
USE_WEB_ENRICHMENT=true              # Use Google Places API enrichment (recommended)

# New: Geographic Configuration
LOCATION_STATE=Maine                  # State where places are located
LOCATION_COUNTRY=USA                  # Country where places are located
LOCATION_REGION=Maine, USA            # Region display name
LOCATION_SEARCH_CONTEXT=Maine, United States  # Search context for enrichment
```

### Geographic Configuration

The parser now includes geographic context to ensure accurate enrichment:

- **LOCATION_STATE**: The state where your places are located (default: "Maine")
- **LOCATION_COUNTRY**: The country where your places are located (default: "USA")
- **LOCATION_REGION**: Display name for the region (default: "Maine, USA")
- **LOCATION_SEARCH_CONTEXT**: Search context for enrichment (default: "Maine, United States")

This prevents the AI from confusing places with similar names in different locations. For example, if you have a "Main Street Pizza" in your document, the enrichment will specifically look for the Maine location, not one in California or New York.

## Data Structure

### Place Schema

Each place now includes these fields:

```json
{
  "id": "unique-place-id",
  "name": "Place Name",
  "type": "restaurant|activity|attraction|accommodation|shopping|other",
  "description": "Brief description",
  "origText": "Original text from document",
  "category": "Document Section Name",
  "enrichmentStatus": {
    "enriched": true,
    "enrichedAt": "2024-01-01T12:00:00Z",
    "enrichmentVersion": "1.0.0"
  },
  // ... other fields
}
```

### Output Structure

```json
{
  "metadata": {
    "generatedAt": "2024-01-01T12:00:00Z",
    "totalPlaces": 25,
    "categories": ["Restaurants", "Activities", "Attractions"],
    "locationContext": "Maine, USA",
    "enrichmentStats": {
      "totalPlaces": 25,
      "enrichedPlaces": 20,
      "skippedPlaces": 5
    }
  },
  "places": [...]
}
```

## Usage

### Basic Usage

```bash
npm run parse
```

### Full Refresh Mode

To force re-enrichment of all places:

```bash
FULL_REFRESH=true npm run parse
```

### Different Geographic Locations

To use the parser for a different location:

```bash
# For Vermont instead of Maine
LOCATION_STATE=Vermont LOCATION_REGION="Vermont, USA" LOCATION_SEARCH_CONTEXT="Vermont, United States" npm run parse

# For a specific city
LOCATION_REGION="Portland, Maine" LOCATION_SEARCH_CONTEXT="Portland, Maine, United States" npm run parse
```

### Web Enrichment Usage

Web enrichment is enabled by default. To control it:

```bash
# Use Google Places API enrichment (recommended, default)
USE_WEB_ENRICHMENT=true npm run parse

# Use deprecated LLM-based enrichment (not recommended)
USE_WEB_ENRICHMENT=false npm run parse
```

**Note**: LLM-based enrichment generates fake data and is deprecated. Always use web enrichment for accurate information.

### Performance Optimization

The parser now intelligently skips enrichment for places that:
- Have already been enriched (unless `FULL_REFRESH=true`)
- Already have complete information (address, phone, website)

This can reduce parsing time by 60-80% on subsequent runs.

## Document Structure

The parser now preserves the structure of your Google Doc:

```markdown
# Vacation Guide

## Restaurants & Food

**Blue Moon Cafe** - Great breakfast spot
Amazing pancakes and coffee...

## Activities

**Hiking Trail** - Beautiful mountain views
Perfect for morning hikes...
```

Each place will include:
- `origText`: The complete original text block
- `category`: The cleaned-up section name ("Restaurants & Food", "Activities")

## Logging

Enhanced logging includes:
- Document sections and structure
- Enrichment optimization decisions
- Category cleanup operations
- Performance statistics
- **Geographic context information**

Check the `logs/` directory for detailed parsing information.

## Performance Benefits

- **🌐 Official Data**: Google Places API provides verified, accurate business information
- **Faster subsequent runs**: Skip already-enriched places
- **Reduced API costs**: Only call OpenAI for new/changed places and data cleaning
- **Better data preservation**: Keep original text and document structure
- **Improved organization**: Automatic categorization from document headers
- **Accurate enrichment**: Geographic context prevents wrong location matches
- **Structured data**: Official Google Places data includes all key business information

## Migration from Previous Versions

Existing output files will be automatically migrated. The parser will:
1. Load existing places to check enrichment status
2. Skip enrichment for places that already have complete data
3. Add new fields (`origText`, `category`, `enrichmentStatus`) to new places
4. Apply geographic context to new enrichment searches

No manual migration is required. 