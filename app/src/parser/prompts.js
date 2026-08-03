const EXAMPLE_INPUT = `# Vacation Compound Guide

## Restaurants & Food

⭐ **blue moon cafe** - https://bluemooncafe.com
Amazing breakfast spot on the harbor! Try the blueberry pancakes. Gets super busy on weekends so get there early. Around $15-20 per person.

**tonys pizza express** - 321 Oak Avenue
Quick pizza place, cash only. The pepperoni is outstanding. (555) 456-7890

## Activities

We love going to mcdonalds playplace when it's raining. The kids have a blast and you can grab a quick bite.

joes bar is the best spot for watching the game on Sunday afternoons.`;

const EXAMPLE_OUTPUT = `{
  "places": [
    {
      "id": "blue-moon-cafe",
      "name": "Blue Moon Cafe",
      "type": "dining",
      "description": "Amazing breakfast spot on the harbor",
      "url": "https://bluemooncafe.com",
      "notes": "Try the blueberry pancakes. Gets super busy on weekends so get there early. Around $15-20 per person.",
      "origText": "⭐ **blue moon cafe** - https://bluemooncafe.com\\nAmazing breakfast spot on the harbor! Try the blueberry pancakes. Gets super busy on weekends so get there early. Around $15-20 per person.",
      "category": "Restaurants & Food",
      "starred": true,
      "emoji": "🥞"
    },
    {
      "id": "tonys-pizza-express",
      "name": "Tony's Pizza Express",
      "type": "dining",
      "description": "Quick pizza place",
      "url": null,
      "notes": "Cash only! The pepperoni is outstanding.",
      "origText": "**tonys pizza express** - 321 Oak Avenue\\nQuick pizza place, cash only. The pepperoni is outstanding. (555) 456-7890",
      "category": "Restaurants & Food",
      "emoji": "🍕"
    },
    {
      "id": "mcdonalds-playplace",
      "name": "McDonald's Playplace",
      "type": "activity",
      "description": "Indoor playground for kids",
      "url": null,
      "notes": "Great for rainy days. The kids have a blast and you can grab a quick bite.",
      "origText": "We love going to mcdonalds playplace when it's raining. The kids have a blast and you can grab a quick bite.",
      "category": "Activities",
      "emoji": "🎠"
    },
    {
      "id": "joes-bar",
      "name": "Joe's Bar",
      "type": "dining",
      "description": "Sports bar for watching games",
      "url": null,
      "notes": "The best spot for watching the game on Sunday afternoons.",
      "origText": "joes bar is the best spot for watching the game on Sunday afternoons.",
      "category": "Activities",
      "emoji": "🍺"
    }
  ]
}`;

