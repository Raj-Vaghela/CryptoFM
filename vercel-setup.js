/**
 * Vercel Environment Setup
 * 
 * This script sets up necessary directories for the Crypto FM application
 * in Vercel's serverless environment.
 */

const fs = require('fs');
const path = require('path');

console.log('Starting Vercel environment setup...');

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
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } else {
      console.log(`Directory already exists: ${dir}`);
    }
    
    // Verify write permissions by creating a test file
    const testFile = path.join(dir, '.test-write');
    fs.writeFileSync(testFile, 'test', 'utf8');
    fs.unlinkSync(testFile); // Remove test file
    console.log(`Verified write access to ${dir}`);
  } catch (error) {
    console.error(`Error with directory ${dir}:`, error.message);
  }
});

// Create placeholder files to ensure directories are usable
const placeholders = [
  { path: '/tmp/scripts/queue.json', content: JSON.stringify({ lastPosition: 0, segments: [] }, null, 2) },
  { path: '/tmp/reports/latest-report.md', content: '# Initial placeholder\n\nThis file was created by the Vercel setup script.' }
];

placeholders.forEach(file => {
  try {
    fs.writeFileSync(file.path, file.content, 'utf8');
    console.log(`Created placeholder file: ${file.path}`);
  } catch (error) {
    console.error(`Error creating file ${file.path}:`, error.message);
  }
});

console.log('Vercel environment setup complete!');

// Export a function to be used by other modules
module.exports = {
  ensureDirectories: () => {
    console.log('Re-checking directory structure...');
    
    // Create directories and return status for each
    const results = directories.map(dir => {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          return { dir, created: true, exists: true };
        }
        return { dir, created: false, exists: true };
      } catch (error) {
        return { dir, created: false, exists: false, error: error.message };
      }
    });
    
    console.log('Directory status:', JSON.stringify(results, null, 2));
    
    // Return true if all directories exist
    return results.every(r => r.exists);
  }
}; 