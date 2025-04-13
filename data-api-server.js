/**
 * RADIOO - Data API Server
 * 
 * A REST API server that collects cryptocurrency data and serves
 * the most recent data to consumers (analyst, dashboards, etc.)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
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
const API_PORT = process.env.API_PORT || 3000;
const FETCH_INTERVAL = process.env.FETCH_INTERVAL || 120 * 1000; // Default 120 seconds (reduced frequency)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
const WHALE_ALERT_API_KEY = process.env.WHALE_ALERT_API_KEY || '';
const CRYPTO_PANIC_API_KEY = process.env.CRYPTO_PANIC_API_KEY || '';
const MAX_COINGECKO_REQUESTS_PER_MINUTE = 20; // Conservative limit (below the 30/min limit)

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

// In-memory data store for the most recent data
const dataStore = {
  lastUpdated: new Date(),
  marketGlobal: null,
  topCoins: null,
  trendingCoins: null,
  detailedCoins: {},
  whaleTransactions: null,
  cryptoNews: null,
  exchangeFlows: null
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

// If API key is provided, set it up correctly
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

// Implement improved rate limiting for CoinGecko API (Free tier: 10-30 calls/minute)
let coinGeckoCallsInCurrentMinute = 0;
let coinGeckoMinuteStartTime = Date.now();
const MIN_CALL_INTERVAL = 3000; // Minimum 3 seconds between calls

/**
 * Make a rate-limited API call to CoinGecko
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} API response
 */
