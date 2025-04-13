/**
 * Crypto FM - Debug Logs API Route
 * This endpoint is for debugging production issues
 */

// Simple in-memory log storage (will reset on serverless function restarts)
const debugLogs = [];

// Add logging capability to global scope
global.addDebugLog = (message, data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    data: data || null
  };
  debugLogs.push(logEntry);
  
  // Keep only the last 100 logs
  if (debugLogs.length > 100) {
    debugLogs.shift();
  }
  
  console.log(`DEBUG: ${message}`, data || '');
  return logEntry;
};

// Add initial log
global.addDebugLog('Debug logs initialized');

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Record this request
  global.addDebugLog('Debug logs endpoint accessed', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query
  });
  
  // If it's a POST, add custom log
  if (req.method === 'POST' && req.body) {
    try {
      global.addDebugLog('Client log received', req.body);
    } catch (e) {
      console.error('Error processing client log:', e);
    }
  }
  
  // Return all logs
  res.status(200).json({
    success: true,
    logs: debugLogs,
    count: debugLogs.length,
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      VERCEL: process.env.VERCEL === '1' ? true : false
    }
  });
}; 