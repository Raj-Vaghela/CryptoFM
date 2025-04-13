/**
 * Crypto FM - Simple Serverless Entry Point
 */

const express = require('express');
const cors = require('cors');

// Create a simple Express app
const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Crypto FM Voice Server',
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  });
});

// Voice health check endpoint
app.get('/voice/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Voice service available',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Environment information
app.get('/debug', (req, res) => {
  // Check tmp directory
  const fs = require('fs');
  let tmpWritable = false;
  
  try {
    fs.writeFileSync('/tmp/test.txt', 'test');
    fs.unlinkSync('/tmp/test.txt');
    tmpWritable = true;
  } catch (error) {
    console.error('Error with tmp directory:', error);
  }
  
  res.json({
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform,
    directories: {
      tmp: {
        exists: fs.existsSync('/tmp'),
        writable: tmpWritable
      }
    },
    env: {
      // Only include safe environment variables
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL
    }
  });
});

// Export for Vercel
module.exports = app; 