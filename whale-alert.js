require('dotenv').config();
const axios = require('axios');

// API key configuration
const WHALE_ALERT_API_KEY = process.env.WHALE_ALERT_API_KEY || '';

// Default configuration
const DEFAULT_MIN_VALUE = 1000000; // Minimum transaction value in USD (default: $1M)
const DEFAULT_TIME_RANGE = 24; // Time range in hours (default: 24h)

async function fetchWhaleTransactions(minValue = DEFAULT_MIN_VALUE, timeRange = DEFAULT_TIME_RANGE) {
  if (!WHALE_ALERT_API_KEY) {
    console.log('\n⚠️ Whale Alert API key not configured. To enable whale alerts:');
    console.log('1. Sign up at https://docs.whale-alert.io/');
    console.log('2. Get your API key');
    console.log('3. Set the WHALE_ALERT_API_KEY environment variable in your .env file');
    return [];
  }
  
  try {
    console.log(`\nFetching significant whale transactions (>${minValue.toLocaleString()} USD) from the last ${timeRange} hours...`);
    
    // Calculate time range 
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - (timeRange * 60 * 60);
    
    const response = await axios.get(`https://api.whale-alert.io/v1/transactions`, {
      params: {
        api_key: WHALE_ALERT_API_KEY,
        min_value: minValue,
        start: startTime,
        end: now,
        cursor: '',
        limit: 25
      }
    });
    
    return response.data.transactions || [];
  } catch (err) {
    console.error('❌ Error fetching whale alerts:', err.response?.data || err.message);
    if (err.response && err.response.status === 429) {
      console.error('Rate limit exceeded. Check your Whale Alert API subscription limits.');
    } else if (err.response && err.response.status === 401) {
      console.error('Authentication failed. Invalid API key.');
    }
    return [];
  }
}

function analyzeTransaction(tx) {
  let analysis = 'NEUTRAL';
  let reason = '';
  
  // Analyze based on source/destination types
  if (tx.from.owner_type === 'exchange' && tx.to.owner_type === 'unknown') {
    analysis = 'BULLISH';
    reason = 'Withdrawn from exchange to likely private wallet (HODLing)';
  } 
  else if (tx.from.owner_type === 'unknown' && tx.to.owner_type === 'exchange') {
    analysis = 'BEARISH';
    reason = 'Moving from private wallet to exchange (Potential selling)';
  } 
  else if (tx.from.owner_type === 'exchange' && tx.to.owner_type === 'exchange') {
    analysis = 'NEUTRAL';
    reason = 'Exchange to exchange transfer';
  }
  else if (tx.from.owner_type === 'miner' && tx.to.owner_type === 'exchange') {
    analysis = 'BEARISH';
    reason = 'Miner sending to exchange (Potential selling)';
  }
  
  // Additional analysis on transaction size
  if (tx.amount_usd > 10000000) { // Transactions over $10M
    if (analysis === 'BULLISH') {
      analysis = 'STRONG BULLISH';
    } else if (analysis === 'BEARISH') {
      analysis = 'STRONG BEARISH';
    }
  }
  
  return { analysis, reason };
}

function displayWhaleTransaction(tx, index) {
  const { analysis, reason } = analyzeTransaction(tx);
  const date = new Date(tx.timestamp * 1000).toLocaleString();
  const amount = tx.amount.toLocaleString();
  const value = tx.amount_usd ? `$${tx.amount_usd.toLocaleString()}` : 'Unknown';
  
  // Determine indicator emoji based on analysis
  let indicator = '➡️';
  if (analysis.includes('BULLISH')) indicator = '🟢';
  else if (analysis.includes('BEARISH')) indicator = '🔴';
  
  console.log(`\n${indicator} Whale Transaction #${index+1}:`);
  console.log(`   Symbol: ${tx.symbol.toUpperCase()}`);
  console.log(`   Amount: ${amount} ${tx.symbol.toUpperCase()} (${value} USD)`);
  console.log(`   From: ${tx.from.owner_type || 'Unknown'} ${tx.from.owner || ''} ${tx.from.address?.substring(0, 10) || ''}`);
  console.log(`   To: ${tx.to.owner_type || 'Unknown'} ${tx.to.owner || ''} ${tx.to.address?.substring(0, 10) || ''}`);
  console.log(`   Time: ${date}`);
  console.log(`   Blockchain: ${tx.blockchain}`);
  console.log(`   Analysis: ${analysis} - ${reason}`);
  
  if (tx.transaction_type) {
    console.log(`   Type: ${tx.transaction_type}`);
  }
  
  if (tx.hash) {
    console.log(`   Hash: ${tx.hash}`);
  }
}

function summarizeWhaleActivity(transactions) {
  if (transactions.length === 0) return;
  
  // Group by currency
  const byCurrency = {};
  transactions.forEach(tx => {
    const symbol = tx.symbol.toUpperCase();
    if (!byCurrency[symbol]) {
      byCurrency[symbol] = { 
        count: 0, 
        totalVolume: 0, 
        totalUSD: 0,
        bullish: 0,
        bearish: 0,
        neutral: 0
      };
    }
    
    const { analysis } = analyzeTransaction(tx);
    
    byCurrency[symbol].count++;
    byCurrency[symbol].totalVolume += tx.amount;
    byCurrency[symbol].totalUSD += tx.amount_usd || 0;
    
    if (analysis.includes('BULLISH')) byCurrency[symbol].bullish++;
    else if (analysis.includes('BEARISH')) byCurrency[symbol].bearish++;
    else byCurrency[symbol].neutral++;
  });
  
  console.log('\n====== WHALE ACTIVITY SUMMARY ======');
  console.log('Currency | Transactions | Total Volume | USD Value | Sentiment');
  console.log('-'.repeat(80));
  
  Object.entries(byCurrency).forEach(([symbol, data]) => {
    let sentiment = 'NEUTRAL';
    if (data.bullish > data.bearish) sentiment = 'BULLISH';
    else if (data.bearish > data.bullish) sentiment = 'BEARISH';
    
    console.log(`${symbol} | ${data.count} | ${data.totalVolume.toLocaleString()} | $${data.totalUSD.toLocaleString()} | ${sentiment} (🟢${data.bullish}/🔴${data.bearish}/➡️${data.neutral})`);
  });
}

async function main() {
  console.log('🐋 WHALE ALERT TRANSACTION ANALYSIS 🐋');
  console.log('=====================================');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let minValue = DEFAULT_MIN_VALUE;
  let timeRange = DEFAULT_TIME_RANGE;
  
  // Allow command line arguments to override defaults
  if (args.length > 0 && !isNaN(args[0])) {
    minValue = parseInt(args[0]);
  }
  
  if (args.length > 1 && !isNaN(args[1])) {
    timeRange = parseInt(args[1]);
  }
  
  // Fetch whale transactions
  const transactions = await fetchWhaleTransactions(minValue, timeRange);
  
  if (transactions.length === 0) {
    console.log(`\nNo significant whale transactions found in the last ${timeRange} hours.`);
    return;
  }
  
  console.log(`\nFound ${transactions.length} significant whale transactions:\n`);
  
  // Display transaction details
  transactions.forEach((tx, i) => {
    displayWhaleTransaction(tx, i);
  });
  
  // Provide summary statistics
  summarizeWhaleActivity(transactions);
  
  console.log('\n🏁 WHALE ALERT ANALYSIS COMPLETE 🏁');
}

// Run the script
main(); 