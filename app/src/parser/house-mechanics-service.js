const { logger } = require('./logger');
const { openaiService } = require('./openai-service');

class HouseMechanicsService {
  constructor() {
    this.houseNames = ['Shady', 'Lofty'];
  }

  /**
   * Extract the "House Mechanics" section from the document content
   */
  extractHouseMechanicsSection(documentContent) {
    try {
      // Split the document into sections
      const sections = documentContent.split(/^## /gm);
      
      // Find the "House Mechanics" section (case insensitive)
      const houseMechanicsSection = sections.find(section => 
        section.toLowerCase().trim().startsWith('house mechanics')
      );
      
      if (!houseMechanicsSection) {
        logger.warn('No "House Mechanics" section found in document');
        return null;
      }

      logger.info('Found "House Mechanics" section');
      return '## ' + houseMechanicsSection; // Add back the heading
    } catch (error) {
      logger.error('Failed to extract House Mechanics section:', error);
      return null;
    }
  }

  /**
   * Parse individual house data from the mechanics section
   */
  parseHouseData(houseMechanicsContent) {
    try {
      const houses = {};
      
      // Split by house headings (#### followed by house name)
      const houseSections = houseMechanicsContent.split(/^#### /gm);
      
      for (const section of houseSections) {
        if (!section.trim()) continue;
        
        const lines = section.split('\n');
        const houseName = lines[0].trim().toLowerCase();
        
        if (this.houseNames.map(name => name.toLowerCase()).includes(houseName)) {
          const houseContent = lines.slice(1).join('\n').trim();
          houses[houseName] = houseContent;
          logger.info(`Parsed data for house: ${houseName}`);
        }
      }
      
      return houses;
    } catch (error) {
      logger.error('Failed to parse house data:', error);
      return {};
    }
  }

  /**
   * Format house instructions into readable markdown
   */
  formatHouseInstructions(houseName, rawContent) {
    try {
      // Create the formatted markdown without header
      const markdown = `${rawContent.trim()}

---
*Last updated: ${new Date().toLocaleDateString()}*
`;

      return markdown;
    } catch (error) {
      logger.error(`Failed to format instructions for ${houseName}:`, error);
      return null;
    }
  }

  /**
   * Use OpenAI to enhance the formatting and readability
   */
  async enhanceInstructions(houseName, rawContent) {
    try {
      logger.info(`Enhancing instructions for ${houseName} with OpenAI`);
      
      const prompt = `Please reformat these house instructions to be more readable and user-friendly. 
      
      This should read like a friendly guide to the house, not a technical manual. But don't add gushy, corny, unnecessary language.
      
Original instructions for ${houseName}:
${rawContent}

Please:
1. Convert bullet points to clear bulleted lists (avoid numbered lists)
2. **CRITICAL - BOLD KEY ITEMS**: For each bullet point, bold the primary subject/item being discussed. Examples:
   - "There are **extra rolls of toilet paper** under the sink in the primary bathroom"
   - "The **primary bath shower drain** is hidden under the white slab"
   - "The **espresso machine** should be turned off when you leave"
   - "**Mini split controls** are located on the wall in each bedroom"
   Don't go overboard - just bold the main thing each bullet is about.
3. **PRESERVE HYPERLINKS**: The input may contain markdown links in the format [text](url). Keep these EXACTLY as they appear. For example, if you see "[Mini Split Manual](https://example.com)", preserve it as a markdown link. Do NOT remove or alter links.
4. **HANDLE IMPORTANT TEXT**: If the original text has ALL CAPS (like "IMPORTANT:" or "WARNING:") or multiple exclamation points, this indicates something is important:
   - Just add a ‼️ emoji at the BEGINNING of that bullet point
   - Don't create additional sub-bullets or use prefixes like "IMPORTANT:" or "WARNING:"
   - Don't repeat the ALL CAPS or excessive exclamation points
   - Example: If original says "IMPORTANT: Wipe up any spills right away", format as "‼️ Wipe up any **spills** right away"
5. Format wifi passwords as inline code with backticks
6. Do NOT add emojis to section headers - keep them clean and simple.
7. Make the language more conversational and clear
8. Group related items together logically
9. Add section headers where it makes sense, but keep them minimal.
10. Keep all the original information but make it more readable
11. **NEVER** add horizontal separators (---, ***, etc.) between sections - just use blank lines
12. Do NOT add a title to the document (i.e., "Shady House Instructions") - just start with the instructions (using necessary headers for each section)
13. Do NOT create additional sub-bullets just to emphasize importance - keep the same structure as the original

Format as markdown and return ONLY the formatted content without any wrapper text.

Example response:

### Leaving Checklist

Before you go, please:

- Turn off the **espresso machine**
- Turn off all three **bedroom mini splits**
- Set the **main area mini split** to:
  - Winter: Heat, 61°
  - Summer: Cool, 78°
- ‼️ **Lock all doors** - this is critical for security

### Door Instructions

- To unlock: Enter the pin and press the **lock button**
- To lock: Pull the door shut with one hand, then press and hold the lock button for 2 seconds
- Refer to the [Lock Manual](https://example.com/manual) for detailed instructions

### WiFi Info

- Network: MyInternetSSID
- Password: \`MyInternetPassword\`

### Important Notes

- **Extra toilet paper rolls** are located under the sink in the primary bathroom
- The **primary bath shower drain** is hidden under the white slab - lift it to clean
- ‼️ Don't put **coffee grounds or food scraps** down the sink

*Last updated: 7/9/2025*

`;

      const enhancedContent = await openaiService.generateCompletion(prompt);
      
      // Create the final markdown without header
      const markdown = `${enhancedContent}

---
*Last updated: ${new Date().toLocaleDateString()}*
`;

      return markdown;
    } catch (error) {
      logger.error(`Failed to enhance instructions for ${houseName} with OpenAI:`, error);
      return null;
    }
  }

  /**
   * Process the house mechanics section and return formatted markdown for each house
   */
  async processHouseMechanics(documentContent) {
    try {
      logger.info('Processing House Mechanics section');
      
      // Extract the house mechanics section
      const houseMechanicsContent = this.extractHouseMechanicsSection(documentContent);
      if (!houseMechanicsContent) {
        return {};
      }

      // Parse individual house data
      const housesData = this.parseHouseData(houseMechanicsContent);
      
      // Format each house's instructions
      const formattedHouses = {};
      for (const [houseName, rawContent] of Object.entries(housesData)) {
        logger.info(`Processing instructions for ${houseName}`);
        const formatted = await this.enhanceInstructions(houseName, rawContent);
        if (formatted) {
          formattedHouses[houseName] = formatted;
        }
      }

      logger.info(`Successfully processed ${Object.keys(formattedHouses).length} house(s)`);
      return formattedHouses;
    } catch (error) {
      logger.error('Failed to process house mechanics:', error);
      return {};
    }
  }
}

const houseMechanicsService = new HouseMechanicsService();

module.exports = { houseMechanicsService }; 