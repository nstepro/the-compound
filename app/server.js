const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2b$10$example.hash.replace.with.real.hash';
const GUEST_PASSWORD_HASH = process.env.GUEST_PASSWORD_HASH || '$2b$10$example.guest.hash.replace.with.real.hash';

// Middleware for JSON parsing
app.use(express.json());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin-only authentication middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    req.user = user;
    next();
  });
};

// Guest or admin authentication middleware
const authenticateGuestOrAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    
    if (user.role !== 'admin' && user.role !== 'guest') {
      return res.status(403).json({ success: false, message: 'Guest or admin access required' });
    }
    
    req.user = user;
    next();
  });
};

// Authentication endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    // Check both admin and guest passwords
    const isAdminValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    const isGuestValid = await bcrypt.compare(password, GUEST_PASSWORD_HASH);
    
    let userRole = null;
    if (isAdminValid) {
      userRole = 'admin';
    } else if (isGuestValid) {
      userRole = 'guest';
    }
    
    if (!userRole) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Generate JWT token with role
    const token = jwt.sign(
      { role: userRole, timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      role: userRole
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Import the parser functions
const { runParse } = require('./src/parser/index');
const { googleCloudStorageService } = require('./src/parser/google-cloud-storage');

// API endpoint to serve compound places data from Google Cloud Storage
app.get('/api/compound-places', async (req, res) => {
  try {
    const config = require('./src/parser/config').config;
    
    if (config.googleCloudStorage.enabled) {
      // Fetch from Google Cloud Storage
      const placesData = await googleCloudStorageService.downloadFile();
      
      if (!placesData) {
        return res.status(404).json({
          success: false,
          message: 'Places data not found. Please run the parser first.'
        });
      }

      res.json(placesData);
    } else {
      // Fallback to local file system
      const outputPath = path.join(__dirname, 'public', 'compound-places.json');
      
      if (!fs.existsSync(outputPath)) {
        return res.status(404).json({
          success: false,
          message: 'Places data not found. Please run the parser first.'
        });
      }

      const placesData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      res.json(placesData);
    }
  } catch (error) {
    console.error('Error fetching compound places:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch places data',
      error: error.message
    });
  }
});

// API endpoint to serve house mechanics markdown files (protected with guest/admin auth)
app.get('/api/house-mechanics/:house', authenticateGuestOrAdmin, async (req, res) => {
  try {
    const { house } = req.params;
    
    // Validate house parameter
    if (!['lofty', 'shady'].includes(house)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid house parameter. Must be "lofty" or "shady".'
      });
    }
    
    const config = require('./src/parser/config').config;
    const filename = `house-mechanics-${house}.md`;
    
    if (config.googleCloudStorage.enabled) {
      // Fetch from Google Cloud Storage
      const markdownContent = await googleCloudStorageService.downloadMarkdownFile(filename);
      
      if (!markdownContent) {
        return res.status(404).json({
          success: false,
          message: `House mechanics file for ${house} not found. Please ensure the file exists in Google Cloud Storage.`
        });
      }

      res.json({
        success: true,
        content: markdownContent,
        house: house,
        filename: filename
      });
    } else {
      // Fallback to local file system (for development)
      const localPath = path.join(__dirname, 'public', filename);
      
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({
          success: false,
          message: `House mechanics file for ${house} not found locally. Please ensure the file exists or enable Google Cloud Storage.`
        });
      }

      const markdownContent = fs.readFileSync(localPath, 'utf8');
      res.json({
        success: true,
        content: markdownContent,
        house: house,
        filename: filename
      });
    }
  } catch (error) {
    console.error('Error fetching house mechanics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch house mechanics data',
      error: error.message
    });
  }
});

// Admin API endpoints (now protected)
app.post('/api/admin/parse', authenticateAdmin, async (req, res) => {
  try {
    console.log('Running parser...');
    
    // Use the parser directly instead of subprocess
    const result = await runParser();
    res.json(result);
  } catch (error) {
    console.error('Parser error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Parser failed'
    });
  }
});

// SSE endpoint for streaming parser output
app.get('/api/admin/parse-stream', (req, res) => {
  // Custom authentication for SSE (query parameter)
  const token = req.query.token;
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    // Token is valid, proceed with SSE
    handleParseStream(req, res, user);
  });
});

async function handleParseStream(req, res, user) {
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to parser stream' })}\n\n`);

  // Function to send events to client
  const sendEvent = (type, message, data = null) => {
    const eventData = { type, message, timestamp: new Date().toISOString() };
    if (data) eventData.data = data;
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
  };

  try {
    // Run the streaming parser
    const result = await runStreamingParser(sendEvent);
    
    // Send final result
    sendEvent('completed', 'Parser completed successfully', result);
    
  } catch (error) {
    console.error('Streaming parser error:', error);
    sendEvent('error', `Parser failed: ${error.message}`);
  } finally {
    res.end();
  }
}

