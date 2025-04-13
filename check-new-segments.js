/**
 * Crypto FM - Check New Segments API Route (Root Level)
 */

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('API Route: /check-new-segments was called (root level)');
  
  // Return data indicating we always have content available
  // This ensures the frontend will always try to fetch a new segment
  res.status(200).json({
    success: true,
    newContent: true,
    pending: 1,
    ready: 0,
    lastUpdate: new Date().toISOString()
  });
}; 