const generateParsingPrompt = (inputText, locationContext = 'Maine, USA') => {
  return `You are an expert at parsing unstructured text about vacation destinations, restaurants, and activities into structured JSON format.

Your task is to extract and intelligently format information from vacation compound guides that will later be enriched with real business data from external APIs.

**IMPORTANT GEOGRAPHIC CONTEXT**: All places in this document are located in ${locationContext}. When parsing and categorizing places, keep this geographic context in mind.

## Instructions:
1. **IMPORTANT**: Parse the ENTIRE input text to identify ALL places, dining, activities, and attractions - don't stop early
2. Look for places mentioned in ANY format: bold text, bullet points, paragraphs, or casual mentions
3. **INTELLIGENT NAME FORMATTING**: Don't just copy verbatim text - infer the actual business/place name from context
4. Create unique, URL-friendly IDs for each place (lowercase, hyphen-separated)
5. Categorize each place by type: dining, activity, accommodation, shopping, or other
    5.1. If the place is a cafe, bar, restaurant or similar, it should be categorized as "dining"
    5.2. If the place is a beach, lighthouse, museum, hike, etc., it should be categorized as "activity"
    5.3. If the place is an hotel, inn, campsite, etc., it should be categorized as "accommodation"
    5.4. If the place is a store, whether grocery, retail, or otherwise, it should be categorized as "shopping"
    5.5. If the place is something else, it should be categorized as "other"
6. Extract descriptions, notes, and recommendations from the original text
7. Extract any URLs mentioned in the text
8. **PRESERVE ORIGINAL TEXT**: Include the complete original text block for each place in the "origText" field
9. **PRESERVE CATEGORIES**: Include the document section/header where each place was found in the "category" field (clean up the category name to be more readable)
10. **STARRED PLACES**: Check if a place has a STANDALONE star marker near its name in the original text:
    - ⭐ star emoji before/after the place name (e.g., "⭐ Blue Moon Cafe" or "Blue Moon Cafe ⭐")
    - Single asterisk with spacing that's NOT part of markdown formatting (e.g., "* Blue Moon Cafe" or "Blue Moon Cafe *")
    - **IMPORTANT**: Ignore asterisks used for markdown bold/italic formatting (e.g., **text** or *text*)
    - Only treat an asterisk as a star marker if it's clearly standalone and meant as a marker
    If a star marker is present, set "starred": true and remove the star from the formatted name.
11. **EMOJI SUGGESTIONS**: For EVERY place, suggest one appropriate emoji that represents the place. Examples:
    - Beaches/waterfront: 🏖️ or 🌊
    - Asian restaurants: 🍜 or 🥢
    - Italian restaurants: 🍝 or 🍕
    - Mexican restaurants: 🌮 or 🌯
    - Seafood: 🦞 or 🦀 or 🐟
    - Breweries/bars: 🍺 or 🍻
    - Coffee shops: ☕
    - Hiking/trails: ⛰️ or 🥾
    - Museums: 🏛️ or 🎨
    - Lighthouses: 🗼
    - Shopping: 🛍️
    - Ice cream: 🍦
    - Bakery: 🥐 or 🍰
    - Parks: 🌳
    Choose creative, appropriate emojis that visually represent the place
12. **CRITICAL**: Ensure you process the complete document - include every single place mentioned
13. **GEOGRAPHIC CONTEXT**: Remember that all places are in ${locationContext}

## PLACE NAME FORMATTING RULES:
- **Use Proper Case**: "Tony's Pizza Express" not "tony's pizza express" or "TONY'S PIZZA EXPRESS"
- **Infer Full Business Names**: If you see "blue moon cafe" in casual text, format it as "Blue Moon Cafe"
- **Use Context Clues**: Consider surrounding text to determine the actual business name
- **Handle Common Variations**: "McDonalds" becomes "McDonald's", "Joes Bar" becomes "Joe's Bar"
- **Remove Unnecessary Words**: "Restaurant called Tony's" becomes "Tony's"
- **Proper Apostrophes**: Use proper apostrophes (') not straight quotes (')
- **Consistent Formatting**: Apply title case to all words except articles (a, an, the), prepositions (of, in, at, etc.), and conjunctions (and, but, or) unless they're the first or last word

## DO NOT ATTEMPT TO PROVIDE:
- Specific addresses (unless clearly stated in the text)
- Phone numbers (unless clearly stated in the text)  
- Business hours
- Ratings or review counts
- Price levels ($ symbols)
- GPS coordinates
- Google Maps links

These will be provided later by external APIs with accurate, real-time data.

## Schema Format:
Each place should have these fields:
- id: unique identifier (string, required)
- name: display name (string, required)
- type: category (enum: dining, activity, accommodation, shopping, other, required)
- description: brief description extracted from text (string, optional)
- url: website URL if mentioned in text (string, optional)
- notes: additional notes and recommendations from the text (string, optional)
- origText: the complete original text block for this place from the document (string, required)
- category: the document section/header where this place was found, cleaned up for readability (string, required)
- starred: whether this place has a STANDALONE star marker (⭐ emoji or standalone * asterisk, NOT markdown formatting) in the document (boolean, optional)
- emoji: a single emoji that best represents this place (string, optional, required for all places)

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
- **SMART NAME FORMATTING**: Don't copy verbatim - infer the proper business name using context and proper formatting rules
- **REMOVE STARS FROM NAMES**: If a place name has ⭐ emoji or standalone * markers (NOT markdown formatting), remove them from the "name" field but set "starred": true
- Focus on extracting context, descriptions, and recommendations from the text
- Be thorough but don't invent information that isn't explicitly in the source
- Maintain the original tone and recommendations in notes
- **ALWAYS** include the origText field with the complete original text block for each place (preserve the original formatting)
- **ALWAYS** include the category field with the cleaned-up section header
- **ALWAYS** include an emoji field for every place with an appropriate representative emoji
- **CHECK FOR STARS**: Look for ⭐ emoji or standalone * asterisk markers (NOT markdown formatting) near place names to mark favorites
- Clean up category names (e.g., "Restaurants & Food" instead of "## Restaurants & Food")
- **REMEMBER**: All places are in ${locationContext}

## CRITICAL PLACE NAME EXAMPLES:
- Input: "**blue moon cafe**" → Output: "Blue Moon Cafe" (NO starred, the ** is just markdown bold)
- Input: "⭐ **blue moon cafe**" → Output: "Blue Moon Cafe" (WITH starred: true, ⭐ is a star marker)
- Input: "* **tonys pizza express**" → Output: "Tony's Pizza Express" (WITH starred: true, leading * is a star marker)
- Input: "**tonys pizza express** ⭐" → Output: "Tony's Pizza Express" (WITH starred: true, trailing ⭐ is a star marker)
- Input: "tonys pizza express" → Output: "Tony's Pizza Express"
- Input: "mcdonalds playplace" → Output: "McDonald's Playplace"
- Input: "joes bar" → Output: "Joe's Bar"
- Input: "the old mill restaurant" → Output: "The Old Mill Restaurant"

Now parse the following text:

---

${inputText}

---

Return only the JSON output with the "places" array containing ALL extracted places. 

**REMINDER**: Make sure you have processed the entire document and included every single place, restaurant, activity, and attraction mentioned. Include origText, category, emoji, and starred (if applicable) for each place. All places are in ${locationContext}.

**CRITICAL**: Apply intelligent name formatting to all place names - don't just copy verbatim text. Use proper case, correct apostrophes, and infer the actual business names from context. Remove any standalone star markers (⭐ emoji or standalone * asterisk, NOT markdown formatting asterisks) from the name but set starred: true if present.

**EMOJI REQUIREMENT**: Every single place MUST have an "emoji" field with an appropriate emoji that represents the place.

**STARRED PLACES**: Check each place name for STANDALONE star markers (⭐ emoji or standalone * asterisk that's NOT part of markdown formatting) and set "starred": true if found. Markdown asterisks like **bold** or *italic* should be IGNORED. Remove the star marker from the formatted name.

**IMPORTANT**: Do not provide addresses, phone numbers, hours, ratings, price levels, or coordinates - these will be added later via external APIs with accurate data.`;
};

