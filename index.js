/**
 * Crypto FM - Voice Server Entry Point for Vercel
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Create directories in /tmp for Vercel
const setupDirectories = () => {
  const dirs = [
    '/tmp/scripts',
    '/tmp/scripts/current',
    '/tmp/scripts/spoken'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
  
  // Create empty queue.json if it doesn't exist
  const queueFile = '/tmp/scripts/queue.json';
  if (!fs.existsSync(queueFile)) {
    fs.writeFileSync(queueFile, JSON.stringify({ lastPosition: 0, segments: [] }));
  }
};

// Try to set up directories
try {
  setupDirectories();
} catch (err) {
  console.error('Error setting up directories:', err);
}

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

// Check for new script segments
app.get('/voice/check-new', (req, res) => {
  try {
    const queuePath = '/tmp/scripts/queue.json';
    if (!fs.existsSync(queuePath)) {
      return res.json({ newContent: false });
    }

    const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    const pendingSegments = queue.segments.filter(s => s.status === 'pending').length;
    const readySegments = queue.segments.filter(s => s.status === 'ready').length;
    
    res.json({
      newContent: pendingSegments > 0 || readySegments > 0,
      pending: pendingSegments,
      ready: readySegments
    });
  } catch (error) {
    console.error('Error checking for new content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get the next segment to speak (simplified)
app.get('/voice/next-segment', (req, res) => {
  try {
    // For demonstration only - return mock data to show it's working
    res.json({
      hasSegment: true,
      id: Date.now(),
      audioUrl: null,
      text: "This is a placeholder text. The voice service is connected but actual content generation requires full implementation."
    });
  } catch (error) {
    console.error('Error getting next segment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark segment as spoken
app.post('/voice/mark-spoken', (req, res) => {
  res.json({ success: true });
});

// Status endpoint for debugging
app.get('/voice/status', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    directories: {
      tmp: fs.existsSync('/tmp'),
      scripts: fs.existsSync('/tmp/scripts'),
      current: fs.existsSync('/tmp/scripts/current')
    },
    segments: {
      total: 1,
      pending: 0,
      ready: 1,
      spoken: 0
    }
  });
});

// Export for Vercel
module.exports = app; 