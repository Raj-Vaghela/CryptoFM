/**
 * Crypto News API Module
 * 
 * Fetches and analyzes cryptocurrency news from various sources
 */

require('dotenv').config();
const axios = require('axios');

// API Configuration
const CRYPTO_PANIC_API_KEY = process.env.CRYPTO_PANIC_API_KEY || null;
const NEWS_COUNT = 5; // Default number of news items to display

// Create axios instance for CryptoPanic
const cryptoPanicApi = axios.create({
  baseURL: 'https://cryptopanic.com/api/v1/',
  params: {
    auth_token: CRYPTO_PANIC_API_KEY
  }
});

// Create axios instance for CoinGecko
const coinGeckoApi = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  headers: {
    'Accept': 'application/json'
  }
});

/**
 * Fetch crypto news from CoinGecko or CryptoPanic
 * @param {string[]} coinSymbols - Array of coin symbols to filter news (optional)
 * @param {number} count - Number of news items to retrieve
 * @returns {Promise<Array>} - Array of news items
 */
async function fetchCryptoNews(coinSymbols = [], count = NEWS_COUNT) {
  console.log(`📰 Fetching crypto news${coinSymbols.length > 0 ? ` for ${coinSymbols.join(', ')}` : ''}...`);
  
  try {
    // Try CoinGecko first since it doesn't require an API key
    const coinGeckoNews = await fetchCoinGeckoNews(count);
    if (coinGeckoNews.length > 0) {
      return coinGeckoNews;
    }
    
    // If CoinGecko fails or returns no news, try CryptoPanic if API key is available
    if (CRYPTO_PANIC_API_KEY) {
      return await fetchCryptoPanicNews(coinSymbols, count);
    } else {
      console.log("ℹ️ CoinGecko news unavailable and no CryptoPanic API key found.");
      console.log("ℹ️ Sign up for a CryptoPanic API key at https://cryptopanic.com/developers/api/");
      return [];
    }
  } catch (error) {
    console.error(`❌ Error fetching crypto news: ${error.message}`);
    return [];
  }
}

/**
 * Fetch news from CoinGecko
 * @param {number} count - Number of news items to retrieve
 * @returns {Promise<Array>} - Array of formatted news items
 */
async function fetchCoinGeckoNews(count) {
  try {
    const response = await coinGeckoApi.get('/news');
    return response.data.slice(0, count).map(item => ({
      title: item.title,
      url: item.url,
      source: item.source,
      date: new Date(item.created_at).toLocaleString(),
      sentiment: analyzeSentiment(item.title),
      coins: item.categories ? item.categories.split('|') : []
    }));
  } catch (error) {
    console.log("ℹ️ Could not fetch news from CoinGecko");
    return [];
  }
}

/**
 * Fetch news from CryptoPanic API
 * @param {string[]} coinSymbols - Array of coin symbols to filter news
 * @param {number} count - Number of news items to retrieve
 * @returns {Promise<Array>} - Array of formatted news items
 */
async function fetchCryptoPanicNews(coinSymbols = [], count) {
  const params = {
    limit: count,
    public: true
  };
  
  if (coinSymbols.length > 0) {
    params.currencies = coinSymbols.join(',');
  }
  
  try {
    const response = await cryptoPanicApi.get('/posts/', { params });
    return response.data.results.map(item => ({
      title: item.title,
      url: item.url,
      source: item.source.title,
      date: new Date(item.created_at).toLocaleString(),
      sentiment: item.votes ? determineSentiment(item.votes) : analyzeSentiment(item.title),
      coins: item.currencies ? item.currencies.map(c => c.code) : []
    }));
  } catch (error) {
    console.error(`❌ CryptoPanic API error: ${error.message}`);
    return [];
  }
}

/**
 * Determine sentiment based on CryptoPanic votes
 * @param {Object} votes - Vote counts from CryptoPanic
 * @returns {string} - Sentiment classification
 */
function determineSentiment(votes) {
  if (votes.negative > votes.positive) {
    return 'bearish';
  } else if (votes.positive > votes.negative) {
    return 'bullish';
  } else {
    return 'neutral';
  }
}

/**
 * Simple sentiment analysis based on keyword matching
 * @param {string} text - Text to analyze
 * @returns {string} - Sentiment classification
 */
