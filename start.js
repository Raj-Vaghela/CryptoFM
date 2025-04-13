/**
 * RADIOO - Crypto Market Broadcaster
 * Master Control Script
 */

const { exec } = require('child_process');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Display welcome banner
function displayBanner() {
  console.clear();
  console.log('\n');
  console.log('██████╗  █████╗ ██████╗ ██╗ ██████╗  ██████╗ ');
  console.log('██╔══██╗██╔══██╗██╔══██╗██║██╔═══██╗██╔═══██╗');
  console.log('██████╔╝███████║██║  ██║██║██║   ██║██║   ██║');
  console.log('██╔══██╗██╔══██║██║  ██║██║██║   ██║██║   ██║');
  console.log('██║  ██║██║  ██║██████╔╝██║╚██████╔╝╚██████╔╝');
  console.log('╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝  ╚═════╝ ');
  console.log('Cryptocurrency Market Broadcaster 📡');
  console.log('--------------------------------------------------');
  console.log('Control center for all RADIOO broadcasting modules');
  console.log('--------------------------------------------------\n');
}

// Display main menu
function displayMenu() {
  console.log('\n📋 AVAILABLE COMMANDS:\n');
  console.log('  1. Start RADIOO broadcaster (default settings)');
  console.log('  2. Track specific coins (customize tracking)');
  console.log('  3. Show market data only');
  console.log('  4. Show whale transactions only');
  console.log('  5. Show crypto news only');
  console.log('  6. Show exchange flow analysis only');
  console.log('  7. Detailed data for a specific coin');
  console.log('  8. Start data server (continuous feeds)');
  console.log('  9. Check configuration');
  console.log('  0. Exit');
  console.log('\n👉 Enter your choice (0-9): ');
}

// Execute command and display output
function runCommand(command) {
  console.log(`\n🔄 Executing: ${command}\n`);
  
  const process = exec(command);
  
  process.stdout.on('data', (data) => {
    console.log(data);
  });
  
  process.stderr.on('data', (data) => {
    console.error(`Error: ${data}`);
  });
  
  process.on('close', (code) => {
    console.log(`\n✅ Command completed with exit code ${code}`);
    console.log('\nPress Enter to return to the menu...');
  });
}

// Check if required configuration is present
function checkConfiguration() {
  console.log('\n🔍 Checking RADIOO configuration...\n');
  
  try {
    require('dotenv').config();
    
    console.log('API Keys:');
    console.log(`  CoinGecko API Key: ${process.env.COINGECKO_API_KEY ? '✅ Set' : '⚠️ Not set (some features may be limited)'}`);
    console.log(`  Whale Alert API Key: ${process.env.WHALE_ALERT_API_KEY ? '✅ Set' : '⚠️ Not set (whale alerts will use simulated data)'}`);
    console.log(`  CryptoPanic API Key: ${process.env.CRYPTO_PANIC_API_KEY ? '✅ Set' : '⚠️ Not set (news may be limited)'}`);
    
    console.log('\nModule Files:');
    const fs = require('fs');
    const files = [
      { name: 'radio.js', description: 'Main broadcaster' },
      { name: 'coingecko.js', description: 'Market data' },
      { name: 'whale-alert.js', description: 'Whale transactions' },
      { name: 'crypto-news.js', description: 'Crypto news' },
      { name: 'exchange-flow.js', description: 'Exchange flows' },
      { name: 'server.js', description: 'Data server' }
    ];
    
    files.forEach(file => {
      const exists = fs.existsSync(file.name);
      console.log(`  ${file.name}: ${exists ? '✅ Present' : '❌ Missing'} (${file.description})`);
    });
    
    console.log('\nPress Enter to return to the menu...');
  } catch (error) {
    console.error(`\n❌ Error checking configuration: ${error.message}`);
    console.log('\nPress Enter to return to the menu...');
  }
}

// Ask for coin ID for detailed data
function askForCoinId() {
  rl.question('\n📊 Enter coin ID (e.g., bitcoin, ethereum, solana): ', (coinId) => {
    if (!coinId.trim()) {
      console.log('⚠️ No coin specified. Using bitcoin as default.');
      coinId = 'bitcoin';
    }
    
    runCommand(`node radio.js coindata ${coinId.trim().toLowerCase()}`);
  });
}

// Ask for coins to track
function askForCoinsToTrack() {
  rl.question('\n🔍 Enter coin symbols to track (comma-separated, e.g., BTC,ETH,SOL): ', (coins) => {
    if (!coins.trim()) {
      console.log('⚠️ No coins specified. Using default top coins.');
      runCommand('node radio.js start');
    } else {
      runCommand(`node radio.js track ${coins.trim()}`);
    }
  });
}

// Process user choice
function processChoice(choice) {
  switch (choice) {
    case '1':
      runCommand('node radio.js start');
      break;
    
    case '2':
      askForCoinsToTrack();
      break;
    
    case '3':
      runCommand('node radio.js markets');
      break;
    
    case '4':
      runCommand('node radio.js whales');
      break;
    
    case '5':
      runCommand('node radio.js news');
      break;
    
    case '6':
      runCommand('node exchange-flow.js');
      break;
    
    case '7':
      askForCoinId();
      break;
    
    case '8':
      runCommand('node server.js');
      break;
    
    case '9':
      checkConfiguration();
      break;
    
    case '0':
      console.log('\n👋 Thank you for using RADIOO! Goodbye!');
      rl.close();
      process.exit(0);
      break;
    
    default:
      console.log('\n⚠️ Invalid choice. Please try again.');
      promptUser();
      break;
  }
}

// Prompt for user input
function promptUser() {
  displayMenu();
  
  rl.once('line', (input) => {
    const choice = input.trim();
    processChoice(choice);
    
    // Return to menu after command completes (except for exit)
    if (choice !== '0') {
      rl.once('line', () => {
        displayBanner();
        promptUser();
      });
    }
  });
}

// Main function
function main() {
  displayBanner();
  promptUser();
  
  // Handle exit with Ctrl+C
  rl.on('SIGINT', () => {
    console.log('\n\n👋 RADIOO broadcast interrupted. Goodbye!');
    rl.close();
    process.exit(0);
  });
}

// Start the application
main(); 