/**
 * Crypto FM - Next Segment API Route
 */

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Return a mock segment for demonstration
  res.status(200).json({
    hasSegment: true,
    id: Date.now(),
    audioUrl: null,
    text: "This is a placeholder text from the API route. Your frontend is now successfully connected to the backend."
  });
}; 