app.get('/api/admin/download-output', authenticateAdmin, async (req, res) => {
  try {
    const config = require('./src/parser/config').config;
    
    if (config.googleCloudStorage.enabled) {
      // Download from Google Cloud Storage
      const placesData = await googleCloudStorageService.downloadFile();
      
      if (!placesData) {
        return res.status(404).json({
          success: false,
          message: 'Output file not found. Run the parser first.'
        });
      }

      // Send as JSON download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=compound-places.json');
      res.send(JSON.stringify(placesData, null, 2));
    } else {
      // Fallback to local file system
      const outputPath = path.join(__dirname, 'src', 'parser', 'output', 'compound-places.json');
      
      if (!fs.existsSync(outputPath)) {
        return res.status(404).json({
          success: false,
          message: 'Output file not found. Run the parser first.'
        });
      }

      res.download(outputPath, 'compound-places.json', (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to download file'
          });
        }
      });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message
    });
  }
});

// Function to run the parser directly
async function runParser() {
  try {
    console.log('Starting parser...');
    
    // Use the imported runParse function
    await runParse();
    
    console.log('Parser completed successfully');
    
    // Read the generated output file
    const outputPath = path.join(__dirname, 'src', 'parser', 'output', 'compound-places.json');
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('Parser output file not found at: ' + outputPath);
    }
    
    const outputData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    
    // Calculate type breakdown
    const places = outputData.places || [];
    const typeBreakdown = places.reduce((acc, place) => {
      acc[place.type] = (acc[place.type] || 0) + 1;
      return acc;
    }, {});

    // Copy the output to the public directory so the app can use it (only if not using GCS)
    const config = require('./src/parser/config').config;
    if (!config.googleCloudStorage.enabled) {
      const publicPath = path.join(__dirname, 'public', 'compound-places.json');
      
      try {
        fs.copyFileSync(outputPath, publicPath);
        console.log('Successfully copied output file to public directory');
      } catch (copyError) {
        console.error('Failed to copy file to public directory:', copyError);
        throw new Error(`Failed to copy file to public directory: ${copyError.message}`);
      }
    } else {
      console.log('Using Google Cloud Storage - skipping local public directory copy');
    }

    return {
      success: true,
      message: 'Parser completed successfully',
      data: {
        totalPlaces: places.length,
        sourceDocTitle: outputData.metadata?.sourceDocTitle || 'Unknown',
        generatedAt: outputData.metadata?.generatedAt || new Date().toISOString(),
        typeBreakdown: typeBreakdown
      }
    };
  } catch (error) {
    console.error('Parser execution failed:', error);
    throw new Error(`Parser failed: ${error.message}`);
  }
}

