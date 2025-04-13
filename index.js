/**
 * RADIOO - Cryptocurrency Data Logger
 * 
 * Main entry point - redirects to monitor.js
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                   📡  RADIOO  📡                              ║
║                 Cryptocurrency Data Logger                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

RADIOO Data Logger

This service fetches and logs cryptocurrency data at regular intervals.
Starting the data logging service with crash recovery monitor...

For more information, see README.md
`);

// Launch the monitor
require('./monitor');

// Simple entrypoint for Vercel
// This re-exports the Express app from voice-server-vercel.js

module.exports = require('./voice-server-vercel.js'); 