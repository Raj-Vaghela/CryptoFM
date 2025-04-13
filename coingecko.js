require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.COINGECKO_API_KEY;

// Configuration
const TOP_COINS_COUNT = 10;  // Number of top coins to display
const DISPLAY_FULL_DATA = true;  // Set to false for summary view only
const INCLUDE_PRICE_HISTORY = true;  // Include historical price data
const INCLUDE_DEFI_DATA = true;  // Include DeFi-specific metrics

const instance = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  headers: {
    'x-cg-demo-api-key': API_KEY
  }
});

async function fetchCompleteCoinData(coinId) {
  try {
    console.log(`\nFetching data for ${coinId.toUpperCase()}...\n`);
    
    // Making a single comprehensive request with all parameters enabled
    const response = await instance.get(`/coins/${coinId}`, {
      params: {
        localization: true,
        tickers: true,
        market_data: true,
        community_data: true,
        developer_data: true,
        sparkline: true
      }
    });

    const data = response.data;
    
    // Basic Information
    console.log('\n====== BASIC INFORMATION ======');
    console.log(`🪙 ${data.name} (${data.symbol.toUpperCase()})`);
    console.log(`🔢 Market Cap Rank: #${data.market_cap_rank}`);
    console.log(`📆 Genesis Date: ${data.genesis_date || 'N/A'}`);
    console.log(`🔐 Hashing Algorithm: ${data.hashing_algorithm || 'N/A'}`);
    console.log(`📝 Description: ${data.description.en?.substring(0, 150)}...`);
    console.log(`🏷 Categories: ${data.categories?.join(', ') || 'N/A'}`);
    
    // Price Data
    const md = data.market_data;
    console.log('\n====== PRICE DATA ======');
    console.log(`💵 Current Price (USD): $${md.current_price?.usd || 'N/A'}`);
    console.log(`💵 Current Price (EUR): €${md.current_price?.eur || 'N/A'}`);
    console.log(`💵 Current Price (GBP): £${md.current_price?.gbp || 'N/A'}`);
    console.log(`💵 Current Price (BTC): ₿${md.current_price?.btc || 'N/A'}`);
    console.log(`📈 ATH (USD): $${md.ath?.usd} (${md.ath_date?.usd ? new Date(md.ath_date.usd).toLocaleDateString() : 'N/A'})`);
    console.log(`📉 ATL (USD): $${md.atl?.usd} (${md.atl_date?.usd ? new Date(md.atl_date.usd).toLocaleDateString() : 'N/A'})`);
    console.log(`⏫ Price Change (24h): ${md.price_change_percentage_24h || 'N/A'}%`);
    console.log(`⏫ Price Change (7d): ${md.price_change_percentage_7d || 'N/A'}%`);
    console.log(`⏫ Price Change (30d): ${md.price_change_percentage_30d || 'N/A'}%`);
    console.log(`⏫ Price Change (1y): ${md.price_change_percentage_1y || 'N/A'}%`);
    
    // Volatility Metrics
    if (md.price_change_percentage_24h && md.price_change_percentage_7d) {
      const volatility = Math.abs(md.price_change_percentage_24h);
      let volatilityRating = 'Low';
      if (volatility > 10) volatilityRating = 'Extreme';
      else if (volatility > 5) volatilityRating = 'High';
      else if (volatility > 2) volatilityRating = 'Medium';
      
      console.log(`📊 24h Volatility: ${volatilityRating} (${volatility.toFixed(2)}%)`);
      
      const weeklyTrend = md.price_change_percentage_7d > 0 ? 'Bullish' : 'Bearish';
      console.log(`📈 Weekly Trend: ${weeklyTrend}`);
    }
    
    // Market Data
    console.log('\n====== MARKET DATA ======');
    console.log(`💰 Market Cap (USD): $${md.market_cap?.usd?.toLocaleString() || 'N/A'}`);
    console.log(`📊 Total Volume (24h): $${md.total_volume?.usd?.toLocaleString() || 'N/A'}`);
    console.log(`🧮 Circulating Supply: ${md.circulating_supply?.toLocaleString() || 'N/A'} ${data.symbol.toUpperCase()}`);
    console.log(`🧾 Max Supply: ${md.max_supply ? md.max_supply.toLocaleString() + ' ' + data.symbol.toUpperCase() : 'Unlimited'}`);
    console.log(`🧾 Total Supply: ${md.total_supply ? md.total_supply.toLocaleString() + ' ' + data.symbol.toUpperCase() : 'N/A'}`);
    
    // Supply Metrics
    if (md.circulating_supply && md.max_supply) {
      const supplyRatio = (md.circulating_supply / md.max_supply * 100).toFixed(2);
      console.log(`📑 Circulating/Max Supply Ratio: ${supplyRatio}%`);
    }
    
    if (md.market_cap?.usd && md.total_volume?.usd) {
      const volumeToMcapRatio = (md.total_volume.usd / md.market_cap.usd).toFixed(4);
      console.log(`🔄 Volume/Market Cap Ratio: ${volumeToMcapRatio}`);
    }
    
    // Liquidity & Exchange Data
    console.log('\n====== EXCHANGE DATA ======');
    console.log(`📈 Tickers Count: ${data.tickers ? data.tickers.length : 'N/A'}`);
    if (data.tickers && data.tickers.length > 0) {
      // Group by exchange
      const exchangeVolumes = {};
      data.tickers.forEach(ticker => {
        const exchangeName = ticker.market?.name || 'Unknown';
        const volume = ticker.converted_volume?.usd || 0;
        if (!exchangeVolumes[exchangeName]) exchangeVolumes[exchangeName] = 0;
        exchangeVolumes[exchangeName] += volume;
      });
      
      // Sort exchanges by volume
      const sortedExchanges = Object.entries(exchangeVolumes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      console.log('Top 5 Exchanges by Volume:');
      sortedExchanges.forEach((exchange, i) => {
        console.log(`  ${i+1}. ${exchange[0]}: $${exchange[1].toLocaleString()}`);
      });
      
      // Top trading pairs
      console.log('\nTop 5 Trading Pairs:');
      data.tickers
        .sort((a, b) => (b.converted_volume?.usd || 0) - (a.converted_volume?.usd || 0))
        .slice(0, 5)
        .forEach((ticker, i) => {
          console.log(`  ${i+1}. ${ticker.base}/${ticker.target} on ${ticker.market?.name}: $${ticker.converted_volume?.usd?.toLocaleString() || 'N/A'}`);
        });
    }

    // On-Chain Data
    console.log('\n====== ON-CHAIN DATA ======');
    if (md.blockchain_stats) {
      console.log(`⛓️ Transaction Volume: ${md.blockchain_stats.transaction_volume || 'N/A'}`);
      console.log(`⛓️ Active Addresses: ${md.blockchain_stats.active_addresses || 'N/A'}`);
    } else {
      console.log('No on-chain data available');
      
      // Try to get additional blockchain metrics if available
      if (data.blockchain_data) {
        console.log(`⚡ Block Time: ${data.blockchain_data.block_time_in_minutes || 'N/A'} minutes`);
        console.log(`⛏️ Hash Rate: ${data.blockchain_data.hashrate || 'N/A'}`);
      }
    }
    
    // DeFi Data (for applicable coins)
    if (INCLUDE_DEFI_DATA && data.defi_data) {
      console.log('\n====== DEFI METRICS ======');
      console.log(`🔒 Total Value Locked: $${data.defi_data.tvl?.toLocaleString() || 'N/A'}`);
      console.log(`📊 TVL Ratio: ${data.defi_data.tvl_ratio || 'N/A'}`);
      
      if (data.defi_data.yield_farming) {
        console.log('\nYield Farming Opportunities:');
        data.defi_data.yield_farming.forEach((opp, i) => {
          console.log(`  ${i+1}. ${opp.protocol}: ${opp.apy}% APY`);
        });
      }
    }
    
    // Social & Community Data
    console.log('\n====== COMMUNITY DATA ======');
    console.log(`👥 Community Score: ${data.community_score || 'N/A'}`);
    if (data.community_data) {
      console.log(`🐦 Twitter Followers: ${data.community_data.twitter_followers?.toLocaleString() || 'N/A'}`);
      console.log(`📰 Reddit Subscribers: ${data.community_data.reddit_subscribers?.toLocaleString() || 'N/A'}`);
      console.log(`📱 Telegram Users: ${data.community_data.telegram_channel_user_count?.toLocaleString() || 'N/A'}`);
      console.log(`🌐 Facebook Likes: ${data.community_data.facebook_likes?.toLocaleString() || 'N/A'}`);
      
      // Social Volume and Growth
      if (data.community_data.twitter_followers && data.community_data.twitter_followers_24h_change_percentage) {
        console.log(`📈 Twitter Growth (24h): ${data.community_data.twitter_followers_24h_change_percentage?.toFixed(2) || 'N/A'}%`);
      }
      
      if (data.community_data.reddit_subscribers && data.community_data.reddit_subscribers_24h_change_percentage) {
        console.log(`📈 Reddit Growth (24h): ${data.community_data.reddit_subscribers_24h_change_percentage?.toFixed(2) || 'N/A'}%`);
      }
    }
    
    // Developer Data
    console.log('\n====== DEVELOPER DATA ======');
    console.log(`👨‍💻 Developer Score: ${data.developer_score || 'N/A'}`);
    if (data.developer_data) {
      console.log(`⭐ Stars: ${data.developer_data.stars || 'N/A'}`);
      console.log(`🍴 Forks: ${data.developer_data.forks || 'N/A'}`);
      console.log(`👥 Contributors: ${data.developer_data.contributors || 'N/A'}`);
      console.log(`📝 Total Issues: ${data.developer_data.total_issues || 'N/A'}`);
      console.log(`📝 Closed Issues: ${data.developer_data.closed_issues || 'N/A'}`);
      console.log(`📝 Pull Requests Merged: ${data.developer_data.pull_requests_merged || 'N/A'}`);
      console.log(`📝 Pull Request Contributors: ${data.developer_data.pull_request_contributors || 'N/A'}`);
      console.log(`🧮 Commit Count (4 weeks): ${data.developer_data.commit_count_4_weeks || 'N/A'}`);
      
      // Development activity comparison
      if (data.developer_data.commit_count_4_weeks) {
        let devActivity = 'Low';
        if (data.developer_data.commit_count_4_weeks > 100) devActivity = 'Very High';
        else if (data.developer_data.commit_count_4_weeks > 50) devActivity = 'High';
        else if (data.developer_data.commit_count_4_weeks > 20) devActivity = 'Medium';
        
        console.log(`👨‍💻 Development Activity: ${devActivity}`);
      }
    }
    
    // HODL Analysis
    if (md.price_change_percentage_14d && md.price_change_percentage_60d && md.price_change_percentage_200d && md.price_change_percentage_1y) {
      console.log('\n====== HODL ANALYSIS ======');
      const short = md.price_change_percentage_14d;
      const medium = md.price_change_percentage_60d;
      const long = md.price_change_percentage_1y;
      
      let shortTermOutlook = short > 0 ? 'Positive' : 'Negative';
      let longTermOutlook = long > 0 ? 'Positive' : 'Negative';
      
      console.log(`📉 Short-term Outlook (14d): ${shortTermOutlook} (${short.toFixed(2)}%)`);
      console.log(`📉 Medium-term Change (60d): ${medium.toFixed(2)}%`);
      console.log(`📉 Long-term Outlook (1y): ${longTermOutlook} (${long.toFixed(2)}%)`);
      
      let hodlRecommendation = 'NEUTRAL';
      if (short > 0 && medium > 0 && long > 0) hodlRecommendation = 'STRONG HODL';
      else if (short < 0 && medium < 0 && long < 0) hodlRecommendation = 'CONSIDER SELLING';
      else if (short < 0 && long > 15) hodlRecommendation = 'BUY THE DIP';
      else if (short > 15 && medium > 30) hodlRecommendation = 'TAKE PROFITS';
      
      console.log(`💎 HODL Recommendation: ${hodlRecommendation}`);
    }
    
    // Technical Indicators (simulated)
    console.log('\n====== TECHNICAL INDICATORS ======');
    if (md.price_change_percentage_24h && md.price_change_percentage_7d && md.price_change_percentage_30d) {
      const day = md.price_change_percentage_24h;
      const week = md.price_change_percentage_7d;
      const month = md.price_change_percentage_30d;
      
      // Simple moving average trend simulation
      const shortSMA = day;
      const longSMA = (week + month) / 2;
      
      let smaSignal = 'NEUTRAL';
      if (shortSMA > longSMA + 2) smaSignal = 'STRONG BUY';
      else if (shortSMA > longSMA) smaSignal = 'BUY';
      else if (shortSMA < longSMA - 2) smaSignal = 'STRONG SELL';
      else if (shortSMA < longSMA) smaSignal = 'SELL';
      
      console.log(`📊 SMA Signal: ${smaSignal}`);
      
      // RSI simulation (very rough approximation based on recent price changes)
      let simulatedRSI = 50 + (day * 1.5);
      simulatedRSI = Math.max(0, Math.min(100, simulatedRSI)); // Cap between 0-100
      
      let rsiSignal = 'NEUTRAL';
      if (simulatedRSI > 70) rsiSignal = 'OVERBOUGHT';
      else if (simulatedRSI < 30) rsiSignal = 'OVERSOLD';
      
      console.log(`📈 Simulated RSI: ${simulatedRSI.toFixed(2)} (${rsiSignal})`);
    } else {
      console.log('Insufficient data for technical indicators');
    }
    
    // Sentiment Data
    console.log('\n====== SENTIMENT DATA ======');
    console.log(`🔺 Upvotes: ${data.sentiment_votes_up_percentage || 'N/A'}%`);
    console.log(`🔻 Downvotes: ${data.sentiment_votes_down_percentage || 'N/A'}%`);
    
    if (data.sentiment_votes_up_percentage) {
      let sentimentRating = 'Neutral';
      if (data.sentiment_votes_up_percentage > 75) sentimentRating = 'Very Bullish';
      else if (data.sentiment_votes_up_percentage > 60) sentimentRating = 'Bullish';
      else if (data.sentiment_votes_up_percentage < 40) sentimentRating = 'Bearish';
      else if (data.sentiment_votes_up_percentage < 25) sentimentRating = 'Very Bearish';
      
      console.log(`🧠 Overall Sentiment: ${sentimentRating}`);
    }
    
    // Links & Resources
    console.log('\n====== LINKS & RESOURCES ======');
    console.log(`🌐 Website: ${data.links?.homepage?.filter(Boolean)[0] || 'N/A'}`);
    console.log(`📰 Reddit: ${data.links?.subreddit_url || 'N/A'}`);
    console.log(`🐦 Twitter: ${data.links?.twitter_screen_name ? `https://twitter.com/${data.links.twitter_screen_name}` : 'N/A'}`);
    console.log(`📱 Telegram: ${data.links?.telegram_channel_identifier ? `https://t.me/${data.links.telegram_channel_identifier}` : 'N/A'}`);
    console.log(`💻 GitHub: ${data.links?.repos_url?.github && data.links.repos_url.github.length > 0 ? data.links.repos_url.github[0] : 'N/A'}`);
    console.log(`📖 Whitepaper: ${data.links?.whitepaper || 'N/A'}`);
    console.log(`🔗 Blockchain Explorer: ${data.links?.blockchain_site?.filter(Boolean)[0] || 'N/A'}`);
    
    // Price Changes with Sparkline
    if (INCLUDE_PRICE_HISTORY) {
      console.log('\n====== PRICE TRENDS ======');
      if (md.sparkline_7d && md.sparkline_7d.price) {
        const prices = md.sparkline_7d.price;
        const samples = prices.length > 10 ? 10 : prices.length;
        const interval = Math.floor(prices.length / samples);
        
        console.log('7-Day Price Sparkline:');
        let sparkline = '';
        for (let i = 0; i < samples; i++) {
          const price = prices[i * interval];
          sparkline += `$${price.toFixed(2)} `;
          if (i < samples - 1) {
            const change = prices[(i+1) * interval] - price;
            sparkline += change >= 0 ? '↗ ' : '↘ ';
          }
        }
        console.log(sparkline);
        
        // Calculate volatility
        let volatilitySum = 0;
        for (let i = 1; i < prices.length; i++) {
          const percentChange = (prices[i] - prices[i-1]) / prices[i-1] * 100;
          volatilitySum += Math.abs(percentChange);
        }
        const avgDailyVolatility = volatilitySum / prices.length;
        console.log(`📊 Average Daily Volatility: ${avgDailyVolatility.toFixed(2)}%`);
      }
    }
    
    // Public Interest Stats
    console.log('\n====== PUBLIC INTEREST ======');
    if (data.public_interest_stats) {
      console.log(`🔍 Alexa Rank: ${data.public_interest_stats.alexa_rank || 'N/A'}`);
      console.log(`🔎 Google Trends: ${data.public_interest_stats.bing_matches || 'N/A'}`);
    } else {
      console.log('No public interest data available');
    }

    // Status Updates
    console.log('\n====== RECENT UPDATES ======');
    if (data.status_updates && data.status_updates.length > 0) {
      data.status_updates.slice(0, 3).forEach((update, i) => {
        console.log(`Update ${i+1}: ${update.description?.substring(0, 100)}... (${new Date(update.created_at).toLocaleDateString()})`);
      });
    } else {
      console.log('No recent status updates available');
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (err) {
    console.error(`❌ Error fetching data for ${coinId}:`, err.response?.data || err.message);
    if (err.response && err.response.status === 429) {
      console.error('Rate limit exceeded. Consider upgrading your CoinGecko plan or reducing request frequency.');
    } else if (err.response && err.response.status === 404) {
      console.error(`Coin "${coinId}" not found. Please check the coin ID.`);
    }
  }
}

async function main() {
  console.log('🚀 COINGECKO MARKET INTELLIGENCE 🚀');
  console.log('===================================');
  
  // Get command line arguments
  const args = process.argv.slice(2);
  const coinId = args[0]; // Could be a specific coin ID or null
  
  // Always fetch global market data
  const globalData = await getGlobalMarketData();
  if (globalData) {
    await displayGlobalMarketData(globalData);
  }
  
  // Always fetch trending coins
  const trendingCoins = await getTrendingCoins();
  if (trendingCoins.length > 0) {
    await displayTrendingCoins(trendingCoins);
  }
  
  // Always fetch top coins
  const topCoins = await getTopCoins(TOP_COINS_COUNT);
  if (topCoins.length > 0) {
    await displaySummaryView(topCoins);
    
    // If a specific coin was provided, just get detailed data for that coin
    if (coinId && coinId !== '--top' && coinId !== '-t') {
      await fetchCompleteCoinData(coinId);
    } 
    // Otherwise show detailed data for top coins if enabled
    else if (DISPLAY_FULL_DATA) {
      for (const coin of topCoins) {
        await fetchCompleteCoinData(coin.id);
      }
    }
  }
  
  console.log('\n🏁 COINGECKO ANALYSIS COMPLETE 🏁');
}

async function getTopCoins(limit = 10) {
  try {
    console.log(`Fetching top ${limit} coins by market cap...`);
    const response = await instance.get('/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: limit,
        page: 1,
        sparkline: true,
        price_change_percentage: '1h,24h,7d,14d,30d,200d,1y'
      }
    });
    return response.data;
  } catch (err) {
    console.error('❌ Error fetching top coins:', err.response?.data || err.message);
    return [];
  }
}

async function getTrendingCoins() {
  try {
    console.log('Fetching trending coins...');
    const response = await instance.get('/search/trending');
    return response.data.coins.map(item => item.item);
  } catch (err) {
    console.error('❌ Error fetching trending coins:', err.response?.data || err.message);
    return [];
  }
}

async function getGlobalMarketData() {
  try {
    console.log('Fetching global market data...');
    const response = await instance.get('/global');
    return response.data.data;
  } catch (err) {
    console.error('❌ Error fetching global market data:', err.response?.data || err.message);
    return null;
  }
}

async function displaySummaryView(coins) {
  console.log('\n====== TOP CRYPTOCURRENCIES SUMMARY ======');
  console.log('Rank | Name | Price (USD) | 24h Change | 7d Change | Market Cap | Volume (24h)');
  console.log('-'.repeat(85));
  
  coins.forEach(coin => {
    const price = coin.current_price ? `$${coin.current_price.toLocaleString()}` : 'N/A';
    const change24h = coin.price_change_percentage_24h ? `${coin.price_change_percentage_24h.toFixed(2)}%` : 'N/A';
    const change7d = coin.price_change_percentage_7d_in_currency ? `${coin.price_change_percentage_7d_in_currency.toFixed(2)}%` : 'N/A';
    const marketCap = coin.market_cap ? `$${(coin.market_cap / 1e9).toFixed(2)}B` : 'N/A';
    const volume = coin.total_volume ? `$${(coin.total_volume / 1e9).toFixed(2)}B` : 'N/A';
    
    console.log(`#${coin.market_cap_rank} | ${coin.name} (${coin.symbol.toUpperCase()}) | ${price} | ${change24h} | ${change7d} | ${marketCap} | ${volume}`);
  });
}

async function displayGlobalMarketData(globalData) {
  if (!globalData) return;
  
  console.log('\n====== GLOBAL CRYPTO MARKET ======');
  console.log(`📊 Total Market Cap: $${(globalData.total_market_cap.usd / 1e12).toFixed(2)} Trillion`);
  console.log(`📈 Total 24h Volume: $${(globalData.total_volume.usd / 1e9).toFixed(2)} Billion`);
  console.log(`🔢 Active Cryptocurrencies: ${globalData.active_cryptocurrencies}`);
  console.log(`📱 Markets: ${globalData.markets}`);
  console.log(`📊 BTC Dominance: ${globalData.market_cap_percentage.btc.toFixed(2)}%`);
  console.log(`📊 ETH Dominance: ${globalData.market_cap_percentage.eth.toFixed(2)}%`);
  
  // Market Cap Distribution
  console.log('\nMarket Cap Distribution:');
  Object.entries(globalData.market_cap_percentage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([symbol, percentage]) => {
      console.log(`  ${symbol.toUpperCase()}: ${percentage.toFixed(2)}%`);
    });
}

async function displayTrendingCoins(trendingCoins) {
  console.log('\n====== TRENDING COINS (24h) ======');
  
  trendingCoins.forEach((coin, i) => {
    console.log(`${i+1}. ${coin.name} (${coin.symbol}) - Market Cap Rank: #${coin.market_cap_rank || 'N/A'} - Score: ${coin.score}`);
  });
}

// Run the script
main();

