const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
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

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // Default: 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 5; // Default: 5 attempts
const RATE_LIMIT_WINDOW_MINUTES = Math.floor(RATE_LIMIT_WINDOW_MS / 60000); // Convert to minutes for message

const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_ATTEMPTS,
  message: {
    success: false,
    message: `Too many login attempts from this IP, please try again in ${RATE_LIMIT_WINDOW_MINUTES} minutes.`
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: true,
  // Custom key generator to handle both IP and user agent for better security
  keyGenerator: (req) => {
    return req.ip + ':' + (req.get('User-Agent') || '');
  }
});

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
app.post('/api/auth/login', loginLimiter, async (req, res) => {
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

// Token verification endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  // If we reach here, the token is valid (checked by middleware)
  res.json({
    success: true,
    valid: true,
    role: req.user.role,
    timestamp: req.user.timestamp,
    message: 'Token is valid'
  });
});

// Import the parser functions
const { runParse, runParseWithStreaming } = require('./src/parser/index');
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

// Parser status tracking for polling approach
let parserStatus = {
  isRunning: false,
  currentStep: '',
  logs: [],
  result: null,
  error: null,
  startTime: null,
  lastUpdate: null
};

// Add status event to parser status
const addStatusEvent = (type, message, data = null) => {
  const event = {
    type,
    message,
    timestamp: new Date().toISOString(),
    data
  };
  
  parserStatus.logs.push(event);
  parserStatus.lastUpdate = new Date().toISOString();
  
  if (type === 'step') {
    parserStatus.currentStep = message;
  }
  
  // Keep only last 100 log entries to prevent memory issues
  if (parserStatus.logs.length > 100) {
    parserStatus.logs = parserStatus.logs.slice(-100);
  }
  
  console.log(`[PARSER-STATUS] ${type}: ${message}`);
};

// Polling-based parser endpoint
app.post('/api/admin/parse-polling', authenticateAdmin, async (req, res) => {
  if (parserStatus.isRunning) {
    return res.json({
      success: false,
      message: 'Parser is already running'
    });
  }

  // Reset status
  parserStatus = {
    isRunning: true,
    currentStep: 'Starting...',
    logs: [],
    result: null,
    error: null,
    startTime: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  };

  // Start parser in background
  runParserAsync();

  res.json({
    success: true,
    message: 'Parser started successfully',
    data: {
      isRunning: true,
      startTime: parserStatus.startTime
    }
  });
});

// Get parser status for polling
app.get('/api/admin/parse-status', authenticateAdmin, (req, res) => {
  res.json({
    success: true,
    data: parserStatus
  });
});

// Stop parser (if possible)
app.post('/api/admin/parse-stop', authenticateAdmin, (req, res) => {
  if (!parserStatus.isRunning) {
    return res.json({
      success: false,
      message: 'Parser is not running'
    });
  }

  // Mark as stopped (the actual parser may continue but we'll ignore its updates)
  parserStatus.isRunning = false;
  parserStatus.currentStep = 'Stopped by user';
  addStatusEvent('info', 'Parser stopped by user');

  res.json({
    success: true,
    message: 'Parser stop requested'
  });
});

// Async parser function that updates status
async function runParserAsync() {
  try {
    addStatusEvent('info', 'Starting parser...');
    
    // Use the parser with status callback
    const result = await runParseWithStreaming(null, addStatusEvent);
    
    parserStatus.isRunning = false;
    parserStatus.result = result;
    parserStatus.currentStep = 'Completed';
    addStatusEvent('completed', 'Parser completed successfully', result);
    
    // Handle file copying for local development if needed
    const config = require('./src/parser/config').config;
    if (!config.googleCloudStorage.enabled) {
      const outputPath = path.join(__dirname, 'src', 'parser', 'output', 'compound-places.json');
      const publicPath = path.join(__dirname, 'public', 'compound-places.json');
      
      if (fs.existsSync(outputPath)) {
        try {
          fs.copyFileSync(outputPath, publicPath);
          console.log('Successfully copied output file to public directory');
        } catch (copyError) {
          console.error('Failed to copy file to public directory:', copyError);
        }
      }
    }
    
  } catch (error) {
    console.error('Async parser execution failed:', error);
    parserStatus.isRunning = false;
    parserStatus.error = error.message;
    parserStatus.currentStep = 'Error';
    addStatusEvent('error', `Parser failed: ${error.message}`);
  }
}

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
    
    // Use the imported runParse function - it handles all the logic now
    await runParse();
    
    console.log('Parser completed successfully');
    
    // Handle file copying for local development if needed
    const config = require('./src/parser/config').config;
    if (!config.googleCloudStorage.enabled) {
      const outputPath = path.join(__dirname, 'src', 'parser', 'output', 'compound-places.json');
      const publicPath = path.join(__dirname, 'public', 'compound-places.json');
      
      if (fs.existsSync(outputPath)) {
        try {
          fs.copyFileSync(outputPath, publicPath);
          console.log('Successfully copied output file to public directory');
        } catch (copyError) {
          console.error('Failed to copy file to public directory:', copyError);
          // Don't fail the entire operation for copy errors
        }
      }
    }

    // Read the result data for response
    let outputData;
    if (config.googleCloudStorage.enabled) {
      outputData = await googleCloudStorageService.downloadFile();
    } else {
      const outputPath = path.join(__dirname, 'src', 'parser', 'output', 'compound-places.json');
      if (fs.existsSync(outputPath)) {
        outputData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      }
    }

    if (!outputData) {
      throw new Error('Parser output not found after completion');
    }

    // Calculate type breakdown
    const places = outputData.places || [];
    const typeBreakdown = places.reduce((acc, place) => {
      acc[place.type] = (acc[place.type] || 0) + 1;
      return acc;
    }, {});

    return {
      success: true,
      message: 'Parser completed successfully',
      data: {
        totalPlaces: places.length,
        sourceDocTitle: outputData.metadata?.sourceDocTitle || 'Unknown',
        generatedAt: outputData.metadata?.generatedAt || new Date().toISOString(),
        typeBreakdown: typeBreakdown,
        categories: outputData.metadata?.categories || [],
        enrichmentStats: outputData.metadata?.enrichmentStats || {},
        houseMechanics: outputData.metadata?.houseMechanics || { processed: false }
      }
    };
  } catch (error) {
    console.error('Parser execution failed:', error);
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