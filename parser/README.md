# Compound Parser

A Node.js service that converts unstructured Google Docs into structured JSON data for vacation compound guides.

## Features

- **Google Docs Integration**: Fetches content directly from Google Docs
- **AI-Powered Parsing**: Uses OpenAI GPT models to extract structured data
- **Schema Validation**: Ensures consistent output format
- **Data Enrichment**: Optionally enhances places with additional information
- **Comprehensive Logging**: Detailed logging for debugging and monitoring
- **Backup System**: Automatically creates backups of previous outputs

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the parser directory:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_DOC_ID=your_google_doc_id_here
   GOOGLE_APPLICATION_CREDENTIALS=./path/to/credentials.json
   ```

3. **Set up Google API credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Enable Google Docs API and Google Drive API
   - Create a service account and download the JSON credentials
   - Place the credentials file in your parser directory

4. **Run the parser**:
   ```bash
   npm start
   ```

## Usage

### Commands

- `npm start` - Parse the configured Google Doc
- `npm start parse [docId]` - Parse a specific document
- `npm start stats` - Show parsing statistics
- `npm start help` - Show help information
- `npm run debug` - Test parsing with example input (debug mode)
- `npm run clean-logs` - Clean up old debug log files

### Examples

```bash
# Parse the default document
npm start

# Parse a specific document
npm start parse 1a2b3c4d5e6f7g8h9i0j

# Check parsing stats
npm start stats

# Show help
npm start help

# Debug parsing issues
npm run debug

# Clean up debug logs
npm run clean-logs
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | - | OpenAI API key |
| `GOOGLE_DOC_ID` | ✅ | - | Google Doc ID to parse |
| `GOOGLE_APPLICATION_CREDENTIALS` | ✅ | `./credentials.json` | Path to Google API credentials |
| `OUTPUT_DIR` | ❌ | `./output` | Output directory |
| `OUTPUT_FILE` | ❌ | `compound-places.json` | Output filename |
| `LOG_LEVEL` | ❌ | `info` | Logging level |
| `OPENAI_MODEL` | ❌ | `gpt-4-turbo-preview` | OpenAI model to use |
| `OPENAI_TEMPERATURE` | ❌ | `0.1` | OpenAI temperature |
| `OPENAI_MAX_TOKENS` | ❌ | `8000` | OpenAI max tokens (set to 0 for unlimited) |

### Google Doc Format

The parser works best with Google Docs that follow this structure:

```markdown
# Vacation Compound Guide

## Restaurants & Food

**Blue Moon Cafe** - https://bluemooncafe.com
Amazing breakfast spot on the harbor! Try the blueberry pancakes.

**Tony's Pizza** - 321 Oak Avenue
Quick pizza place, cash only. (555) 456-7890

## Activities

**Sunset Ridge Trail**
Moderate 3-mile hike with stunning views.
```

## Output Format

The parser generates JSON with this structure:

```json
{
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00Z",
    "totalPlaces": 5,
    "sourceDocId": "1a2b3c4d5e6f7g8h9i0j",
    "sourceDocTitle": "Vacation Compound Guide",
    "parserVersion": "1.0.0",
    "summary": "Brief summary of the guide"
  },
  "places": [
    {
      "id": "blue-moon-cafe",
      "name": "Blue Moon Cafe",
      "type": "restaurant",
      "description": "Amazing breakfast spot on the harbor",
      "url": "https://bluemooncafe.com",
      "address": "123 Harbor Street",
      "phone": "(555) 123-4567",
      "priceRange": "$$",
      "rating": 4.5,
      "hours": "6:00 AM - 2:00 PM",
      "notes": "Try the blueberry pancakes!",
      "tags": ["breakfast", "harbor", "local-favorite"],
      "coordinates": {
        "lat": 34.0522,
        "lng": -118.2437
      }
    }
  ]
}
```

## Project Structure

```
parser/
├── src/
│   ├── index.js           # Main entry point
│   ├── parser.js          # Core parser orchestration
│   ├── config.js          # Configuration management
│   ├── logger.js          # Logging setup
│   ├── google-docs.js     # Google Docs integration
│   ├── openai-service.js  # OpenAI/LangChain service
│   ├── prompts.js         # Prompt templates
│   └── schema.js          # Data schema and validation
├── examples/
│   ├── example-input.md   # Sample input format
│   └── example-output.json # Sample output format
├── output/                # Generated output files
├── package.json
├── config.example.js      # Configuration example
└── README.md
```

## Error Handling

The parser includes comprehensive error handling:

- **Authentication errors**: Clear messages for API key issues
- **Network errors**: Retry logic for transient failures
- **Parsing errors**: Detailed error messages with context
- **Validation errors**: Schema validation with specific field errors
- **File system errors**: Proper error handling for file operations

## Logging

Logs are written to:
- **Console**: Colored, formatted output for development
- **File**: JSON-formatted logs in `parser.log`
- **Debug Files**: Detailed parsing logs in `./logs/` folder

Log levels: `error`, `warn`, `info`, `debug`

### Debug Files (saved to `./logs/`)
- `[timestamp]-raw-document.md` - Original document content from Google Docs
- `[timestamp]-input-prompt.txt` - Complete prompt sent to OpenAI
- `[timestamp]-ai-response.txt` - Raw response from OpenAI
- `[timestamp]-parsed-json.json` - Parsed JSON output
- `[timestamp]-places-summary.txt` - Summary of found places
- `[timestamp]-token-usage.txt` - Token usage statistics

## Development

### Running in Development

```bash
# Watch mode (restarts on file changes)
npm run dev

# Debug mode
LOG_LEVEL=debug npm start
```

### Adding New Features

1. **New data fields**: Update `schema.js` and `prompts.js`
2. **New enrichment sources**: Extend `openai-service.js`
3. **New output formats**: Modify `parser.js` save methods

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Check your `.env` file
   - Ensure all required variables are set

2. **"Authentication failed"**
   - Verify your Google API credentials
   - Check that APIs are enabled in Google Cloud Console

3. **"No places found in document"**
   - Check document format and content
   - Verify document ID is correct

4. **"Parsing failed"**
   - Check OpenAI API key and quota
   - Review document content for parsing issues

5. **"Only finding 10 places when document has more"**
   - Increase `OPENAI_MAX_TOKENS` (try 8000 or 0 for unlimited)
   - Run with `LOG_LEVEL=debug` to see token usage
   - Check if document is very large (>100KB)
   - Try `npm run debug` to test parsing with example input
   - Check `./logs/` folder for detailed debug files:
     - `input-prompt.txt` - see what's being sent to AI
     - `ai-response.txt` - see what AI actually returned
     - `places-summary.txt` - see what places were found

### Debug Mode

Enable debug logging for detailed information:

```bash
LOG_LEVEL=debug npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 