/**
 * Crypto FM - Voice Management System
 * 
 * Handles script tracking, Google Cloud TTS integration, and audio file management
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Directory structure
const SCRIPTS_DIR = path.join(__dirname, 'scripts');
const SPOKEN_DIR = path.join(__dirname, 'scripts/spoken');
const CURRENT_DIR = path.join(__dirname, 'scripts/current');
const QUEUE_FILE = path.join(__dirname, 'scripts/queue.json');

// Google Cloud TTS Configuration
const GOOGLE_CLOUD_TTS_API_KEY = process.env.GOOGLE_CLOUD_TTS_API_KEY || "AIzaSyAOloEpj-ZHJF6U08cDq9FbpYiLzosKQ5Y";
const GCP_VOICE_LANGUAGE = process.env.GCP_VOICE_LANGUAGE || 'en-GB';
const GCP_VOICE_GENDER = process.env.GCP_VOICE_GENDER || 'MALE';

// Voice selection based on language
const GCP_VOICE_NAME = GCP_VOICE_LANGUAGE === 'en-US' 
  ? 'en-US-Neural2-J' // American voice with neural quality
  : 'en-GB-Neural2-B'; // British voice with neural quality

const TTS_API_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Archive configuration
const MAX_SCRIPT_AGE_DAYS = 7; // Keep spoken scripts for 7 days

// Ensure directories exist
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

// Read the script queue
function getScriptQueue() {
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

// Update the script queue
function updateScriptQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

// Add a new segment to the queue
function addSegmentToQueue(segment, timestamp) {
  const queue = getScriptQueue();
  const segmentId = Date.now();
  
  queue.segments.push({
    id: segmentId,
    text: segment,
    timestamp: timestamp || new Date().toISOString(),
    status: 'pending',
    audioFile: null
  });
  
  updateScriptQueue(queue);
  return queue.segments[queue.segments.length - 1];
}

// Mark segment as spoken
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

// Get the next segment to speak
function getNextSegmentToSpeak() {
  const queue = getScriptQueue();
  return queue.segments.find(s => s.status === 'pending' || s.status === 'ready');
}

/**
 * Generate audio from script using Google Cloud TTS with API key
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
        // Look for periods followed by space or newline, question marks, or exclamation points
        const chunk = cleanText.substring(startIndex, endIndex);
        const sentenceEndRegex = /[.!?]\s+(?=[A-Z])/g;
        let matches = [...chunk.matchAll(sentenceEndRegex)];
        
        if (matches.length > 0) {
          // Use the last sentence end found
          const lastMatch = matches[matches.length - 1];
          endIndex = startIndex + lastMatch.index + 2; // +2 to include the punctuation and space
        } else {
          // If no sentence end found, look for commas as fallback
          const lastComma = chunk.lastIndexOf(', ');
          if (lastComma > 0) {
            endIndex = startIndex + lastComma + 2;
          }
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
      
      // Configure audio settings based on voice language
      const audioConfig = {
        audioEncoding: 'MP3'
      };
      
      // Only add speakingRate for en-US voices (not supported for en-GB HD voices)
      if (GCP_VOICE_LANGUAGE === 'en-US') {
        audioConfig.speakingRate = 0.97; // Slightly slower for better clarity
        audioConfig.pitch = 0.0;
        audioConfig.volumeGainDb = 0.0;
      }
      
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
          audioConfig: audioConfig
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
      console.error('API Response:', error.response.data);
    }
    return null;
  }
}

// Clean up old spoken segments
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

// Read the full script and extract new segments
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

module.exports = {
  processFullScript,
  getNextSegmentToSpeak,
  generateAudio,
  markSegmentAsSpoken,
  cleanupOldSpokenSegments
}; 