// Function to run the parser with streaming events
async function runStreamingParser(sendEvent) {
  try {
    sendEvent('info', 'Starting parser...');
    
    // Import the parser and create a custom streaming version
    const { parser } = require('./src/parser/parser');
    const { googleDocsService } = require('./src/parser/google-docs');
    const { openaiService } = require('./src/parser/openai-service');
    const { webEnrichmentService } = require('./src/parser/web-enrichment-service');
    const { validateOutput } = require('./src/parser/schema');
    const config = require('./src/parser/config').config;
    
    const documentId = config.google.docId;
    
    sendEvent('info', `Parsing document: ${documentId}`);
    
    // Step 1: Load existing places
    sendEvent('step', 'Step 1: Loading existing places');
    const existingPlaces = await parser.loadExistingPlaces();
    sendEvent('info', `Loaded ${existingPlaces.length} existing places`);
    
    // Step 2: Fetch document from Google Docs
    sendEvent('step', 'Step 2: Fetching document from Google Docs');
    const documentData = await googleDocsService.getDocumentAsMarkdown(documentId);
    sendEvent('info', `Document fetched: "${documentData.title}"`);
    sendEvent('info', `Document content length: ${documentData.content.length} characters`);
    
    if (!documentData.content || documentData.content.trim().length === 0) {
      throw new Error('Document content is empty');
    }

    // Step 3: Parse with OpenAI
    sendEvent('step', 'Step 3: Parsing document with OpenAI');
    const parsedData = await openaiService.parseDocument(documentData.content, documentData.sections);
    sendEvent('info', `Found ${parsedData.places.length} places in document`);
    
    if (!parsedData.places || parsedData.places.length === 0) {
      throw new Error('No places found in document');
    }

    // Step 4: Generate unique IDs
    sendEvent('step', 'Step 4: Generating unique IDs for places');
    const placesWithIds = parsedData.places.map(place => ({
      ...place,
      id: place.id || parser.generatePlaceId(place.name)
    }));
    sendEvent('info', `Generated IDs for ${placesWithIds.length} places`);

    // Step 5: Enrich with Google Places API
    sendEvent('step', 'Step 5: Enriching places with Google Places API');
    let enrichedPlaces;
    try {
      enrichedPlaces = await webEnrichmentService.enrichPlaces(placesWithIds, existingPlaces);
      const enrichedCount = enrichedPlaces.filter(p => p.enrichmentStatus?.enriched).length;
      sendEvent('info', `Enriched ${enrichedCount} places with Google Places API data`);
    } catch (enrichError) {
      sendEvent('warning', `Google Places API enrichment failed: ${enrichError.message}`);
      enrichedPlaces = placesWithIds.map(place => ({
        ...place,
        enrichmentStatus: {
          enriched: false,
          enrichedAt: new Date().toISOString(),
          enrichmentVersion: config.parsing.enrichmentVersion,
          reason: `Google Places API enrichment failed: ${enrichError.message}`
        }
      }));
    }

    // Step 6: Generate summary
    sendEvent('step', 'Step 6: Generating summary');
    let summary;
    try {
      summary = await openaiService.generateSummary(enrichedPlaces);
      sendEvent('info', 'Summary generated successfully');
    } catch (summaryError) {
      sendEvent('warning', `Summary generation failed: ${summaryError.message}`);
      summary = `Vacation compound guide with ${enrichedPlaces.length} places`;
    }

    // Step 7: Build final output
    sendEvent('step', 'Step 7: Building final output');
    const finalOutput = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalPlaces: enrichedPlaces.length,
        sourceDocId: documentId,
        sourceDocTitle: documentData.title,
        parserVersion: '1.0.0',
        enrichmentVersion: config.parsing.enrichmentVersion,
        summary: summary,
        lastModified: documentData.lastModified,
        categories: [...new Set(enrichedPlaces.map(p => p.category).filter(Boolean))],
        enrichmentStats: {
          totalPlaces: enrichedPlaces.length,
          enrichedPlaces: enrichedPlaces.filter(p => p.enrichmentStatus?.enriched).length,
          skippedPlaces: enrichedPlaces.filter(p => p.enrichmentStatus?.enriched === false).length
        }
      },
      places: enrichedPlaces
    };

    // Step 8: Validate output
    sendEvent('step', 'Step 8: Validating output');
    try {
      validateOutput(finalOutput);
      sendEvent('info', 'Output validation successful');
    } catch (validationError) {
      sendEvent('warning', `Output validation failed: ${validationError.message}`);
    }

    // Step 9: Save output
    sendEvent('step', 'Step 9: Saving output');
    await parser.saveOutput(finalOutput);
    sendEvent('info', 'Output saved successfully');

    // Calculate type breakdown
    const places = finalOutput.places || [];
    const typeBreakdown = places.reduce((acc, place) => {
      acc[place.type] = (acc[place.type] || 0) + 1;
      return acc;
    }, {});

    // Copy to public directory if not using GCS
    if (!config.googleCloudStorage.enabled) {
      const outputPath = path.join(__dirname, 'src', 'parser', 'output', 'compound-places.json');
      const publicPath = path.join(__dirname, 'public', 'compound-places.json');
      
      try {
        fs.copyFileSync(outputPath, publicPath);
        sendEvent('info', 'Successfully copied output file to public directory');
      } catch (copyError) {
        sendEvent('warning', `Failed to copy file to public directory: ${copyError.message}`);
      }
    } else {
      sendEvent('info', 'Using Google Cloud Storage - skipping local public directory copy');
    }

    const result = {
      success: true,
      message: 'Parser completed successfully',
      data: {
        totalPlaces: places.length,
        sourceDocTitle: finalOutput.metadata?.sourceDocTitle || 'Unknown',
        generatedAt: finalOutput.metadata?.generatedAt || new Date().toISOString(),
        typeBreakdown: typeBreakdown
      }
    };

    sendEvent('info', `🎉 Parsing completed successfully! Generated ${result.data.totalPlaces} places`);
    sendEvent('info', `📊 Categories: ${finalOutput.metadata.categories.join(', ')}`);
    sendEvent('info', `📈 Enrichment stats: ${finalOutput.metadata.enrichmentStats.enrichedPlaces} enriched, ${finalOutput.metadata.enrichmentStats.skippedPlaces} skipped`);
    
    return result;
    
  } catch (error) {
    sendEvent('error', `Parser execution failed: ${error.message}`);
    throw new Error(`Parser failed: ${error.message}`);
  }
}

// Handle client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 