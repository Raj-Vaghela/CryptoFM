/**
 * RADIOO - Crypto Data Logger
 * 
 * A minimal continuous data logging service that fetches cryptocurrency data
 * at regular intervals and writes it to log files.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { logExchangeFlowData } = require('./exchange-flow');

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

// Configuration
const FETCH_INTERVAL = process.env.FETCH_INTERVAL || 30 * 1000; // Default 30 seconds (increased from 15)
const HEARTBEAT_INTERVAL = Math.min(10000, FETCH_INTERVAL / 2); // Every 10 seconds or half the fetch interval
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
const WHALE_ALERT_API_KEY = process.env.WHALE_ALERT_API_KEY || '';
const CRYPTO_PANIC_API_KEY = process.env.CRYPTO_PANIC_API_KEY || '';

// Add timestamp to console logs
const originalConsoleLog = console.log;
console.log = function() {
  const timestamp = new Date().toISOString();
  const args = Array.from(arguments);
  originalConsoleLog.apply(console, [`[${timestamp}]`, ...args]);
};

const originalConsoleError = console.error;
console.error = function() {
  const timestamp = new Date().toISOString();
  const args = Array.from(arguments);
  originalConsoleError.apply(console, [`[${timestamp}]`, ...args]);
};

// Setup axios instances
const coinGeckoClient = axios.create({
  baseURL: COINGECKO_API,
  timeout: 30000, // 30 second timeout
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// If API key is provided, set it up correctly as an authorization header
if (COINGECKO_API_KEY) {
  coinGeckoClient.defaults.headers.common['x-cg-api-key'] = COINGECKO_API_KEY;
}

// Add request interceptor for debugging API calls
coinGeckoClient.interceptors.request.use(request => {
  console.log(`Making request to: ${request.baseURL}${request.url}`);
  return request;
}, error => {
  console.error('Request error:', error);
  return Promise.reject(error);
});

// Implement rate limiting for CoinGecko API (Free tier: 10-30 calls/minute)
let lastCoinGeckoCall = 0;
const MIN_CALL_INTERVAL = 6000; // Minimum 6 seconds between calls (10 calls/minute)

/**
 * Make a rate-limited API call to CoinGecko
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} API response
 */
