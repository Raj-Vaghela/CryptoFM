/**
 * Crypto FM - Agent Control System
 * 
 * Central controller for all AI agents and services in the Crypto FM ecosystem.
 */

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Vercel environment setup
const isProduction = process.env.NODE_ENV === 'production';

// If in production (Vercel) environment, run setup
if (isProduction) {
  try {
    // Load and run setup script
    require('./vercel-setup').ensureDirectories();
  } catch (error) {
    console.error('Error setting up Vercel environment:', error);
  }
}

// Configuration
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

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
  
  const process = exec(`node ${script}`, {
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
║               🤖 RADIOO AGENT CONTROL CENTER 🤖               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Starting RADIOO cryptocurrency data logging and analysis system...
`);

// Check for required API keys
console.log('Checking configuration...');
if (!process.env.COINGECKO_API_KEY) {
  console.log('Warning: COINGECKO_API_KEY not found. Some features may be limited.');
}

if (!process.env.WHALE_ALERT_API_KEY) {
  console.log('Warning: WHALE_ALERT_API_KEY not found. Whale alerts will use simulated data.');
}

if (!process.env.GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is required for the analyst agent. Please add it to your .env file.');
  process.exit(1);
}

// Start processes
const dataLogger = startProcess('Data Logger', 'server.js');
const dataAnalyst = startProcess('Data Analyst', 'data-analyst-agent.js');

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down all processes...');
  
  // Kill child processes
  if (dataLogger) dataLogger.kill('SIGINT');
  if (dataAnalyst) dataAnalyst.kill('SIGINT');
  
  // Exit after a delay to let processes terminate gracefully
  setTimeout(() => {
    console.log('All processes terminated. Goodbye!');
    process.exit(0);
  }, 2000);
}); 