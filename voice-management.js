/**
 * Crypto FM - Voice Management System
 * 
 * Handles script tracking, Google Cloud TTS integration, and audio file management.
 * This module provides core functionality for:
 * - Managing the queue of text segments to be spoken
 * - Converting text to speech using Google Cloud TTS
 * - Organizing audio files between current and archive directories
 * - Cleaning up old spoken segments
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Check for production environment (Vercel)
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Directory structure configuration
 * In production (Vercel), use /tmp directory which is writable
 * In development, use local directories relative to the module
 */
const SCRIPTS_DIR = isProduction ? '/tmp/scripts' : path.join(__dirname, 'scripts');
const SPOKEN_DIR = isProduction ? '/tmp/scripts/spoken' : path.join(__dirname, 'scripts/spoken');
const CURRENT_DIR = isProduction ? '/tmp/scripts/current' : path.join(__dirname, 'scripts/current');
const QUEUE_FILE = isProduction ? '/tmp/scripts/queue.json' : path.join(__dirname, 'scripts/queue.json');

/**
 * Google Cloud Text-to-Speech API Configuration
 * Uses environment variables for API key and voice settings
 */
const GOOGLE_CLOUD_TTS_API_KEY = process.env.GOOGLE_CLOUD_TTS_API_KEY;
const GCP_VOICE_NAME = 'en-GB-Chirp3-HD-Orus'; // British voice with premium quality
const GCP_VOICE_LANGUAGE = process.env.GCP_VOICE_LANGUAGE || 'en-GB';
const GCP_VOICE_GENDER = process.env.GCP_VOICE_GENDER || 'MALE';
const TTS_API_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Archive configuration
const MAX_SCRIPT_AGE_DAYS = 7; // Keep spoken scripts for 7 days

/**
 * Initialize directory structure and queue file
 * Creates necessary directories if they don't exist
 */
[SPOKEN_DIR, CURRENT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize queue if it doesn't exist
if (!fs.existsSync(QUEUE_FILE)) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify({
    lastPosition: 0,
    segments: []
  }));
}

// Check if Google Cloud API key is set
if (!GOOGLE_CLOUD_TTS_API_KEY) {
  console.warn('WARNING: GOOGLE_CLOUD_TTS_API_KEY environment variable not set. Text-to-speech functionality will not work.');
} else {
  console.log('Google Cloud TTS API key configured successfully');
}

/**
 * Read the script queue from file
 * @returns {Object} Queue object containing segments and lastPosition
 */
function getScriptQueue() {
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

/**
 * Update the script queue on disk
 * @param {Object} queue - The updated queue object
 */
function updateScriptQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

/**
 * Add a new segment to the queue
 * @param {string} segment - Text content to be spoken
 * @param {string} timestamp - Optional timestamp (defaults to current time)
 * @returns {Object} The newly created segment object
 */
function addSegmentToQueue(segment, timestamp) {
  const queue = getScriptQueue();
  const segmentId = Date.now();
  
  queue.segments.push({
    id: segmentId,
    text: segment,
    timestamp: timestamp || new Date().toISOString(),
    status: 'pending', // Possible statuses: pending, ready, spoken
    audioFile: null
  });
  
  updateScriptQueue(queue);
  return queue.segments[queue.segments.length - 1];
}

/**
 * Mark a segment as spoken and move its audio file to the archive
 * @param {number} segmentId - ID of the segment to mark as spoken
 */
function markSegmentAsSpoken(segmentId) {
  const queue = getScriptQueue();
  const segment = queue.segments.find(s => s.id === segmentId);
  
  if (segment) {
    segment.status = 'spoken';
    segment.spokenAt = new Date().toISOString();
    updateScriptQueue(queue);
    
    // Move to spoken directory if there's an audio file
    if (segment.audioFile && fs.existsSync(segment.audioFile)) {
      const spokenFile = path.join(SPOKEN_DIR, path.basename(segment.audioFile));
      fs.renameSync(segment.audioFile, spokenFile);
      segment.audioFile = spokenFile;
      updateScriptQueue(queue);
    }
  }
}

/**
 * Get the next segment that needs to be spoken
 * Returns the first segment with status 'pending' or 'ready'
 * @returns {Object|undefined} The next segment or undefined if none available
 */
function getNextSegmentToSpeak() {
  const queue = getScriptQueue();
  return queue.segments.find(s => s.status === 'pending' || s.status === 'ready');
}

/**
 * Generate audio from script using Google Cloud TTS with API key
 * Handles text cleaning, chunking for long texts, and audio file generation
 * 
 * @param {string} text - Text to convert to speech
 * @param {number} segmentId - ID of the segment
 * @returns {Promise<string|null>} Path to the audio file or null if error
 */
async function generateAudio(text, segmentId) {
  if (!GOOGLE_CLOUD_TTS_API_KEY) {
    console.error('Google Cloud TTS API key not configured');
    return null;
  }
  
  try {
    // Clean up text to avoid any unexpected characters
    // Remove any remaining sound effects or bracketed content
    let cleanText = text.replace(/\[.*?\]/g, '');
    
    // Remove any SSML tags if present
    cleanText = cleanText.replace(/<phoneme[^>]*>([^<]*)<\/phoneme>/g, '$1');
    cleanText = cleanText.replace(/<[^>]+>/g, ''); // Remove any remaining XML/SSML tags
    
    // Split text into smaller chunks if it's too long
    // Google TTS has a 5000 character limit per request
    const MAX_CHARS = 4500;
    const textChunks = [];
    
    if (cleanText.length > MAX_CHARS) {
      // Find sentence breaks to split text naturally
      let startIndex = 0;
      while (startIndex < cleanText.length) {
        let endIndex = startIndex + MAX_CHARS;
        if (endIndex >= cleanText.length) {
          textChunks.push(cleanText.substring(startIndex));
          break;
        }
        
        // Find the last sentence end before the limit
        const lastSentenceEnd = cleanText.substring(startIndex, endIndex).lastIndexOf('.');
        if (lastSentenceEnd > 0) {
          endIndex = startIndex + lastSentenceEnd + 1;
        }
        
        textChunks.push(cleanText.substring(startIndex, endIndex));
        startIndex = endIndex;
      }
    } else {
      textChunks.push(cleanText);
    }
    
    // Generate audio for each chunk and combine
    const audioBuffers = [];
    
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      
      // Make request to Google Cloud TTS using API key
      const response = await axios({
        method: 'POST',
        url: `${TTS_API_ENDPOINT}?key=${GOOGLE_CLOUD_TTS_API_KEY}`,
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          input: { text: chunk },
          voice: {
            languageCode: GCP_VOICE_LANGUAGE,
            name: GCP_VOICE_NAME,
            ssmlGender: GCP_VOICE_GENDER
          },
          audioConfig: { audioEncoding: 'MP3' }
        }
      });
      
      // Convert base64 audio content to buffer
      const audioContent = response.data.audioContent;
      const audioBuffer = Buffer.from(audioContent, 'base64');
      audioBuffers.push(audioBuffer);
    }
    
    // Combine audio chunks and save to file
    const combinedAudio = Buffer.concat(audioBuffers);
    const audioFile = path.join(CURRENT_DIR, `segment-${segmentId}.mp3`);
    fs.writeFileSync(audioFile, combinedAudio);
    
    // Update queue with audio file location
    const queue = getScriptQueue();
    const segment = queue.segments.find(s => s.id === segmentId);
    if (segment) {
      segment.audioFile = audioFile;
      segment.status = 'ready';
      updateScriptQueue(queue);
    }
    
    console.log(`Generated audio file: ${audioFile} (${combinedAudio.length} bytes)`);
    return audioFile;
  } catch (error) {
    console.error('Error generating audio with Google Cloud TTS:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    return null;
  }
}

