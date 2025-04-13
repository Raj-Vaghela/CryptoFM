/**
 * RADIOO - Crypto Market Broadcaster
 * 
 * A real-time cryptocurrency data broadcasting service that pulls
 * information from multiple sources and broadcasts updates at
 * configurable intervals.
 */

require('dotenv').config();
const { fetchCompleteCoinData, fetchTopCoins, fetchTrendingCoins, fetchGlobalMarketData, displayCoinSummary, displayDetailedCoinData } = require('./coingecko');
const { fetchWhaleTransactions, displayWhaleTransaction, summarizeWhaleActivity } = require('./whale-alert');
const { fetchCryptoNews, displayCryptoNews } = require('./crypto-news');

// Configuration
const DEFAULT_INTERVAL = 15; // minutes
const DEFAULT_TOP_COINS = 10;
const MIN_BROADCAST_INTERVAL = 1; // minute
const DEFAULT_WHALE_MIN_VALUE = 1000000; // $1M minimum transaction value

/**
 * Simulate exchange flow analysis
 * This is a placeholder until exchange flow API is implemented
 * @param {string[]} coins - Array of coin symbols to analyze
 * @returns {Object} - Exchange flow data
 */
function analyzeExchangeFlows(coins = ['BTC', 'ETH']) {
  console.log('\n📊 EXCHANGE FLOW ANALYSIS:');
  console.log('--------------------------------------------------');
  
  coins.forEach(coin => {
    // Generate random inflow/outflow values
    const inflow = Math.floor(Math.random() * 500) + 100;
    const outflow = Math.floor(Math.random() * 500) + 100;
    const netFlow = inflow - outflow;
    const isBullish = netFlow > 0;
    
    console.log(`${coin}: ${isBullish ? '🟢' : '🔴'} Net Flow: ${netFlow > 0 ? '+' : ''}${netFlow.toLocaleString()} ${coin}`);
    console.log(`   Inflow: ${inflow.toLocaleString()} ${coin} | Outflow: ${outflow.toLocaleString()} ${coin}`);
    console.log(`   Signal: ${isBullish ? 'Bullish (accumulation)' : 'Bearish (possible selling pressure)'}`);
    console.log('--------------------------------------------------');
  });
  
  return { analyzed: coins };
}

/**
 * Display RADIOO banner
 */
function displayBanner() {
  console.log('\n');
  console.log('██████╗  █████╗ ██████╗ ██╗ ██████╗  ██████╗ ');
  console.log('██╔══██╗██╔══██╗██╔══██╗██║██╔═══██╗██╔═══██╗');
  console.log('██████╔╝███████║██║  ██║██║██║   ██║██║   ██║');
  console.log('██╔══██╗██╔══██║██║  ██║██║██║   ██║██║   ██║');
  console.log('██║  ██║██║  ██║██████╔╝██║╚██████╔╝╚██████╔╝');
  console.log('╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝ ╚═════╝  ╚═════╝ ');
  console.log('Cryptocurrency Market Broadcaster 📡');
  console.log('--------------------------------------------------');
  console.log('Real-time market data, whale alerts, and crypto news');
  console.log('--------------------------------------------------\n');
}

/**
 * Display help information
 */
function displayHelp() {
  console.log('\nRADIOO - Cryptocurrency Market Broadcaster 📡');
  console.log('===========================================');
  console.log('Usage: node radio.js [command] [options]');
  console.log('\nCommands:');
  console.log('  start           - Start broadcasting with default settings');
  console.log('  track [coins]   - Track specific coins (comma-separated)');
  console.log('  interval [min]  - Set custom broadcast interval (minutes)');
  console.log('  coindata [coin] - Display detailed data for a specific coin');
  console.log('  whales          - Show only whale transactions');
  console.log('  news            - Show only crypto news');
  console.log('  markets         - Show only market data');
  console.log('  help            - Display this help information');
  console.log('\nExamples:');
  console.log('  node radio.js start');
  console.log('  node radio.js track BTC,ETH,SOL');
  console.log('  node radio.js interval 30');
  console.log('  node radio.js coindata bitcoin');
  console.log('\nOptions:');
  console.log('  --no-whales     - Disable whale alerts');
  console.log('  --no-news       - Disable crypto news');
  console.log('  --no-flows      - Disable exchange flow analysis');
  console.log('===========================================');
}

/**
 * Parse command line arguments
 * @returns {Object} - Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsedArgs = {
    command: args[0] || 'start',
    coins: [],
    interval: DEFAULT_INTERVAL,
    options: {
      showWhales: true,
      showNews: true,
      showFlows: true
    }
  };
  
  // Parse flags
  const flagArgs = args.filter(arg => arg.startsWith('--'));
  flagArgs.forEach(flag => {
    if (flag === '--no-whales') parsedArgs.options.showWhales = false;
    if (flag === '--no-news') parsedArgs.options.showNews = false;
    if (flag === '--no-flows') parsedArgs.options.showFlows = false;
  });
  
  // Parse commands
  if (parsedArgs.command === 'track' && args.length > 1) {
    parsedArgs.coins = args[1].split(',');
  }
  
  if (parsedArgs.command === 'interval' && args.length > 1) {
    const interval = parseInt(args[1]);
    if (!isNaN(interval) && interval >= MIN_BROADCAST_INTERVAL) {
      parsedArgs.interval = interval;
    }
  }
  
  if (parsedArgs.command === 'coindata' && args.length > 1) {
    parsedArgs.coinId = args[1];
  }
  
  return parsedArgs;
}

/**
 * Broadcast cryptocurrency market data
 * @param {Object} config - Configuration for the broadcast
 * @returns {Promise<void>}
 */
