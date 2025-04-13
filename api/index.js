/**
 * Crypto FM - API Route for Vercel
 */

// This is a minimal serverless function for Vercel
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Simple response for testing
  res.status(200).json({
    status: 'ok',
    service: 'Crypto FM API',
    path: req.url,
    method: req.method,
    time: new Date().toISOString(),
    message: 'API is working correctly'
  });
}; 