/**
 * RADIOO Monitor
 * 
 * A simple process monitor that ensures the RADIOO data logger
 * keeps running continuously, even if it crashes.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVER_SCRIPT = path.join(__dirname, 'server.js');
const LOGS_DIR = path.join(__dirname, 'logs');
const MONITOR_LOG = path.join(LOGS_DIR, 'monitor.log');
const MAX_RESTART_ATTEMPTS = 10;
const RESTART_DELAY = 5000; // 5 seconds

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

// Log function with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(logMessage.trim());
  fs.appendFileSync(MONITOR_LOG, logMessage);
}

// Start server function
let restartCount = 0;
let serverProcess = null;

function startServer() {
  log(`Starting RADIOO server (attempt ${restartCount + 1})...`);
  
  // Spawn the server process
  serverProcess = spawn('node', [SERVER_SCRIPT], {
    stdio: 'pipe',
    detached: false
  });
  
  // Log the server output
  serverProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  // Handle server process events
  serverProcess.on('error', (error) => {
    log(`Failed to start server: ${error.message}`);
    handleServerExit(1);
  });
  
  serverProcess.on('exit', (code, signal) => {
    const exitReason = signal 
      ? `terminated due to signal ${signal}` 
      : `exited with code ${code}`;
    
    log(`Server process ${exitReason}`);
    handleServerExit(code);
  });
  
  log(`Server started with PID ${serverProcess.pid}`);
  restartCount++;
}

// Handle server exit or crash
function handleServerExit(code) {
  serverProcess = null;
  
  if (code !== 0) {
    log('Server crashed or exited unexpectedly');
    
    if (restartCount < MAX_RESTART_ATTEMPTS) {
      log(`Restarting server in ${RESTART_DELAY/1000} seconds...`);
      setTimeout(startServer, RESTART_DELAY);
    } else {
      log(`Maximum restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Giving up.`);
      process.exit(1);
    }
  } else {
    log('Server exited normally');
    process.exit(0);
  }
}

// Handle monitor process signals
process.on('SIGINT', () => {
  log('Monitor received SIGINT, shutting down server...');
  
  if (serverProcess) {
    serverProcess.kill('SIGINT');
    // Give the server time to shutdown gracefully
    setTimeout(() => {
      log('Monitor exiting');
      process.exit(0);
    }, 2000);
  } else {
    log('No server process running');
    process.exit(0);
  }
});

// Handle uncaught exceptions in the monitor
process.on('uncaughtException', (err) => {
  log(`Monitor uncaught exception: ${err.message}`);
  log(err.stack);
  
  if (serverProcess) {
    log('Attempting to terminate server process before exiting...');
    serverProcess.kill('SIGINT');
  }
  
  // Exit after a delay to let logs flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Start the monitor
log('RADIOO Monitor started');
log(`Maximum restart attempts: ${MAX_RESTART_ATTEMPTS}`);
log(`Restart delay: ${RESTART_DELAY/1000} seconds`);
startServer(); 