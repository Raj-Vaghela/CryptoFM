/**
 * Crypto FM - Mark Segment as Spoken API Route (Root Level)
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
  
  // Log the request
  console.log('API Route: /mark-spoken was called', req.body);
  
  // Check if request body contains segmentId
  if (req.method === 'POST' && req.body && req.body.segmentId) {
    const segmentId = req.body.segmentId;
    console.log(`Marking segment ${segmentId} as spoken`);
    
    // For now, just return success since we're not actually marking anything
    res.status(200).json({
      success: true,
      message: `Segment ${segmentId} marked as spoken`
    });
  } else {
    // Handle invalid requests
    res.status(400).json({
      success: false,
      error: 'Missing segmentId in request body'
    });
  }
}; 