function analyzeSentiment(text) {
  const lowercaseText = text.toLowerCase();
  
  // Bullish keywords
  const bullishWords = ['bullish', 'surge', 'soar', 'rally', 'jump', 'gain', 'high', 'uptrend', 'rise', 'boom', 'growth', 'positive', 'adoption', 'breakthrough'];
  
  // Bearish keywords
  const bearishWords = ['bearish', 'crash', 'plunge', 'dip', 'fall', 'drop', 'tumble', 'decrease', 'low', 'downtrend', 'decline', 'negative', 'sell-off', 'risk'];
  
  let bullishScore = 0;
  let bearishScore = 0;
  
  // Count occurrences of bullish and bearish words
  bullishWords.forEach(word => {
    if (lowercaseText.includes(word)) bullishScore++;
  });
  
  bearishWords.forEach(word => {
    if (lowercaseText.includes(word)) bearishScore++;
  });
  
  // Determine sentiment based on scores
  if (bullishScore > bearishScore) {
    return 'bullish';
  } else if (bearishScore > bullishScore) {
    return 'bearish';
  } else {
    return 'neutral';
  }
}

/**
 * Display news items with formatting
 * @param {Array} news - Array of news items
 */
function displayCryptoNews(news) {
  if (news.length === 0) {
    console.log("⚠️ No crypto news available");
    return;
  }
  
  console.log("\n📰 LATEST CRYPTO NEWS:");
  console.log("--------------------------------------------------");
  
  news.forEach((item, index) => {
    const sentimentEmoji = getSentimentEmoji(item.sentiment);
    console.log(`${index + 1}. ${item.title}`);
    console.log(`   Source: ${item.source} | Date: ${item.date}`);
    
    if (item.coins && item.coins.length > 0) {
      console.log(`   Related: ${item.coins.join(', ')}`);
    }
    
    console.log(`   Sentiment: ${sentimentEmoji} ${item.sentiment}`);
    console.log(`   URL: ${item.url}`);
    console.log("--------------------------------------------------");
  });
}

/**
 * Get emoji for sentiment
 * @param {string} sentiment - Sentiment classification
 * @returns {string} - Corresponding emoji
 */
function getSentimentEmoji(sentiment) {
  switch (sentiment) {
    case 'bullish': return '🟢';
    case 'bearish': return '🔴';
    default: return '⚪';
  }
}

/**
 * Main function to run the crypto news module
 * @param {string[]} args - Command line arguments
 */
async function main(args) {
  try {
    // Parse command line arguments
    let coinSymbols = [];
    let count = NEWS_COUNT;
    
    if (args.length > 0 && args[0] !== 'help') {
      coinSymbols = args[0].split(',');
      
      if (args.length > 1) {
        const parsedCount = parseInt(args[1]);
        if (!isNaN(parsedCount) && parsedCount > 0) {
          count = parsedCount;
        }
      }
    } else if (args.length > 0 && args[0] === 'help') {
      displayHelp();
      return;
    }
    
    const news = await fetchCryptoNews(coinSymbols, count);
    displayCryptoNews(news);
  } catch (error) {
    console.error(`❌ An error occurred: ${error.message}`);
  }
}

/**
 * Display help information
 */
function displayHelp() {
  console.log("\n📰 CRYPTO NEWS MODULE HELP");
  console.log("========================================");
  console.log("Usage: node crypto-news.js [coin_symbols] [count]");
  console.log("\nExamples:");
  console.log("  node crypto-news.js                    - Fetch news for all cryptocurrencies");
  console.log("  node crypto-news.js BTC,ETH,SOL        - Fetch news for Bitcoin, Ethereum and Solana");
  console.log("  node crypto-news.js BTC,ETH 10         - Fetch 10 news items for Bitcoin and Ethereum");
  console.log("\nParameters:");
  console.log("  coin_symbols - Comma-separated list of coin symbols (optional)");
  console.log("  count        - Number of news items to display (default: 5)");
  console.log("\nAPI Keys:");
  console.log("  Set CRYPTO_PANIC_API_KEY in .env file for enhanced news access");
  console.log("  Register at: https://cryptopanic.com/developers/api/");
  console.log("========================================");
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main(process.argv.slice(2));
}

// Export functions for use in other modules
module.exports = {
  fetchCryptoNews,
  displayCryptoNews
};
