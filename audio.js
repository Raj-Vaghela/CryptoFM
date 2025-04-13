/**
 * Crypto FM - Audio File Serving API
 * 
 * This endpoint serves generated audio files from the temporary storage
 */

const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Extract filename from query parameters or URL path
  const fileName = req.query.file || (req.url.split('/').pop() || '');
  
  if (!fileName || !fileName.endsWith('.mp3')) {
    return res.status(400).json({
      error: 'Invalid or missing audio file name'
    });
  }
  
  // Security check to prevent directory traversal
  const sanitizedFileName = path.basename(fileName);
  
  // Construct file path
  const audioPath = path.join('/tmp/audio', sanitizedFileName);
  
  console.log(`Attempting to serve audio file: ${audioPath}`);
  
  // Check if the file exists
  if (!fs.existsSync(audioPath)) {
    console.error(`Audio file not found: ${audioPath}`);
    return res.status(404).json({
      error: 'Audio file not found'
    });
  }
  
  try {
    // Read the file
    const audioData = fs.readFileSync(audioPath);
    
    // Set content type and other headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioData.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the file
    return res.status(200).end(audioData);
  } catch (error) {
    console.error(`Error serving audio file: ${error.message}`);
    return res.status(500).json({
      error: 'Error reading audio file'
    });
  }
}; 