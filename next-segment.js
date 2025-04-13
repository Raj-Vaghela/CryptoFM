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
  
  // Try a different audio source - GitHub hosted MP3
  const audioUrl = "https://github.com/anars/blank-audio/raw/master/1-second-of-silence.mp3";
  
  console.log(`Returning segment with audio URL: ${audioUrl}`);
  
  // Return a segment with a widely compatible audio URL
  const response = {
    hasSegment: true,
    id: Date.now(),
    audioUrl: audioUrl,
    text: "Welcome to Crypto FM! Today we're looking at market trends for Bitcoin, Ethereum, and other major cryptocurrencies. Bitcoin has seen significant movement in the past 24 hours, while Ethereum continues its steady growth."
  };
  
  console.log('Response payload:', JSON.stringify(response));
  
  res.status(200).json(response);
}; 