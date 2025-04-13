// Simple health check API route
module.exports = (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Return health info
  res.json({
    status: 'ok',
    message: 'Health check endpoint is working',
    environment: process.env.NODE_ENV || 'development',
    serverTime: new Date().toISOString(),
    // Include information about the directory structure
    directories: {
      tmp: {
        exists: require('fs').existsSync('/tmp'),
        writeable: (() => {
          try {
            require('fs').writeFileSync('/tmp/.test', 'test');
            require('fs').unlinkSync('/tmp/.test');
            return true;
          } catch (e) {
            return false;
          }
        })()
      }
    }
  });
}; 