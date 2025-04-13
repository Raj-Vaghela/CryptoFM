/**
 * Vercel Environment Setup
 * 
 * This script sets up necessary directories for the Crypto FM application
 * in Vercel's serverless environment.
 */

const fs = require('fs');
const path = require('path');

// Create required directories
const directories = [
  '/tmp/scripts',
  '/tmp/scripts/current',
  '/tmp/scripts/spoken',
  '/tmp/reports',
  '/tmp/logs'
];

// Create each directory
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
});

// Create placeholder files to ensure directories are usable
const placeholders = [
  '/tmp/scripts/queue.json',
  '/tmp/reports/latest-report.md'
];

placeholders.forEach(file => {
  if (!fs.existsSync(file)) {
    try {
      // Create with appropriate initial content based on file type
      if (file.endsWith('.json')) {
        fs.writeFileSync(file, JSON.stringify({ lastPosition: 0, segments: [] }));
      } else {
        fs.writeFileSync(file, '# Initial placeholder\n\nThis file was created by the Vercel setup script.');
      }
      console.log(`Created placeholder file: ${file}`);
    } catch (error) {
      console.error(`Error creating file ${file}:`, error);
    }
  }
});

console.log('Vercel environment setup complete!');

// Export a function to be used by other modules
module.exports = {
  ensureDirectories: () => {
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    return true;
  }
}; 