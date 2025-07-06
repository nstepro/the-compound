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
      "tags": ["breakfast", "harbor", "weekend-busy"],
      "origText": "**Blue Moon Cafe** - https://bluemooncafe.com\\nAmazing breakfast spot on the harbor! Try the blueberry pancakes. Gets super busy on weekends so get there early. Around $15-20 per person.",
      "category": "Restaurants & Food"
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
      "tags": ["pizza", "cash-only", "quick-bite"],
      "origText": "**Tony's Pizza Express** - 321 Oak Avenue\\nQuick pizza place, cash only. The pepperoni is outstanding. (555) 456-7890",
      "category": "Restaurants & Food"
    }
  ]
}`;

export const generateParsingPrompt = (inputText, locationContext = 'Maine, USA') => {
  return `You are an expert at parsing unstructured text about vacation destinations, restaurants, and activities into structured JSON format.

Your task is to extract information from vacation compound guides and convert them into a structured format suitable for a web application.

**IMPORTANT GEOGRAPHIC CONTEXT**: All places in this document are located in ${locationContext}. When parsing and categorizing places, keep this geographic context in mind.

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
10. **PRESERVE ORIGINAL TEXT**: Include the complete original text block for each place in the "origText" field
11. **PRESERVE CATEGORIES**: Include the document section/header where each place was found in the "category" field (clean up the category name to be more readable)
12. If specific information isn't available, set it to null rather than making it up
13. **CRITICAL**: Ensure you process the complete document - include every single place mentioned
14. **GEOGRAPHIC CONTEXT**: Remember that all places are in ${locationContext}

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
- origText: the complete original text block for this place from the document (string, required)
- category: the document section/header where this place was found, cleaned up for readability (string, required)

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
- **ALWAYS** include the origText field with the complete original text block for each place
- **ALWAYS** include the category field with the cleaned-up section header
- Clean up category names (e.g., "Restaurants & Food" instead of "## Restaurants & Food")
- **REMEMBER**: All places are in ${locationContext}

Now parse the following text:

---

${inputText}

---

Return only the JSON output with the "places" array containing ALL extracted places. 

**REMINDER**: Make sure you have processed the entire document and included every single place, restaurant, activity, and attraction mentioned. Include origText and category for each place. All places are in ${locationContext}.`;
};

export const generateEnrichmentPrompt = (placeData, locationContext = 'Maine, United States') => {
  return `You are helping enrich place data for a vacation compound guide. You have access to search tools to find missing information.

**CRITICAL GEOGRAPHIC CONTEXT**: This place is located in ${locationContext}. When searching for information, ONLY look for places in ${locationContext}. Do not confuse this with places of the same name in other states or countries.

For this place that is missing key information (address, phone, website, hours, rating), you should:
1. **Search specifically for this place in ${locationContext}** - not other locations
2. Find the official website, address, and contact information for the ${locationContext} location
3. Look up reviews and ratings where available for the ${locationContext} location
4. Generate Google Maps links for places with addresses in ${locationContext}
5. Add GPS coordinates if you can find them for the ${locationContext} location

Focus on factual information only. Don't change existing descriptions, notes, origText, or category fields.

**IMPORTANT**: If you cannot find reliable information for this specific place in ${locationContext}, leave those fields as null rather than providing information for a place with the same name in a different location.

Current place data:
${JSON.stringify(placeData, null, 2)}

Please provide enriched data with the same structure, filling in missing fields where possible.
Do NOT modify: origText, category, id, name, description, notes, or tags.
ONLY enrich with information for this place in ${locationContext}.`;
};

export const CATEGORY_CLEANUP_PROMPT = `You are helping clean up document section headers to make them more readable and consistent.

Take the following category/header text and clean it up:
- Remove markdown symbols (# ## ###)
- Remove extra punctuation
- Make it title case
- Keep it concise and readable
- If it's too generic, suggest a more specific category name

Original category: {category}

Return only the cleaned category name, nothing else.`;

export const generateCategoryCleanupPrompt = (category) => {
  return CATEGORY_CLEANUP_PROMPT.replace('{category}', category);
}; 