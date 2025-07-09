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
2. Format wifi passwords as inline code with backticks
3. Add relevant emojis where appropriate, but ONLY to headings - don't overdo it.
4. Make the language more conversational and clear
5. Group related items together logically
6. Add section headers where it makes sense, but keep them minimal.
7. Keep all the original information but make it more readable
8. Avoid "dividers" between sections - just use a blank line
9. Do NOT add a title to the document (i.e., "Shady House Instructions") - just start with the instructions (using necessary headers for each section)

Format as markdown and return ONLY the formatted content without any wrapper text.`;

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