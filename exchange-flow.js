/**
 * RADIOO - Exchange Flow Logger
 * 
 * Simulates and logs cryptocurrency exchange inflow and outflow data
 * since most exchange flow APIs require paid subscriptions.
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR);
}

// Top cryptocurrencies to track
const TOP_COINS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'AVAX'];

// Top exchanges to track
const EXCHANGES = ['Binance', 'Coinbase', 'Kraken', 'FTX', 'Kucoin', 'Huobi', 'Gate.io', 'Bitfinex'];

/**
 * Generate realistic simulated exchange flow data
 * @param {string[]} coins - Array of coin symbols to generate data for
 * @returns {Object} - Exchange flow data
 */
function generateExchangeFlowData(coins = TOP_COINS) {
  const timestamp = new Date().toISOString();
  const flowData = { 
    timestamp,
    generated_at: Date.now(),
    coins: []
  };
  
  coins.forEach(coin => {
    // Create realistic looking data for each coin
    const coinData = {
      symbol: coin,
      total_inflow: Math.floor(Math.random() * 500) + 50,  // 50-550 coins
      total_outflow: Math.floor(Math.random() * 500) + 50, // 50-550 coins
      exchanges: [],
      net_flow: 0
    };
    
    // Generate data for individual exchanges
    EXCHANGES.forEach(exchange => {
      // Randomly skip some exchanges for some coins
      if (Math.random() > 0.8) return;
      
      const inflow = Math.floor(Math.random() * 100) + 5;
      const outflow = Math.floor(Math.random() * 100) + 5;
      const netFlow = inflow - outflow;
      
      // Add to totals
      coinData.total_inflow += inflow;
      coinData.total_outflow += outflow;
      
      coinData.exchanges.push({
        name: exchange,
        inflow,
        outflow,
        net_flow: netFlow
      });
    });
    
    // Calculate net flow
    coinData.net_flow = coinData.total_inflow - coinData.total_outflow;
    
    // Add sentiment analysis
    if (coinData.net_flow > 0) {
      coinData.sentiment = coinData.net_flow > 100 ? 'strongly_bullish' : 'bullish';
      coinData.analysis = 'Net accumulation, coins moving off exchanges';
    } else if (coinData.net_flow < 0) {
      coinData.sentiment = coinData.net_flow < -100 ? 'strongly_bearish' : 'bearish';
      coinData.analysis = 'Net distribution, coins moving to exchanges';
    } else {
      coinData.sentiment = 'neutral';
      coinData.analysis = 'Balanced flow between exchanges';
    }
    
    flowData.coins.push(coinData);
  });
  
  return flowData;
}

/**
 * Log exchange flow data to file
 */
function logExchangeFlowData() {
  try {
    console.log('Generating exchange flow data...');
    
    const flowData = generateExchangeFlowData();
    const logFile = path.join(LOGS_DIR, 'exchange_flows.log');
    
    // Format timestamp for logging
    const timestamp = new Date().toISOString();
    const content = `[${timestamp}] ${JSON.stringify(flowData, null, 2)}\n\n`;
    
    fs.appendFileSync(logFile, content);
    console.log(`Exchange flow data written to exchange_flows.log`);
    
    return flowData;
  } catch (error) {
    console.error(`Error logging exchange flow data: ${error.message}`);
    return null;
  }
}

// If this file is run directly, generate and log data
if (require.main === module) {
  console.log('Running exchange flow data generator...');
  const data = logExchangeFlowData();
  console.log(`Generated data for ${data.coins.length} coins`);
}

// Export for use in other modules
module.exports = {
  generateExchangeFlowData,
  logExchangeFlowData
}; 