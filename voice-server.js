/**
 * Crypto FM - Voice Server
 * 
 * This module provides a REST API server for voice integration, script management and frontend communication.
 * It handles:
 *  - Converting text scripts to speech using Google Cloud TTS
 *  - Serving audio files to the frontend player
 *  - Managing the queue of spoken and pending scripts
 *  - Providing API endpoints for the frontend to interact with
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
require('dotenv').config();

// Import voice management functions from the voice-management module
const { 
  processFullScript, // Processes new content from the full script
  getNextSegmentToSpeak, // Gets the next segment in queue
  generateAudio, // Converts text to speech
  generateAudioStream, // New function for streaming
  markSegmentAsSpoken, // Updates segment status after playback
  cleanupOldSpokenSegments, // Removes old spoken segments
  getScriptQueue // Added for the new streaming endpoint
} = require('./voice-management');

const app = express();
const PORT = process.env.VOICE_PORT || 3001;

// Enable CORS for cross-origin requests and JSON request parsing
app.use(cors());
app.use(express.json());

// Configure static file serving:
// - Serve main frontend files from public directory
// - Serve current audio files from scripts/current directory
// - Serve archived audio from scripts/spoken directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static(path.join(__dirname, 'scripts/current')));
app.use('/spoken', express.static(path.join(__dirname, 'scripts/spoken')));

/**
 * Health check endpoint - used to verify server is running
 * Returns: {status: "ok", timestamp: <current date/time>}
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Check for new script segments endpoint
 * Processes the full script file to find new content
 * 
 * Returns:
 * - success: Boolean indicating if operation was successful
 * - hasNewSegment: Boolean indicating if a new segment was found
 * - segment: Object with new segment details (if found)
 */
app.get('/api/check-new-segments', async (req, res) => {
  try {
    // Process the full script to extract new content
    const newSegment = processFullScript();
    
    // Return response with segment info if found
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
 * Get the next segment to speak endpoint
 * Retrieves the next pending/ready segment and generates audio if needed
 * 
 * Returns:
 * - success: Boolean indicating if operation was successful
 * - hasSegment: Boolean indicating if a segment was found
 * - segment: Object with segment details (text, audio URL, etc.)
 */
app.get('/api/next-segment', async (req, res) => {
  try {
    // Get the next segment that needs to be spoken
    const segment = getNextSegmentToSpeak();
    
    // If no segment available, return success but hasSegment=false
    if (!segment) {
      return res.json({ 
        success: true, 
        hasSegment: false 
      });
    }
    
    // If segment is pending and doesn't have audio yet, generate it
    if (segment.status === 'pending' && !segment.audioFile) {
      console.log(`Generating audio for segment ${segment.id}`);
      
      // Convert text to speech using Google Cloud TTS
      const audioFile = await generateAudio(segment.text, segment.id);
      if (audioFile) {
        // Update segment with audio file path
        segment.audioFile = `/audio/${path.basename(audioFile)}`;
        segment.status = 'ready';
      }
    }
    
    // Return segment details including audio URL
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
 * Mark segment as spoken endpoint
 * Updates a segment's status to 'spoken' after playback
 * 
 * Params:
 * - id: Segment ID to mark as spoken
 * 
 * Returns:
 * - success: Boolean indicating if operation was successful
 * - message: Confirmation message
 */
app.post('/api/mark-spoken/:id', (req, res) => {
  try {
    const segmentId = parseInt(req.params.id);
    // Update segment status and move audio file
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
 * Force regenerate audio for a segment endpoint
 * Regenerates audio for a specific segment (useful if TTS failed)
 * 
 * Params:
 * - id: Segment ID to regenerate audio for
 * 
 * Returns:
 * - success: Boolean indicating if operation was successful
 * - audioUrl: URL to the new audio file (if successful)
 */
app.post('/api/regenerate-audio/:id', async (req, res) => {
  try {
    const segmentId = parseInt(req.params.id);
    const segment = getNextSegmentToSpeak();
    
    // Check if segment exists and matches the requested ID
    if (segment && segment.id === segmentId) {
      // Regenerate audio for the segment
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
 * Manually trigger cleanup of old spoken segments endpoint
 * Removes old spoken segments to save disk space
 * 
 * Returns:
 * - success: Boolean indicating if operation was successful
 * - message: Confirmation message
 */
app.post('/api/cleanup', (req, res) => {
  try {
    // Remove old segments based on configured retention period
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
 * Get status of script processing system endpoint
 * Provides diagnostics about the voice system's current state
 * 
 * Returns:
 * - success: Boolean indicating if status check was successful
 * - status: Object with system status details
 *   - directories: Status of required directories
 *   - counts: Number of audio files in each directory
 *   - queue: Status of the script queue
 */
app.get('/api/status', (req, res) => {
  try {
    // Check if required directories exist
    const dirChecks = {
      scripts: fs.existsSync(path.join(__dirname, 'scripts')),
      current: fs.existsSync(path.join(__dirname, 'scripts/current')),
      spoken: fs.existsSync(path.join(__dirname, 'scripts/spoken'))
    };
    
    // Count audio files in each directory
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
        // Parse the queue file to get current segments
        queue = JSON.parse(fs.readFileSync(path.join(__dirname, 'scripts/queue.json'), 'utf8'));
      } catch (e) {
        console.error('Error parsing queue file:', e);
      }
    }
    
    // Calculate statistics for segments by status
    const segmentStats = {
      total: queue.segments.length,
      pending: queue.segments.filter(s => s.status === 'pending').length,
      ready: queue.segments.filter(s => s.status === 'ready').length,
      spoken: queue.segments.filter(s => s.status === 'spoken').length
    };
    
    // Return comprehensive status of the voice system
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

/**
 * Streaming endpoint for audio
 * Streams the audio directly from Google TTS without saving to file
 */
app.get('/api/stream-audio/:segmentId', async (req, res) => {
  try {
    const { segmentId } = req.params;
    const queue = getScriptQueue();
    const segment = queue.segments.find(s => s.id === parseInt(segmentId));
    
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Generate and stream the audio
    const audioStream = await generateAudioStream(segment.text, segmentId);
    
    // Pipe the audio stream to the response
    audioStream.pipe(res);
    
    // Handle stream errors
    audioStream.on('error', (error) => {
      console.error('Stream error:', error);
      res.end();
    });
    
    // Mark segment as spoken when streaming completes
    audioStream.on('end', () => {
      markSegmentAsSpoken(segmentId);
    });
    
  } catch (error) {
    console.error('Error streaming audio:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start the server and initialize background processes
 * - Sets up periodic script processing
 * - Performs initial cleanup of old segments
 * - Displays server information in the console
 */
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║            🎙️ CRYPTO FM VOICE SERVER STARTED 🎙️            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Voice server running on port ${PORT}
- Audio files served from: scripts/current
- Archive directory: scripts/spoken
- Google Cloud TTS integration enabled
- Frontend available at: http://localhost:${PORT}

Press Ctrl+C to stop the server.
`);

  // Start periodic check for new segments (every 10 seconds)
  const CHECK_INTERVAL = 10000; // 10 seconds
  setInterval(() => {
    try {
      // Process new content from the full script periodically
      processFullScript();
    } catch (error) {
      console.error('Error in periodic script processing:', error);
    }
  }, CHECK_INTERVAL);
  
  // Perform initial cleanup of old spoken segments
  cleanupOldSpokenSegments();
}); 