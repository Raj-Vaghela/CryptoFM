/**
 * Crypto FM - Next Segment API Route (Root Level)
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
  
  console.log('API Route: /next-segment was called (root level)');
  
  // Return a mock segment for demonstration
  res.status(200).json({
    hasSegment: true,
    id: Date.now(),
    audioUrl: null,
    text: "This is a placeholder text from the root-level API route. Your frontend is now successfully connected to the backend."
  });
}; 