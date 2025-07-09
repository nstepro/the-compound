const { Storage } = require('@google-cloud/storage');
const { google } = require('googleapis');
const fs = require('fs');
const { config } = require('./config');
const { logger } = require('./logger');

class GoogleCloudStorageService {
  constructor() {
    this.storage = null;
    this.bucket = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      let credentials;
      
      // Reuse the same authentication logic from google-docs.js
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
          credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
          logger.info('Using Google credentials from environment variable for GCS');
        } catch (parseError) {
          logger.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', parseError);
          throw new Error('Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON');
        }
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
        try {
          const credentialsString = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf8');
          credentials = JSON.parse(credentialsString);
          logger.info('Using Google credentials from base64 environment variable for GCS');
        } catch (parseError) {
          logger.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_BASE64:', parseError);
          throw new Error('Invalid base64 or JSON in GOOGLE_APPLICATION_CREDENTIALS_BASE64');
        }
      } else {
        // Fall back to file-based credentials for local development
        credentials = JSON.parse(fs.readFileSync(config.google.credentialsPath, 'utf8'));
        logger.info('Using Google credentials from file for GCS');
      }

      // Initialize Google Cloud Storage with the same credentials
      this.storage = new Storage({
        credentials: credentials,
        projectId: credentials.project_id
      });

      // Get the bucket
      this.bucket = this.storage.bucket(config.googleCloudStorage.bucketName);

      // Note: Skipping bucket existence check to avoid requiring storage.buckets.get permission
      // The bucket existence will be validated on first file operation

      this.initialized = true;
      logger.info(`Google Cloud Storage initialized successfully. Bucket: ${config.googleCloudStorage.bucketName}`);
    } catch (error) {
      logger.error('Failed to initialize Google Cloud Storage:', error);
      throw error;
    }
  }

  async uploadFile(data, filename = null) {
    await this.initialize();

    try {
      const fileName = filename || config.googleCloudStorage.fileName;
      const file = this.bucket.file(fileName);
      
      // Convert data to JSON string if it's an object
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      
      // Upload the file
      await file.save(content, {
        metadata: {
          contentType: 'application/json',
          metadata: {
            uploadedAt: new Date().toISOString(),
            source: 'compound-parser'
          }
        }
      });

      logger.info(`File uploaded successfully to GCS: ${fileName}`);
      return {
        success: true,
        fileName: fileName,
        url: `gs://${config.googleCloudStorage.bucketName}/${fileName}`
      };
    } catch (error) {
      logger.error('Failed to upload file to GCS:', error);
      throw new Error(`Failed to upload file to Google Cloud Storage: ${error.message}`);
    }
  }

  async downloadFile(filename = null) {
    await this.initialize();

    try {
      const fileName = filename || config.googleCloudStorage.fileName;
      const file = this.bucket.file(fileName);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        logger.info(`File ${fileName} does not exist in GCS`);
        return null;
      }

      // Download the file
      const [contents] = await file.download();
      const data = JSON.parse(contents.toString());
      
      logger.info(`File downloaded successfully from GCS: ${fileName}`);
      return data;
    } catch (error) {
      if (error.code === 404) {
        logger.info(`File ${filename || config.googleCloudStorage.fileName} not found in GCS`);
        return null;
      }
      logger.error('Failed to download file from GCS:', error);
      throw new Error(`Failed to download file from Google Cloud Storage: ${error.message}`);
    }
  }

  async fileExists(filename = null) {
    await this.initialize();

    try {
      const fileName = filename || config.googleCloudStorage.fileName;
      const file = this.bucket.file(fileName);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      logger.error('Failed to check file existence in GCS:', error);
      return false;
    }
  }

  async getFileMetadata(filename = null) {
    await this.initialize();

    try {
      const fileName = filename || config.googleCloudStorage.fileName;
      const file = this.bucket.file(fileName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }

      const [metadata] = await file.getMetadata();
      return {
        name: metadata.name,
        size: metadata.size,
        created: metadata.timeCreated,
        updated: metadata.updated,
        contentType: metadata.contentType,
        etag: metadata.etag
      };
    } catch (error) {
      logger.error('Failed to get file metadata from GCS:', error);
      return null;
    }
  }

  async createBackup(data, filename = null) {
    await this.initialize();

    try {
      const timestamp = Date.now();
      const baseFileName = filename || config.googleCloudStorage.fileName;
      const backupFileName = baseFileName.replace('.json', `-backup-${timestamp}.json`);
      
      await this.uploadFile(data, backupFileName);
      logger.info(`Backup created successfully: ${backupFileName}`);
      
      return backupFileName;
    } catch (error) {
      logger.error('Failed to create backup in GCS:', error);
      throw error;
    }
  }
}

const googleCloudStorageService = new GoogleCloudStorageService();

module.exports = { googleCloudStorageService }; 