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
  
  // Return a segment with a public audio URL that works
  // Using a Creative Commons audio sample that's publicly available
  res.status(200).json({
    hasSegment: true,
    id: Date.now(),
    audioUrl: "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav",
    text: "Welcome to Crypto FM! Today we're looking at market trends for Bitcoin, Ethereum, and other major cryptocurrencies. Bitcoin has seen significant movement in the past 24 hours, while Ethereum continues its steady growth."
  });
}; 