/**
 * Clean up old spoken segments
 * Removes segments and audio files older than MAX_SCRIPT_AGE_DAYS
 */
function cleanupOldSpokenSegments() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAX_SCRIPT_AGE_DAYS);
  
  const queue = getScriptQueue();
  queue.segments = queue.segments.filter(segment => {
    if (segment.status === 'spoken' && new Date(segment.spokenAt) < cutoffDate) {
      // Delete the audio file if it exists
      if (segment.audioFile && fs.existsSync(segment.audioFile)) {
        fs.unlinkSync(segment.audioFile);
        console.log(`Deleted old audio file: ${segment.audioFile}`);
      }
      return false; // Remove from queue
    }
    return true; // Keep in queue
  });
  
  updateScriptQueue(queue);
  console.log(`Cleaned up old spoken segments older than ${MAX_SCRIPT_AGE_DAYS} days`);
}

/**
 * Read the full script and extract new segments
 * Checks if there's new content since the last read position
 * and adds it to the queue
 * 
 * @returns {Object|null} The newly created segment or null if no new content
 */
function processFullScript() {
  const fullScriptPath = path.join(SCRIPTS_DIR, 'full-script.txt');
  if (!fs.existsSync(fullScriptPath)) {
    console.warn('Full script file not found');
    return null;
  }
  
  const fullScript = fs.readFileSync(fullScriptPath, 'utf8');
  const queue = getScriptQueue();
  
  // Find position where we left off
  let startPosition = queue.lastPosition || 0;
  
  if (startPosition < fullScript.length) {
    // Extract the new content
    const newContent = fullScript.substring(startPosition);
    
    // Check if new content has at least one complete sentence
    if (newContent.trim() && /[.!?]/.test(newContent)) {
      // Update the last position
      queue.lastPosition = fullScript.length;
      updateScriptQueue(queue);
      
      // Clean up any bracketed content and SSML tags
      let cleanContent = newContent.replace(/\[.*?\]/g, '').trim();
      cleanContent = cleanContent.replace(/<phoneme[^>]*>([^<]*)<\/phoneme>/g, '$1');
      cleanContent = cleanContent.replace(/<[^>]+>/g, ''); // Remove any remaining XML/SSML tags
      
      // Add as new segment if there's new content
      if (cleanContent) {
        const newSegment = addSegmentToQueue(cleanContent);
        console.log(`Added new script segment: ${cleanContent.substring(0, 50)}...`);
        return newSegment;
      }
    }
  }
  
  return null;
}

// Run cleanup daily
setInterval(cleanupOldSpokenSegments, 24 * 60 * 60 * 1000);

/**
 * Export the public API of this module
 * These functions can be used by the voice server
 */
module.exports = {
  processFullScript,
  getNextSegmentToSpeak,
  generateAudio,
  markSegmentAsSpoken,
  cleanupOldSpokenSegments
}; 