async function rateLimitedCoinGeckoCall(endpoint, params = {}) {
  const now = Date.now();
  const timeSinceLastCall = now - lastCoinGeckoCall;
  
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall;
    console.log(`Rate limiting: Waiting ${waitTime}ms before next CoinGecko API call`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastCoinGeckoCall = Date.now();
  
  try {
    const response = await coinGeckoClient.get(endpoint, { params });
    return response;
  } catch (error) {
    // Handle specific error cases
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`CoinGecko API error (${endpoint}): Status ${error.response.status}`);
      console.error('Error data:', error.response.data);
      
      // If rate limited, add additional delay
      if (error.response.status === 429) {
        console.log('Rate limit exceeded. Adding delay before next request.');
        lastCoinGeckoCall = Date.now() + 60000; // Add a minute delay
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('CoinGecko API no response:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('CoinGecko API request setup error:', error.message);
    }
    throw error;
  }
}

// Log writer function
function writeToLog(filename, data) {
  const timestamp = new Date().toISOString();
  const logFile = path.join(LOGS_DIR, filename);
  
  let content = `[${timestamp}] `;
  if (typeof data === 'object') {
    content += JSON.stringify(data, null, 2);
  } else {
    content += data;
  }
  content += '\n\n';
  
  fs.appendFileSync(logFile, content);
  console.log(`Data written to ${filename}`);
}

// Heartbeat function to show the server is still running
function heartbeat() {
  const now = new Date();
  const message = `Heartbeat: RADIOO server running at ${now.toLocaleString()}`;
  console.log(message);
  writeToLog('heartbeat.log', message);
  
  // Log memory usage
  const memoryUsage = process.memoryUsage();
  const formattedMemory = {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
  };
  
  console.log(`Memory usage: ${JSON.stringify(formattedMemory)}`);
  writeToLog('system.log', `Memory usage: ${JSON.stringify(formattedMemory)}`);
}

// Fetch market data
async function fetchMarketData() {
  try {
    console.log('Fetching market data...');
    
    // Get global market data
    const globalData = await rateLimitedCoinGeckoCall('/global');
    writeToLog('market_global.log', globalData.data);
    
    // Wait to respect rate limits
    await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL));
    
    // Get top coins data
    const topCoinsData = await rateLimitedCoinGeckoCall('/coins/markets', {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 50,
      page: 1,
      sparkline: false,
      price_change_percentage: '1h,24h,7d'
    });
    writeToLog('market_top_coins.log', topCoinsData.data);
    
    // Wait to respect rate limits
    await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL));
    
    // Get trending coins
    const trendingData = await rateLimitedCoinGeckoCall('/search/trending');
    writeToLog('market_trending.log', trendingData.data);
    
    return { success: true };
  } catch (error) {
    console.error(`Market data fetch error: ${error.message}`);
    writeToLog('errors.log', `Market data fetch error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Fetch detailed data for top coins
async function fetchDetailedCoinData() {
  try {
    console.log('Fetching detailed coin data...');
    
    // Get top coins first to know which to fetch details for
    const topCoinsResponse = await rateLimitedCoinGeckoCall('/coins/markets', {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 10,
      page: 1
    });
    
    // Fetch detailed data for top 3 coins
    const topCoinIds = topCoinsResponse.data.slice(0, 3).map(coin => coin.id);
    
    for (const coinId of topCoinIds) {
      // Wait between each coin request to respect rate limits
      await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL));
      
      const detailedData = await rateLimitedCoinGeckoCall(`/coins/${coinId}`, {
        localization: false,
        tickers: true,
        market_data: true,
        community_data: true,
        developer_data: true,
        sparkline: false
      });
      
      writeToLog(`coin_${coinId}.log`, detailedData.data);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Detailed coin data fetch error: ${error.message}`);
    writeToLog('errors.log', `Detailed coin data fetch error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Fetch whale transactions
async function fetchWhaleTransactions() {
  if (!WHALE_ALERT_API_KEY) {
    console.log('Whale Alert API key not configured, skipping whale transactions fetch');
    return { success: false, error: 'API key not configured' };
  }
  
  try {
    console.log('Fetching whale transactions...');
    const whaleClient = axios.create({
      baseURL: 'https://api.whale-alert.io/v1',
      headers: { 'X-WA-API-KEY': WHALE_ALERT_API_KEY }
    });
    
    // Last 1 hour of transactions with minimum value of $1M
    const response = await whaleClient.get('/transactions', {
      params: {
        api_key: WHALE_ALERT_API_KEY,
        min_value: 1000000,
        start: Math.floor(Date.now() / 1000) - 3600
      }
    });
    
    writeToLog('whale_transactions.log', response.data);
    return { success: true };
  } catch (error) {
    console.error(`Whale transactions fetch error: ${error.message}`);
    writeToLog('errors.log', `Whale transactions fetch error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Fetch crypto news
async function fetchCryptoNews() {
  try {
    console.log('Fetching crypto news...');
    
    let newsData;
    
    // Try CoinGecko news first (free)
    try {
      const response = await coinGeckoClient.get('/status_updates');
      newsData = response.data;
    } catch (cgError) {
      console.log('Failed to fetch news from CoinGecko, trying CryptoPanic');
      
      // Fall back to CryptoPanic if configured
      if (CRYPTO_PANIC_API_KEY) {
        const cryptoPanicClient = axios.create({
          baseURL: 'https://cryptopanic.com/api/v1',
          params: { auth_token: CRYPTO_PANIC_API_KEY }
        });
        
        const response = await cryptoPanicClient.get('/posts/', {
          params: {
            public: true,
            kind: 'news',
            limit: 10
          }
        });
        
        newsData = response.data;
      } else {
        throw new Error('No available news API sources');
      }
    }
    
    writeToLog('crypto_news.log', newsData);
    return { success: true };
  } catch (error) {
    console.error(`Crypto news fetch error: ${error.message}`);
    writeToLog('errors.log', `Crypto news fetch error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main data fetch cycle
async function fetchAllData() {
  console.log(`\n📡 Starting data fetch cycle at ${new Date().toLocaleString()}`);
  writeToLog('status.log', `Starting data fetch cycle at ${new Date().toLocaleString()}`);
  
  try {
    // Execute data fetching operations sequentially to avoid rate limits
    
    // 1. Fetch market data first - this is highest priority
    console.log('DEBUG: Starting market data fetch...');
    const marketResult = await fetchMarketData().catch(err => {
      console.error(`Market data fetch failed: ${err.message}`);
      writeToLog('errors.log', `Market data fetch failed: ${err.message}`);
      // Return null but don't throw to allow other operations to continue
      return null;
    });
    
    // Wait a bit to ensure we're respecting rate limits
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 2. Fetch detailed coin data only if market data succeeded
    console.log('DEBUG: Starting detailed coin data fetch...');
    if (marketResult && marketResult.success) {
      await fetchDetailedCoinData().catch(err => {
        console.error(`Detailed coin data fetch failed: ${err.message}`);
        writeToLog('errors.log', `Detailed coin data fetch failed: ${err.message}`);
      });
    } else {
      console.log('Skipping detailed coin data fetch due to market data failure');
      writeToLog('status.log', 'Skipped detailed coin data fetch due to market data failure');
    }
    
    // 3. Fetch whale transactions - this uses a different API so can proceed regardless
    console.log('DEBUG: Starting whale transactions fetch...');
    await fetchWhaleTransactions().catch(err => {
      console.error(`Whale transactions fetch failed: ${err.message}`);
      writeToLog('errors.log', `Whale transactions fetch failed: ${err.message}`);
    });
    
    // 4. Fetch crypto news - again, different API
    console.log('DEBUG: Starting crypto news fetch...');
    await fetchCryptoNews().catch(err => {
      console.error(`Crypto news fetch failed: ${err.message}`);
      writeToLog('errors.log', `Crypto news fetch failed: ${err.message}`);
    });
    
    // 5. Generate exchange flow data - this is local and doesn't hit any APIs
    console.log('DEBUG: Starting exchange flow data generation...');
    try {
      logExchangeFlowData();
    } catch (exchangeError) {
      console.error(`Exchange flow data generation failed: ${exchangeError.message}`);
      writeToLog('errors.log', `Exchange flow data generation failed: ${exchangeError.message}`);
    }
    
    console.log(`✅ Data fetch cycle completed at ${new Date().toLocaleString()}`);
    writeToLog('status.log', `Data fetch cycle completed successfully at ${new Date().toLocaleString()}`);
  } catch (error) {
    console.error(`❌ Error in data fetch cycle: ${error.message}`);
    console.error(error.stack); // Log the stack trace for better debugging
    writeToLog('errors.log', `Data fetch cycle error: ${error.message}\n${error.stack}`);
  } finally {
    console.log('DEBUG: Fetch cycle finished, waiting for next interval...');
    // Force garbage collection if possible
    if (global.gc) {
      console.log('DEBUG: Running garbage collection');
      global.gc();
    }
  }
}

// Start heartbeat and continuous data fetching
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                   📡  RADIOO DATA LOGGER  📡                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Starting continuous data logging service...
- Fetch interval: ${FETCH_INTERVAL / 1000} seconds
- Heartbeat interval: ${HEARTBEAT_INTERVAL / 1000} seconds
- Logs directory: ${LOGS_DIR}
- CoinGecko API Key: ${COINGECKO_API_KEY ? 'Configured ✓' : 'Not configured ✗'}
- Whale Alert API Key: ${WHALE_ALERT_API_KEY ? 'Configured ✓' : 'Not configured ✗'}
- CryptoPanic API Key: ${CRYPTO_PANIC_API_KEY ? 'Configured ✓' : 'Not configured ✗'}

All data will be logged to files in the logs directory.
Press Ctrl+C to stop the service.
`);

// Debug logging for interval setting
console.log(`DEBUG: Setting up interval timer for ${FETCH_INTERVAL}ms`);

// Run heartbeat immediately and set interval
heartbeat();
const heartbeatIntervalId = setInterval(heartbeat, HEARTBEAT_INTERVAL);
console.log(`DEBUG: Heartbeat scheduled with ID: ${heartbeatIntervalId}`);

// Run the first fetch immediately
console.log('DEBUG: Running initial data fetch cycle...');
fetchAllData();

// Then schedule regular fetches
console.log(`DEBUG: Scheduling recurring fetches every ${FETCH_INTERVAL}ms`);
const intervalId = setInterval(() => {
  console.log(`DEBUG: Timer triggered, running fetch cycle at ${new Date().toLocaleString()}`);
  fetchAllData();
}, FETCH_INTERVAL);

// Keep reference to interval ID
console.log(`DEBUG: Interval scheduled with ID: ${intervalId}`);

// Add more error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  writeToLog('errors.log', `Unhandled Rejection: ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  writeToLog('errors.log', `Uncaught Exception: ${err.message}\n${err.stack}`);
  
  // Don't exit, try to keep the process running
  console.log('Attempting to continue despite uncaught exception...');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nStopping data logging service...');
  
  // Clear intervals
  clearInterval(intervalId);
  clearInterval(heartbeatIntervalId);
  
  writeToLog('status.log', `Service stopped at ${new Date().toLocaleString()}`);
  console.log('Service stopped. Goodbye!');
  
  // Give time for final logs to be written
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}); 