async function broadcastMarketData(config) {
  try {
    const timestamp = new Date().toLocaleString();
    console.log(`\n🔄 RADIOO BROADCAST AT ${timestamp}`);
    console.log('==================================================');
    
    // Fetch global market data
    const globalData = await fetchGlobalMarketData();
    
    // Fetch and display top coins
    const coinsToTrack = config.coins.length > 0 ? config.coins : null;
    const topCoins = await fetchTopCoins(coinsToTrack || DEFAULT_TOP_COINS);
    
    // Fetch trending coins
    if (!coinsToTrack) {
      const trendingCoins = await fetchTrendingCoins();
    }
    
    // Fetch detailed data for top 3 coins
    const topCoinIds = topCoins.slice(0, 3).map(coin => coin.id);
    for (const coinId of topCoinIds) {
      const coinData = await fetchCompleteCoinData(coinId);
      displayDetailedCoinData(coinData);
    }
    
    // Show whale alerts if enabled
    if (config.options.showWhales) {
      const whaleAlerts = await fetchWhaleTransactions();
      if (whaleAlerts && whaleAlerts.length > 0) {
        console.log('\n🐋 WHALE TRANSACTION ALERTS:');
        console.log('--------------------------------------------------');
        whaleAlerts.slice(0, 5).forEach(tx => displayWhaleTransaction(tx));
        summarizeWhaleActivity(whaleAlerts);
      }
    }
    
    // Show crypto news if enabled
    if (config.options.showNews) {
      const coinSymbols = coinsToTrack || topCoins.slice(0, 5).map(coin => coin.symbol.toUpperCase());
      const news = await fetchCryptoNews(coinSymbols, 5);
      if (news && news.length > 0) {
        displayCryptoNews(news);
      }
    }
    
    // Show exchange flows if enabled
    if (config.options.showFlows) {
      const coinSymbols = coinsToTrack || topCoins.slice(0, 3).map(coin => coin.symbol.toUpperCase());
      analyzeExchangeFlows(coinSymbols);
    }
    
    console.log('\n==================================================');
    console.log(`📡 Next broadcast in ${config.interval} minutes...`);
    console.log('==================================================\n');
  } catch (error) {
    console.error(`❌ Broadcast error: ${error.message}`);
  }
}

/**
 * Start broadcasting market data at specified intervals
 * @param {Object} config - Configuration for the broadcast
 */
function startBroadcasting(config) {
  displayBanner();
  console.log(`📡 Starting RADIOO with ${config.interval} minute intervals`);
  
  if (config.coins.length > 0) {
    console.log(`🔍 Tracking specific coins: ${config.coins.join(', ')}`);
  }
  
  // Initial broadcast
  broadcastMarketData(config);
  
  // Schedule recurring broadcasts
  const intervalMs = config.interval * 60 * 1000;
  setInterval(() => broadcastMarketData(config), intervalMs);
}

/**
 * Show detailed data for a specific coin
 * @param {string} coinId - ID of the coin to show details for
 */
async function showCoinDetails(coinId) {
  try {
    console.log(`\n🔍 Fetching detailed data for ${coinId}...`);
    const coinData = await fetchCompleteCoinData(coinId);
    displayDetailedCoinData(coinData);
  } catch (error) {
    console.error(`❌ Error fetching coin details: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs();
  
  switch (args.command) {
    case 'start':
      startBroadcasting(args);
      break;
    
    case 'track':
      if (args.coins.length === 0) {
        console.log('⚠️ No coins specified. Use format: node radio.js track BTC,ETH,SOL');
        return;
      }
      startBroadcasting(args);
      break;
    
    case 'interval':
      startBroadcasting(args);
      break;
    
    case 'coindata':
      if (!args.coinId) {
        console.log('⚠️ No coin specified. Use format: node radio.js coindata bitcoin');
        return;
      }
      await showCoinDetails(args.coinId);
      break;
    
    case 'whales':
      displayBanner();
      console.log('🐋 WHALE ALERT MODE');
      const whaleAlerts = await fetchWhaleTransactions(null, DEFAULT_WHALE_MIN_VALUE);
      whaleAlerts.forEach(tx => displayWhaleTransaction(tx));
      summarizeWhaleActivity(whaleAlerts);
      break;
    
    case 'news':
      displayBanner();
      console.log('📰 CRYPTO NEWS MODE');
      const news = await fetchCryptoNews([], 10);
      displayCryptoNews(news);
      break;
    
    case 'markets':
      displayBanner();
      console.log('📊 MARKET DATA MODE');
      const globalData = await fetchGlobalMarketData();
      const topCoins = await fetchTopCoins(DEFAULT_TOP_COINS);
      const trendingCoins = await fetchTrendingCoins();
      break;
    
    case 'help':
    default:
      displayHelp();
      break;
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  broadcastMarketData,
  startBroadcasting,
  analyzeExchangeFlows
}; 