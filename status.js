/**
 * Crypto FM - Status API Route
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
  
  console.log('API Route: /status was called');
  
  // Create simple status response
  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    directories: {
      tmp: true,
      scripts: true,
      current: true
    },
    segments: {
      total: 1,
      pending: 0,
      ready: 1,
      spoken: 0
    },
    lastPosition: 0
  });
}; 