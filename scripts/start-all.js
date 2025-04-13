/**
 * RADIOO - Start All Components
 * 
 * This script starts both the data API server, the analyst agent, and the radio jockey agent
 */

require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Make sure scripts directory exists
const SCRIPTS_DIR = path.join(__dirname);
if (!fs.existsSync(SCRIPTS_DIR)) {
  fs.mkdirSync(SCRIPTS_DIR);
}

// Track child processes
let apiServer = null;
let analyst = null;
let radioJockey = null;
let voiceServer = null;
let shuttingDown = false;

// Add timestamp to console logs
const originalConsoleLog = console.log;
console.log = function() {
  const timestamp = new Date().toISOString();
  const args = Array.from(arguments);
  originalConsoleLog.apply(console, [`[${timestamp}]`, ...args]);
};

// Function to start a child process
function startProcess(name, script) {
  console.log(`Starting ${name} process...`);
  
  const process = spawn('node', [script], {
    stdio: 'pipe',
    detached: false
  });
  
  console.log(`${name} started with PID ${process.pid}`);
  
  // Handle process output
  process.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[${name}] ${output}`);
    }
  });
  
  process.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`[${name}:ERROR] ${output}`);
    }
  });
  
  // Handle process exit
  process.on('exit', (code, signal) => {
    const exitReason = signal 
      ? `terminated due to signal ${signal}` 
      : `exited with code ${code}`;
    
    console.log(`${name} process ${exitReason}`);
    
    // Restart the process if it crashes
    if (code !== 0) {
      console.log(`Restarting ${name} in 5 seconds...`);
      setTimeout(() => startProcess(name, script), 5000);
    }
  });
  
  return process;
}

// Banner
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         🚀 RADIOO CRYPTOCURRENCY SYSTEM LAUNCHER 🚀           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Starting RADIOO cryptocurrency data API and analysis system...
`);

// Check for required API keys
console.log('Checking configuration...');

if (!process.env.GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is required for the analyst agent. Please add it to your .env file.');
  process.exit(1);
}

// Start API server
function startAPIServer() {
  console.log('Starting API server...');
  
  // Use spawn to start a new process
  apiServer = spawn('node', ['data-api-server.js'], { 
    stdio: 'inherit',
    detached: false
  });
  
  apiServer.on('error', (error) => {
    console.error(`API server error: ${error.message}`);
  });
  
  apiServer.on('exit', (code) => {
    console.log(`API server exited with code ${code}`);
    apiServer = null;
    // If not shutting down, restart
    if (!shuttingDown) {
      setTimeout(startAPIServer, 5000);
    }
  });
}

// Start the API server
startAPIServer();

// Start data analyst agent
function startAnalyst() {
  console.log('Starting data analyst agent...');
  
  // Use spawn to start a new process
  analyst = spawn('node', ['data-analyst-agent.js'], {
    stdio: 'inherit',
    detached: false
  });
  
  analyst.on('error', (error) => {
    console.error(`Analyst error: ${error.message}`);
  });
  
  analyst.on('exit', (code) => {
    console.log(`Analyst exited with code ${code}`);
    analyst = null;
    // If not shutting down, restart
    if (!shuttingDown) {
      setTimeout(startAnalyst, 5000);
    }
  });
}

// Start radio jockey agent
function startRadioJockey() {
  console.log('Starting radio jockey agent...');
  
  // Use spawn to start a new process
  radioJockey = spawn('node', ['radio-jockey-agent.js'], {
    stdio: 'inherit',
    detached: false
  });
  
  radioJockey.on('error', (error) => {
    console.error(`Radio jockey error: ${error.message}`);
  });
  
  radioJockey.on('exit', (code) => {
    console.log(`Radio jockey exited with code ${code}`);
    radioJockey = null;
    // If not shutting down, restart
    if (!shuttingDown) {
      setTimeout(startRadioJockey, 5000);
    }
  });
}

// Start voice server
function startVoiceServer() {
  console.log('Starting voice server...');
  
  // Use spawn to start a new process
  voiceServer = spawn('node', ['voice-server.js'], {
    stdio: 'inherit',
    detached: false
  });
  
  voiceServer.on('error', (error) => {
    console.error(`Voice server error: ${error.message}`);
  });
  
  voiceServer.on('exit', (code) => {
    console.log(`Voice server exited with code ${code}`);
    voiceServer = null;
    // If not shutting down, restart
    if (!shuttingDown) {
      setTimeout(startVoiceServer, 5000);
    }
  });
}

// Wait for API server to initialize before starting analyst
setTimeout(() => {
  startAnalyst();
  
  // Wait for analyst to initialize before starting radio jockey
  setTimeout(() => {
    startRadioJockey();
    
    // Wait for radio jockey to initialize before starting voice server
    setTimeout(() => {
      startVoiceServer();
    }, 5000); // Give radio jockey 5 seconds to start up
  }, 10000); // Give analyst 10 seconds to start up
}, 5000); // Give API server 5 seconds to start up

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down all processes...');
  shuttingDown = true;
  
  // Kill child processes individually instead of by process group (Windows-compatible)
  if (apiServer && !apiServer.killed) {
    console.log('Terminating API Server...');
    apiServer.kill('SIGINT');
  }
  
  if (analyst && !analyst.killed) {
    console.log('Terminating Data Analyst...');
    analyst.kill('SIGINT');
  }
  
  if (radioJockey && !radioJockey.killed) {
    console.log('Terminating Radio Jockey...');
    radioJockey.kill('SIGINT');
  }
  
  if (voiceServer && !voiceServer.killed) {
    console.log('Terminating Voice Server...');
    voiceServer.kill('SIGINT');
  }
  
  // Exit after a delay to let processes terminate gracefully
  setTimeout(() => {
    console.log('All processes terminated. Goodbye!');
    process.exit(0);
  }, 2000);
}); 