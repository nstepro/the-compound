import fs from 'fs';
import path from 'path';

const EXAMPLE_INPUT = `# Vacation Compound Guide

## Restaurants & Food

**Blue Moon Cafe** - https://bluemooncafe.com
Amazing breakfast spot on the harbor! Try the blueberry pancakes. Gets super busy on weekends so get there early. Around $15-20 per person.

**Tony's Pizza Express** - 321 Oak Avenue
Quick pizza place, cash only. The pepperoni is outstanding. (555) 456-7890`;

const EXAMPLE_OUTPUT = `{
  "places": [
    {
      "id": "blue-moon-cafe",
      "name": "Blue Moon Cafe",
      "type": "restaurant",
      "description": "Amazing breakfast spot on the harbor",
      "url": "https://bluemooncafe.com",
      "address": "Harbor area (specific address not provided)",
      "phone": null,
      "priceRange": "$$",
      "rating": null,
      "hours": null,
      "notes": "Try the blueberry pancakes. Gets super busy on weekends so get there early. Around $15-20 per person.",
      "tags": ["breakfast", "harbor", "weekend-busy"]
    },
    {
      "id": "tonys-pizza-express",
      "name": "Tony's Pizza Express",
      "type": "restaurant",
      "description": "Quick pizza place",
      "url": null,
      "address": "321 Oak Avenue",
      "phone": "(555) 456-7890",
      "priceRange": "$",
      "rating": null,
      "hours": null,
      "notes": "Cash only! The pepperoni is outstanding.",
      "tags": ["pizza", "cash-only", "quick-bite"]
    }
  ]
}`;

export const PARSING_PROMPT = `You are an expert at parsing unstructured text about vacation destinations, restaurants, and activities into structured JSON format.

Your task is to extract information from vacation compound guides and convert them into a structured format suitable for a web application.

## Instructions:
1. **IMPORTANT**: Parse the ENTIRE input text to identify ALL places, restaurants, activities, and attractions - don't stop early
2. Look for places mentioned in ANY format: bold text, bullet points, paragraphs, or casual mentions
3. Extract as much information as possible for each place
4. Create unique, URL-friendly IDs for each place (lowercase, hyphen-separated)
5. Categorize each place by type: restaurant, activity, attraction, accommodation, shopping, or other
6. Infer missing information where reasonable (e.g., price range from context)
7. Extract contact information, addresses, and URLs when available
8. Create meaningful tags for categorization and search
9. Add helpful notes from the original text
10. If specific information isn't available, set it to null rather than making it up
11. **CRITICAL**: Ensure you process the complete document - include every single place mentioned

## Schema Format:
Each place should have these fields:
- id: unique identifier (string)
- name: display name (string)
- type: category (enum: restaurant, activity, attraction, accommodation, shopping, other)
- description: brief description (string, optional)
- url: website URL (string, optional)
- address: physical address (string, optional)
- mapsLink: Google Maps link (string, optional) 
- phone: phone number (string, optional)
- priceRange: cost level (enum: $, $$, $$$, $$$$, optional)
- rating: rating out of 5 (number, optional)
- hours: operating hours (string, optional)
- notes: additional notes and recommendations (string, optional)
- tags: array of descriptive tags (array of strings, optional)
- coordinates: {lat, lng} GPS coordinates (object, optional)

## Example:

Input:
\`\`\`
${EXAMPLE_INPUT}
\`\`\`

Output:
\`\`\`json
${EXAMPLE_OUTPUT}
\`\`\`

## Guidelines:
- Be thorough but accurate - don't invent information that isn't in the source
- Use context clues to infer price ranges, types, and tags
- Create descriptive but concise notes
- Generate helpful tags for search and filtering
- Maintain the original tone and recommendations in notes
- If coordinates aren't provided, leave them as null
- For map links, only include if an address is available

Now parse the following text:

---

{input_text}

---

Return only the JSON output with the "places" array containing ALL extracted places. 

**REMINDER**: Make sure you have processed the entire document and included every single place, restaurant, activity, and attraction mentioned:`;

export const ENRICHMENT_PROMPT = `You are helping enrich place data for a vacation compound guide. You have access to search tools to find missing information.

For each place that is missing key information (address, phone, website, hours, rating), you should:
1. Search for the place online
2. Find official website, address, and contact information
3. Look up reviews and ratings where available
4. Generate Google Maps links for places with addresses
5. Add GPS coordinates if you can find them

Focus on factual information only. Don't change existing descriptions or notes.

Current place data:
{place_data}

Please provide enriched data with the same structure, filling in missing fields where possible.`;

export const generateParsingPrompt = (inputText) => {
  return PARSING_PROMPT.replace('{input_text}', inputText);
};

export const generateEnrichmentPrompt = (placeData) => {
  return ENRICHMENT_PROMPT.replace('{place_data}', JSON.stringify(placeData, null, 2));
}; 