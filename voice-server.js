/**
 * RADIOO - Voice Server
 * 
 * REST API server for voice integration, script management and frontend communication
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Load voice management module
const { 
  processFullScript, 
  getNextSegmentToSpeak, 
  generateAudio, 
  markSegmentAsSpoken,
  cleanupOldSpokenSegments
} = require('./voice-management');

const app = express();
const PORT = process.env.VOICE_PORT || 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static(path.join(__dirname, 'scripts/current')));
app.use('/spoken', express.static(path.join(__dirname, 'scripts/spoken')));

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Check for new script segments
 */
app.get('/api/check-new-segments', async (req, res) => {
  try {
    const newSegment = processFullScript();
    
    res.json({ 
      success: true, 
      hasNewSegment: !!newSegment,
      segment: newSegment ? {
        id: newSegment.id,
        timestamp: newSegment.timestamp,
        status: newSegment.status
      } : null
    });
  } catch (error) {
    console.error('Error checking new segments:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get the next segment to speak
 */
app.get('/api/next-segment', async (req, res) => {
  try {
    const segment = getNextSegmentToSpeak();
    
    if (!segment) {
      return res.json({ 
        success: true, 
        hasSegment: false 
      });
    }
    
    // If segment is pending, generate audio
    if (segment.status === 'pending' && !segment.audioFile) {
      console.log(`Generating audio for segment ${segment.id}`);
      
      const audioFile = await generateAudio(segment.text, segment.id);
      if (audioFile) {
        segment.audioFile = `/audio/${path.basename(audioFile)}`;
        segment.status = 'ready';
      }
    }
    
    res.json({ 
      success: true, 
      hasSegment: true,
      segment: {
        id: segment.id,
        text: segment.text,
        timestamp: segment.timestamp,
        audioUrl: segment.audioFile ? `/audio/${path.basename(segment.audioFile)}` : null,
        status: segment.status
      }
    });
  } catch (error) {
    console.error('Error getting next segment:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Mark segment as spoken
 */
app.post('/api/mark-spoken/:id', (req, res) => {
  try {
    const segmentId = parseInt(req.params.id);
    markSegmentAsSpoken(segmentId);
    
    res.json({ 
      success: true,
      message: `Segment ${segmentId} marked as spoken`
    });
  } catch (error) {
    console.error('Error marking segment as spoken:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Force regenerate audio for a segment
 */
app.post('/api/regenerate-audio/:id', async (req, res) => {
  try {
    const segmentId = parseInt(req.params.id);
    const segment = getNextSegmentToSpeak();
    
    if (segment && segment.id === segmentId) {
      const audioFile = await generateAudio(segment.text, segment.id);
      
      res.json({ 
        success: true, 
        audioUrl: audioFile ? `/audio/${path.basename(audioFile)}` : null
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Segment not found or not pending' 
      });
    }
  } catch (error) {
    console.error('Error regenerating audio:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Manually trigger cleanup of old spoken segments
 */
app.post('/api/cleanup', (req, res) => {
  try {
    cleanupOldSpokenSegments();
    res.json({ 
      success: true,
      message: 'Cleanup of old spoken segments completed'
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get status of script processing system
 */
app.get('/api/status', (req, res) => {
  try {
    // Check if directories exist
    const dirChecks = {
      scripts: fs.existsSync(path.join(__dirname, 'scripts')),
      current: fs.existsSync(path.join(__dirname, 'scripts/current')),
      spoken: fs.existsSync(path.join(__dirname, 'scripts/spoken'))
    };
    
    // Count files
    const counts = {
      current: dirChecks.current ? 
        fs.readdirSync(path.join(__dirname, 'scripts/current')).filter(f => f.endsWith('.mp3')).length : 0,
      spoken: dirChecks.spoken ? 
        fs.readdirSync(path.join(__dirname, 'scripts/spoken')).filter(f => f.endsWith('.mp3')).length : 0,
    };
    
    // Check queue
    let queue = { segments: [] };
    if (fs.existsSync(path.join(__dirname, 'scripts/queue.json'))) {
      try {
        queue = JSON.parse(fs.readFileSync(path.join(__dirname, 'scripts/queue.json'), 'utf8'));
      } catch (e) {
        console.error('Error parsing queue file:', e);
      }
    }
    
    // Segment stats
    const segmentStats = {
      total: queue.segments.length,
      pending: queue.segments.filter(s => s.status === 'pending').length,
      ready: queue.segments.filter(s => s.status === 'ready').length,
      spoken: queue.segments.filter(s => s.status === 'spoken').length
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      directories: dirChecks,
      files: counts,
      segments: segmentStats,
      lastPosition: queue.lastPosition || 0
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║            🎙️ RADIOO VOICE SERVER STARTED 🎙️                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Voice server running on port ${PORT}
- Audio files served from: scripts/current
- Archive directory: scripts/spoken
- Google Cloud TTS integration enabled
- Frontend available at: http://localhost:${PORT}

Press Ctrl+C to stop the server.
`);

  // Start periodic check for new segments
  const CHECK_INTERVAL = 10000; // 10 seconds
  setInterval(() => {
    try {
      processFullScript();
    } catch (error) {
      console.error('Error in periodic script processing:', error);
    }
  }, CHECK_INTERVAL);
  
  // Daily cleanup
  cleanupOldSpokenSegments();
}); 