async function rateLimitedCoinGeckoCall(endpoint, params = {}) {
  const now = Date.now();
  
  // Check if we're in a new minute window
  if (now - coinGeckoMinuteStartTime >= 60000) {
    coinGeckoMinuteStartTime = now;
    coinGeckoCallsInCurrentMinute = 0;
    console.log('Starting new CoinGecko rate limit window');
  }
  
  // Check if we're approaching the rate limit
  if (coinGeckoCallsInCurrentMinute >= MAX_COINGECKO_REQUESTS_PER_MINUTE) {
    // Wait until the next minute begins
    const waitTime = 60000 - (now - coinGeckoMinuteStartTime) + 1000; // Add 1 second buffer
    console.log(`Rate limit approached: Waiting ${waitTime}ms before next CoinGecko API call`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Reset counters after waiting
    coinGeckoMinuteStartTime = Date.now();
    coinGeckoCallsInCurrentMinute = 0;
  }
  
  // Enforce minimum delay between calls regardless of rate limit
  const timeSinceLastCall = now - (global.lastCoinGeckoCallTime || 0);
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall;
    console.log(`Enforcing minimum delay: Waiting ${waitTime}ms between CoinGecko API calls`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Update call time and increment counter
  global.lastCoinGeckoCallTime = Date.now();
  coinGeckoCallsInCurrentMinute++;
  
  console.log(`CoinGecko API call ${coinGeckoCallsInCurrentMinute}/${MAX_COINGECKO_REQUESTS_PER_MINUTE} in current minute window`);
  
  try {
    const response = await coinGeckoClient.get(endpoint, { params });
    return response;
  } catch (error) {
    // Handle specific error cases
    if (error.response) {
      console.error(`CoinGecko API error (${endpoint}): Status ${error.response.status}`);
      console.error('Error data:', error.response.data);
      
      // If rate limited, add significant delay and reset counters
      if (error.response.status === 429) {
        console.log('Rate limit exceeded. Adding extended delay before next request.');
        // Add a 2 minute delay before retrying
        global.lastCoinGeckoCallTime = Date.now() + 120000;
        // Reset the current minute window
        coinGeckoMinuteStartTime = Date.now() + 120000;
        coinGeckoCallsInCurrentMinute = 0;
      }
    } else if (error.request) {
      console.error('CoinGecko API no response:', error.request);
    } else {
      console.error('CoinGecko API request setup error:', error.message);
    }
    throw error;
  }
}

// Log writer function - both logs to file and updates in-memory store
function writeToLog(filename, data, storeKey = null) {
  const timestamp = new Date().toISOString();
  const logFile = path.join(LOGS_DIR, filename);
  
  let content = `[${timestamp}] `;
  if (typeof data === 'object') {
    content += JSON.stringify(data, null, 2);
  } else {
    content += data;
  }
  content += '\n\n';
  
  // Write to log file for persistence
  fs.appendFileSync(logFile, content);
  
  // Update in-memory data store if storeKey is provided
  if (storeKey) {
    dataStore[storeKey] = data;
    dataStore.lastUpdated = new Date();
  }
  
  console.log(`Data written to ${filename} ${storeKey ? 'and updated in data store' : ''}`);
}

// Fetch market data
async function fetchMarketData() {
  try {
    console.log('Fetching market data...');
    
    // Get global market data
    const globalData = await rateLimitedCoinGeckoCall('/global');
    writeToLog('market_global.log', globalData.data, 'marketGlobal');
    
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
    writeToLog('market_top_coins.log', topCoinsData.data, 'topCoins');
    
    // Wait to respect rate limits
    await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL));
    
    // Get trending coins
    const trendingData = await rateLimitedCoinGeckoCall('/search/trending');
    writeToLog('market_trending.log', trendingData.data, 'trendingCoins');
    
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
    
    // If we already have top coins in the store, use that data
    // Otherwise, fetch it fresh
    let topCoinsData;
    if (dataStore.topCoins) {
      topCoinsData = dataStore.topCoins;
    } else {
      console.log('No cached top coins data, fetching it first...');
      const topCoinsResponse = await rateLimitedCoinGeckoCall('/coins/markets', {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 50,
        page: 1,
        sparkline: false
      });
      topCoinsData = topCoinsResponse.data;
      writeToLog('market_top_coins.log', topCoinsData, 'topCoins');
    }
    
    // Limit to top 5 coins to reduce API calls
    const coinsToFetch = topCoinsData.slice(0, 5);
    console.log(`Will fetch detailed data for ${coinsToFetch.length} coins to stay within rate limits`);
    
    // Fetch detailed data for each coin
    for (const coin of coinsToFetch) {
      try {
        // Check if we need to update this coin's data (only if missing or older than 30 minutes)
        const coinId = coin.id;
        const currentTime = Date.now();
        const lastFetchTime = dataStore.detailedCoins[coinId]?.lastFetchTime || 0;
        const minutesSinceLastFetch = (currentTime - lastFetchTime) / (1000 * 60);
        
        if (!dataStore.detailedCoins[coinId] || minutesSinceLastFetch >= 30) {
          console.log(`Fetching detailed data for ${coinId}...`);
          
          const coinData = await rateLimitedCoinGeckoCall(`/coins/${coinId}`, {
            localization: false,
            tickers: true,
            market_data: true,
            community_data: true,
            developer_data: true,
            sparkline: false
          });
          
          // Add fetch timestamp to help with cache management
          coinData.data.lastFetchTime = currentTime;
          
          // Write to log and update data store
          writeToLog(`coin_${coinId}.log`, coinData.data);
          dataStore.detailedCoins[coinId] = coinData.data;
          
          console.log(`Updated detailed data for ${coinId}`);
        } else {
          console.log(`Skipping ${coinId}, data is fresh (${minutesSinceLastFetch.toFixed(1)} minutes old)`);
        }
      } catch (error) {
        console.error(`Error fetching detailed data for ${coin.id}: ${error.message}`);
        writeToLog('errors.log', `Error fetching detailed data for ${coin.id}: ${error.message}`);
      }
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
    
    writeToLog('whale_transactions.log', response.data, 'whaleTransactions');
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
    
    // Try CoinGecko news first (using their /news endpoint)
    try {
      const response = await rateLimitedCoinGeckoCall('/news');
      newsData = response.data;
    } catch (cgNewsError) {
      console.log(`Couldn't get news from CoinGecko: ${cgNewsError.message}`);
      
      // Fallback to CryptoPanic if available
      if (CRYPTO_PANIC_API_KEY) {
        try {
          const cryptoPanicClient = axios.create({
            baseURL: 'https://cryptopanic.com/api/v1',
            timeout: 10000
          });
          
          const response = await cryptoPanicClient.get('/posts', {
            params: {
              auth_token: CRYPTO_PANIC_API_KEY,
              public: true,
              kind: 'news'
            }
          });
          
          newsData = response.data;
        } catch (cpNewsError) {
          console.error(`Crypto Panic news fetch error: ${cpNewsError.message}`);
          writeToLog('errors.log', `Crypto Panic news fetch error: ${cpNewsError.message}`);
          return { success: false, error: cpNewsError.message };
        }
      } else {
        console.log('No Crypto Panic API key configured, skipping news fetch');
        return { success: false, error: 'Crypto Panic API key not configured' };
      }
    }
    
    writeToLog('crypto_news.log', newsData, 'cryptoNews');
    return { success: true };
  } catch (error) {
    console.error(`Crypto news fetch error: ${error.message}`);
    writeToLog('errors.log', `Crypto news fetch error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Generate and log exchange flow data
function generateExchangeFlowData() {
  try {
    console.log('Generating exchange flow data...');
    
    // Use the external module to log exchange flow data
    // and get the generated data
    const exchangeData = logExchangeFlowData();
    
    // Store in the data store
    dataStore.exchangeFlows = exchangeData;
    dataStore.lastUpdated = new Date();
    
    return { success: true };
  } catch (error) {
    console.error(`Exchange flow data generation error: ${error.message}`);
    writeToLog('errors.log', `Exchange flow data generation error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all data sources
 * @returns {Promise<Object>} Status of all fetches
 */
async function fetchAllData() {
  console.log('\n==== Starting data fetch cycle ====\n');
  dataStore.lastUpdated = new Date();
  
  try {
    // Define sources to fetch with delay between them to prevent rate limiting
    const fetchSources = [
      { name: 'Market Data', fn: fetchMarketData, delayAfter: 5000 },
      { name: 'Detailed Coin Data', fn: fetchDetailedCoinData, delayAfter: 5000 },
      { name: 'Whale Transactions', fn: fetchWhaleTransactions, delayAfter: 2000 },
      { name: 'Crypto News', fn: fetchCryptoNews, delayAfter: 2000 },
      { name: 'Exchange Flows', fn: generateExchangeFlowData, delayAfter: 0 }
    ];
    
    // Results object to track success/failure
    const results = {};
    
    // Execute each fetch with a delay between them
    for (const source of fetchSources) {
      console.log(`\n— Fetching ${source.name}...`);
      
      try {
        const result = await source.fn();
        results[source.name] = result;
        
        if (result.success === false) {
          console.warn(`⚠️ ${source.name} fetch failed: ${result.error}`);
        } else {
          console.log(`✓ ${source.name} fetch completed`);
        }
      } catch (error) {
        console.error(`Error in ${source.name} fetch: ${error.message}`);
        results[source.name] = { success: false, error: error.message };
      }
      
      // Wait between fetches to prevent rate limit issues
      if (source.delayAfter > 0) {
        console.log(`Waiting ${source.delayAfter}ms before next data source...`);
        await new Promise(resolve => setTimeout(resolve, source.delayAfter));
      }
    }
    
    // Write status to log
    writeToLog('status.log', {
      timestamp: new Date().toISOString(),
      fetchResults: results,
      message: 'Data fetch cycle completed'
    });
    
    console.log('\n==== Data fetch cycle completed ====\n');
    
    return {
      success: true,
      results: results
    };
    
  } catch (error) {
    console.error(`Error in fetch cycle: ${error.message}`);
    writeToLog('errors.log', `Error in fetch cycle: ${error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// -----------------------------------------------------
// Express API Server Setup
// -----------------------------------------------------

const app = express();
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get the status of the data store
app.get('/api/status', (req, res) => {
  const timeSinceUpdate = new Date() - dataStore.lastUpdated;
  res.json({
    lastUpdated: dataStore.lastUpdated,
    timeSinceUpdate: `${Math.round(timeSinceUpdate / 1000)} seconds ago`,
    dataAvailable: {
      marketGlobal: !!dataStore.marketGlobal,
      topCoins: !!dataStore.topCoins,
      trendingCoins: !!dataStore.trendingCoins,
      detailedCoins: Object.keys(dataStore.detailedCoins),
      whaleTransactions: !!dataStore.whaleTransactions,
      cryptoNews: !!dataStore.cryptoNews,
      exchangeFlows: !!dataStore.exchangeFlows
    }
  });
});

// Get all available data for the analyst
app.get('/api/data/all', (req, res) => {
  res.json({
    timestamp: new Date(),
    lastUpdated: dataStore.lastUpdated,
    data: {
      marketGlobal: dataStore.marketGlobal,
      topCoins: dataStore.topCoins,
      trendingCoins: dataStore.trendingCoins,
      detailedCoins: dataStore.detailedCoins,
      whaleTransactions: dataStore.whaleTransactions,
      cryptoNews: dataStore.cryptoNews,
      exchangeFlows: dataStore.exchangeFlows
    }
  });
});

// Individual endpoints for each data type
app.get('/api/data/market-global', (req, res) => {
  res.json({
    timestamp: new Date(),
    lastUpdated: dataStore.lastUpdated,
    data: dataStore.marketGlobal
  });
});

app.get('/api/data/top-coins', (req, res) => {
  res.json({
    timestamp: new Date(),
    lastUpdated: dataStore.lastUpdated,
    data: dataStore.topCoins
  });
});

app.get('/api/data/trending-coins', (req, res) => {
  res.json({
    timestamp: new Date(),
    lastUpdated: dataStore.lastUpdated,
    data: dataStore.trendingCoins
  });
});

app.get('/api/data/detailed-coins', (req, res) => {
  res.json({
    timestamp: new Date(),
    lastUpdated: dataStore.lastUpdated,
    data: dataStore.detailedCoins
  });
});

app.get('/api/data/whale-transactions', (req, res) => {
  res.json({
    timestamp: new Date(),
    lastUpdated: dataStore.lastUpdated,
    data: dataStore.whaleTransactions
  });
});

app.get('/api/data/crypto-news', (req, res) => {
  res.json({
    timestamp: new Date(),
    lastUpdated: dataStore.lastUpdated,
    data: dataStore.cryptoNews
  });
});

app.get('/api/data/exchange-flows', (req, res) => {
  res.json({
    timestamp: new Date(),
    lastUpdated: dataStore.lastUpdated,
    data: dataStore.exchangeFlows
  });
});

// Manually trigger a data fetch cycle
app.post('/api/actions/fetch', async (req, res) => {
  try {
    console.log('Manual data fetch triggered via API');
    // Start fetch in background
    fetchAllData();
    res.json({ success: true, message: 'Data fetch cycle started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create and start the server
const server = http.createServer(app);

server.listen(API_PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║            🚀 RADIOO DATA API SERVER STARTED 🚀              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

API server running on port ${API_PORT}
- Data fetch interval: ${FETCH_INTERVAL / 1000} seconds
- CoinGecko API key configured: ${COINGECKO_API_KEY ? 'Yes ✓' : 'No ✗'}
- CoinGecko conservative rate limit: ${MAX_COINGECKO_REQUESTS_PER_MINUTE} requests/minute
- Whale Alert API key configured: ${WHALE_ALERT_API_KEY ? 'Yes ✓' : 'No ✗'} 
- CryptoPanic API key configured: ${CRYPTO_PANIC_API_KEY ? 'Yes ✓' : 'No ✗'}

Available endpoints:
- GET /health - Server health check
- GET /api/status - Data store status
- GET /api/data/all - All cryptocurrency data
- GET /api/data/market-global - Global market data
- GET /api/data/top-coins - Top cryptocurrencies
- GET /api/data/trending-coins - Trending cryptocurrencies
- GET /api/data/detailed-coins - Detailed coin data
- GET /api/data/whale-transactions - Whale transaction data
- GET /api/data/crypto-news - Cryptocurrency news
- GET /api/data/exchange-flows - Exchange flow data
- POST /api/actions/fetch - Trigger data fetch

Press Ctrl+C to stop the server.
`);

  // Start the initial data fetch
  fetchAllData();
  
  // Set up periodic data fetch
  setInterval(fetchAllData, FETCH_INTERVAL);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down API server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});