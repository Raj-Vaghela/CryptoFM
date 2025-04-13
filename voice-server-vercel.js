/**
 * Crypto FM - Voice Server (Vercel Adapter)
 * 
 * This is a simplified version of voice-server.js for Vercel serverless environment.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { 
  getScriptQueue, 
  addSegmentToQueue, 
  markSegmentAsSpoken, 
  getNextSegmentToSpeak, 
  generateAudio, 
  cleanupOldSpokenSegments 
} = require('./voice-management');

// Set up server
const app = express();
app.use(cors());
app.use(express.json());

// Ensure directories exist
try {
  // Load and run setup script
  require('./vercel-setup').ensureDirectories();
} catch (error) {
  console.error('Error setting up Vercel environment:', error);
}

// Set paths for Vercel
const SCRIPTS_DIR = '/tmp/scripts';
const CURRENT_DIR = '/tmp/scripts/current';
app.use('/audio', express.static(CURRENT_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/voice/health', (req, res) => {
  res.json({ status: 'ok', message: 'Voice server running' });
});

// Check for new script segments
app.get('/voice/check-new', (req, res) => {
  try {
    // Updated to work with temp directory
    const queuePath = path.join(SCRIPTS_DIR, 'queue.json');
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

// Get the next segment to speak
app.get('/voice/next-segment', async (req, res) => {
  try {
    const nextSegment = getNextSegmentToSpeak();
    
    if (!nextSegment) {
      return res.json({ hasSegment: false });
    }
    
    // Generate audio if not already done
    if (nextSegment.status === 'pending' && !nextSegment.audioFile) {
      try {
        await generateAudio(nextSegment.text, nextSegment.id);
      } catch (error) {
        console.error('Error generating audio:', error);
      }
    }
    
    // If the segment has an audio file, return it
    if (nextSegment.audioFile) {
      const filename = path.basename(nextSegment.audioFile);
      res.json({
        hasSegment: true,
        id: nextSegment.id,
        audioUrl: `/audio/${filename}`,
        text: nextSegment.text
      });
    } else {
      // If audio generation failed
      res.json({
        hasSegment: true,
        id: nextSegment.id,
        audioUrl: null,
        text: nextSegment.text,
        error: 'Audio generation failed'
      });
    }
  } catch (error) {
    console.error('Error getting next segment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark segment as spoken
app.post('/voice/mark-spoken', (req, res) => {
  const { segmentId } = req.body;
  
  if (!segmentId) {
    return res.status(400).json({ error: 'Missing segmentId parameter' });
  }
  
  try {
    markSegmentAsSpoken(parseInt(segmentId));
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking segment as spoken:', error);
    res.status(500).json({ error: error.message });
  }
});

// Force regenerate audio for a segment
app.post('/voice/regenerate-audio', async (req, res) => {
  const { segmentId } = req.body;
  
  if (!segmentId) {
    return res.status(400).json({ error: 'Missing segmentId parameter' });
  }
  
  try {
    const queue = getScriptQueue();
    const segment = queue.segments.find(s => s.id === parseInt(segmentId));
    
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    const audioPath = await generateAudio(segment.text, segment.id);
    
    if (audioPath) {
      const filename = path.basename(audioPath);
      res.json({
        success: true,
        audioUrl: `/audio/${filename}`
      });
    } else {
      res.status(500).json({ error: 'Audio generation failed' });
    }
  } catch (error) {
    console.error('Error regenerating audio:', error);
    res.status(500).json({ error: error.message });
  }
});

// For local testing - not used on Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.VOICE_PORT || process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Voice server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app; 