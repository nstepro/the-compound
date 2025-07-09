const { google } = require('googleapis');
const TurndownService = require('turndown');
const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { logger } = require('./logger');

class GoogleDocsService {
  constructor() {
    this.docs = null;
    this.drive = null;
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }

  async authenticate() {
    try {
      let credentials;
      
      // Check if credentials are provided as environment variable (for Heroku)
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
          credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
          logger.info('Using Google credentials from environment variable');
        } catch (parseError) {
          logger.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', parseError);
          throw new Error('Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON');
        }
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
        try {
          const credentialsString = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf8');
          credentials = JSON.parse(credentialsString);
          logger.info('Using Google credentials from base64 environment variable');
        } catch (parseError) {
          logger.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_BASE64:', parseError);
          throw new Error('Invalid base64 or JSON in GOOGLE_APPLICATION_CREDENTIALS_BASE64');
        }
      } else {
        // Fall back to file-based credentials for local development
        credentials = JSON.parse(fs.readFileSync(config.google.credentialsPath, 'utf8'));
        logger.info('Using Google credentials from file');
      }
      
      // Create auth instance
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/documents.readonly',
          'https://www.googleapis.com/auth/drive.readonly'
        ]
      });

      // Get authenticated client
      const authClient = await auth.getClient();
      
      // Initialize services
      this.docs = google.docs({ version: 'v1', auth: authClient });
      this.drive = google.drive({ version: 'v3', auth: authClient });
      
      logger.info('Google Docs authentication successful');
      return true;
    } catch (error) {
      logger.error('Google Docs authentication failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async getDocumentContent(docId) {
    try {
      if (!this.docs) {
        await this.authenticate();
      }

      logger.info(`Fetching document content for ID: ${docId}`);
      
      const response = await this.docs.documents.get({
        documentId: docId
      });

      const document = response.data;
      logger.info(`Document fetched: "${document.title}"`);
      
      return document;
    } catch (error) {
      logger.error(`Failed to fetch document ${docId}:`, error);
      throw new Error(`Failed to fetch document: ${error.message}`);
    }
  }

  extractTextFromDocument(document) {
    const textElements = [];
    
    if (!document.body || !document.body.content) {
      logger.warn('Document has no body content');
      return '';
    }

    // Process each element in the document
    document.body.content.forEach(element => {
      if (element.paragraph) {
        const paragraph = element.paragraph;
        let paragraphText = '';
        
        if (paragraph.elements) {
          paragraph.elements.forEach(elem => {
            if (elem.textRun && elem.textRun.content) {
              paragraphText += elem.textRun.content;
            }
          });
        }
        
        // Add paragraph styling
        if (paragraph.paragraphStyle) {
          const style = paragraph.paragraphStyle;
          if (style.headingId || style.namedStyleType) {
            const headingLevel = this.getHeadingLevel(style.namedStyleType);
            if (headingLevel > 0) {
              paragraphText = '#'.repeat(headingLevel) + ' ' + paragraphText.trim();
            }
          }
        }
        
        if (paragraphText.trim()) {
          textElements.push(paragraphText);
        }
      }
    });

    return textElements.join('\n\n');
  }

  extractStructuredTextFromDocument(document) {
    const sections = [];
    let currentSection = { category: null, content: [] };
    
    if (!document.body || !document.body.content) {
      logger.warn('Document has no body content');
      return { sections: [], fullText: '' };
    }

    // Process each element in the document
    document.body.content.forEach(element => {
      if (element.paragraph) {
        const paragraph = element.paragraph;
        let paragraphText = '';
        
        if (paragraph.elements) {
          paragraph.elements.forEach(elem => {
            if (elem.textRun && elem.textRun.content) {
              paragraphText += elem.textRun.content;
            }
          });
        }
        
        // Check if this is a heading
        let isHeading = false;
        let headingLevel = 0;
        
        if (paragraph.paragraphStyle) {
          const style = paragraph.paragraphStyle;
          if (style.headingId || style.namedStyleType) {
            headingLevel = this.getHeadingLevel(style.namedStyleType);
            if (headingLevel > 0) {
              isHeading = true;
            }
          }
        }
        
        if (paragraphText.trim()) {
          if (isHeading) {
            // Start a new section
            if (currentSection.category || currentSection.content.length > 0) {
              sections.push(currentSection);
            }
            currentSection = {
              category: paragraphText.trim(),
              headingLevel: headingLevel,
              content: []
            };
          } else {
            // Add to current section
            currentSection.content.push(paragraphText.trim());
          }
        }
      }
    });

    // Add the last section
    if (currentSection.category || currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    // Build full text with markdown headers
    const fullText = sections.map(section => {
      const headerText = section.category ? `${'#'.repeat(section.headingLevel || 1)} ${section.category}\n\n` : '';
      const contentText = section.content.join('\n\n');
      return headerText + contentText;
    }).join('\n\n');

    return { sections, fullText };
  }

  getHeadingLevel(namedStyleType) {
    const headingMap = {
      'HEADING_1': 1,
      'HEADING_2': 2,
      'HEADING_3': 3,
      'HEADING_4': 4,
      'HEADING_5': 5,
      'HEADING_6': 6
    };
    
    return headingMap[namedStyleType] || 0;
  }

  async getDocumentAsMarkdown(docId) {
    try {
      const document = await this.getDocumentContent(docId);
      const structuredData = this.extractStructuredTextFromDocument(document);
      
      logger.info(`Extracted ${structuredData.sections.length} sections from document`);
      logger.info(`Total text length: ${structuredData.fullText.length} characters`);
      
      // Clean up the text
      const cleanedText = structuredData.fullText
        .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
        .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
        .trim();
      
      return {
        title: document.title,
        content: cleanedText,
        sections: structuredData.sections,
        lastModified: document.revisionId,
        docId: docId
      };
    } catch (error) {
      logger.error(`Failed to convert document to markdown:`, error);
      throw error;
    }
  }

  async exportAsHtml(docId) {
    try {
      if (!this.drive) {
        await this.authenticate();
      }

      const response = await this.drive.files.export({
        fileId: docId,
        mimeType: 'text/html'
      });

      const html = response.data;
      const markdown = this.turndownService.turndown(html);
      
      return {
        html: html,
        markdown: markdown
      };
    } catch (error) {
      logger.error(`Failed to export document as HTML:`, error);
      throw error;
    }
  }
}

const googleDocsService = new GoogleDocsService();

module.exports = { googleDocsService }; 