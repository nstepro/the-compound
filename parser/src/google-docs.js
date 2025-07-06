import { google } from 'googleapis';
import TurndownService from 'turndown';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { logger } from './logger.js';

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
      // Load credentials from file
      const credentials = JSON.parse(fs.readFileSync(config.google.credentialsPath, 'utf8'));
      
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
      const plainText = this.extractTextFromDocument(document);
      
      logger.info(`Extracted ${plainText.length} characters from document`);
      
      // Clean up the text
      const cleanedText = plainText
        .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
        .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
        .trim();
      
      return {
        title: document.title,
        content: cleanedText,
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

export const googleDocsService = new GoogleDocsService(); 