// DEPRECATED: LLM-based enrichment removed - use webEnrichmentService instead
// This ensures Google Places API is the primary source for all business data

const CATEGORY_CLEANUP_PROMPT = `You are helping clean up document section headers to make them more readable and consistent.

Take the following category/header text and clean it up:
- Remove markdown symbols (# ## ###)
- Remove extra punctuation
- Make it title case
- Keep it concise and readable
- If it's too generic, suggest a more specific category name

The category might be the name of a region (e.g., St Goerge, Thomaston) or a type of activity (e.g., Hiking, Beaches),

Original category: {category}

Return only the cleaned category name, nothing else.`;

const generateCategoryCleanupPrompt = (category) => {
  return CATEGORY_CLEANUP_PROMPT.replace('{category}', category);
};

const generateAddPlacePrompt = (userText, notes, sectionTitles, locationContext) => {
  const sectionsList = sectionTitles.length > 0
    ? sectionTitles.map((s) => `- ${s}`).join('\n')
    : '- Restaurants & Food\n- Activities';

  return `You are helping add a single place to a vacation compound guide in ${locationContext}.

The admin typed this free-text request:
"${userText}"
${notes ? `\nAdditional notes from admin: "${notes}"` : ''}

Available document sections (pick the best match for "category"):
${sectionsList}

Return JSON for ONE place only:
{
  "place": {
    "name": "Properly formatted business name",
    "type": "dining|restaurant|activity|accommodation|shopping|other",
    "description": "Brief description or null",
    "notes": "Extra notes from admin input or null",
    "category": "Exact section title from the list above",
    "origText": "Line as it should appear in the Google Doc, e.g. **Name** — description. optional url",
    "emoji": "single emoji",
    "starred": false,
    "needsClarification": false
  }
}

Rules:
- Infer the real business name; use proper capitalization.
- "type" dining for cafes, restaurants, bars, bakeries.
- "category" MUST be one of the listed section titles exactly.
- "origText" should match doc style: **Name** — description. Include URL if mentioned.
- Set needsClarification true only if the input is too vague to identify any business (no name at all).
- Do NOT include address, phone, hours, rating, coordinates, or maps links.

Return only valid JSON.`;
};

module.exports = {
  generateParsingPrompt,
  generateAddPlacePrompt,
  CATEGORY_CLEANUP_PROMPT,
  generateCategoryCleanupPrompt
}; 