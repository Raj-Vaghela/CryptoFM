/**
 * RADIOO - Data Analyst Agent
 * 
 * An AI agent that analyzes cryptocurrency data from the API server and prepares
 * comprehensive reports using the Gemini API.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuration
const REPORTS_DIR = path.join(__dirname, 'reports');
const ANALYSIS_INTERVAL = process.env.ANALYSIS_INTERVAL || 60 * 1000; // Default: 60 seconds (aligned with README)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash"; // Using Gemini 2.0 Flash model
const API_SERVER_URL = process.env.API_SERVER_URL || 'http://localhost:3000'; // URL of our data API server

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR);
}

// Initialize Gemini API
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is required. Please add it to your .env file.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Create Axios instance for API server communication
const apiClient = axios.create({
  baseURL: API_SERVER_URL,
  timeout: 10000
});

// Helper function to add timestamps to console logs
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

/**
 * Fetch the latest cryptocurrency data from the API server
 * @returns {Object} All recent cryptocurrency data
 */
async function fetchLatestData() {
  console.log('Fetching latest data from API server...');
  
  try {
    // Check API server health
    await apiClient.get('/health').catch(error => {
      throw new Error(`API server health check failed: ${error.message}. Is the API server running at ${API_SERVER_URL}?`);
    });
    
    // Get status to check data availability
    const statusResponse = await apiClient.get('/api/status');
    const status = statusResponse.data;
    
    console.log(`API server last updated: ${status.lastUpdated} (${status.timeSinceUpdate})`);
    
    // Check if any data is available
    const hasAnyData = Object.values(status.dataAvailable).some(val => 
      val === true || (Array.isArray(val) && val.length > 0)
    );
    
    if (!hasAnyData) {
      throw new Error('No data available from API server yet. Waiting for data collection...');
    }
    
    // Fetch all data at once
    const response = await apiClient.get('/api/data/all');
    const data = response.data.data;
    
    console.log(`Fetched data from API server with ${Object.keys(data.detailedCoins).length} detailed coins`);
    return data;
  } catch (error) {
    console.error(`Error fetching data from API server: ${error.message}`);
    return null;
  }
}

/**
 * Generate a comprehensive report using Gemini AI
 * @param {Object} data - The cryptocurrency data
 * @returns {string} AI-generated analysis report
 */
async function generateAnalysisReport(data) {
  if (!data) {
    console.error('No data available for analysis');
    return 'No data available for analysis';
  }
  
  console.log('Generating detailed market analysis report using Gemini...');
  
  try {
    // Prepare cryptocurrency data with increased depth for more accurate analysis
    const marketData = data.marketGlobal ? JSON.stringify(limitObjectDepth(data.marketGlobal, 4), null, 2) : 'No market data available';
    
    // Include top 5 coins with greater depth
    const topCoinsData = data.topCoins 
      ? JSON.stringify(data.topCoins.slice(0, 5).map(coin => limitObjectDepth(coin, 4)), null, 2) 
      : 'No top coins data available';
    
    // Include more whale transactions for better pattern analysis
    const whaleData = data.whaleTransactions && data.whaleTransactions.transactions
      ? JSON.stringify(limitObjectDepth({ transactions: data.whaleTransactions.transactions.slice(0, 5) }, 3), null, 2)
      : 'No whale transactions available';
    
    // Include more comprehensive news data
    const newsData = data.cryptoNews 
      ? JSON.stringify(limitObjectDepth(data.cryptoNews, 3), null, 2).substring(0, 8000) 
      : 'No crypto news available';
    
    // Extract potentially important breaking news (newest items or containing keywords)
    let breakingNewsData = 'No breaking news available';
    if (data.cryptoNews && Array.isArray(data.cryptoNews.results)) {
      // Filter for potentially important news
      const importantKeywords = ['crash', 'surge', 'hack', 'exploit', 'ban', 'regulation', 
        'sec', 'breaking', 'urgent', 'alert', 'major', 'significant', 'volatility',
        'approved', 'rejected', 'laundering', 'sanction', 'investigation', 'collapse'];
      
      // Get the newest 10 news items
      const recentNews = [...data.cryptoNews.results].slice(0, 10);
      
      // Filter for important news
      const importantNews = recentNews.filter(news => {
        if (!news.title && !news.body) return false;
        const text = (news.title || '') + ' ' + (news.body || '');
        return importantKeywords.some(keyword => 
          text.toLowerCase().includes(keyword.toLowerCase())
        );
      });
      
      // Use important news if available, otherwise just use the newest items
      const breakingNews = importantNews.length > 0 ? importantNews : recentNews.slice(0, 3);
      
      // Format breaking news
      breakingNewsData = JSON.stringify(breakingNews.map(news => ({
        title: news.title,
        source: news.source?.domain || news.source?.title || 'Unknown Source',
        url: news.url,
        published_at: news.published_at,
        is_hot: importantKeywords.some(keyword => 
          ((news.title || '') + ' ' + (news.body || '')).toLowerCase().includes(keyword.toLowerCase())
        )
      })), null, 2);
    }
    
    // More detailed exchange flow data
    const exchangeData = data.exchangeFlows 
      ? JSON.stringify(limitObjectDepth(data.exchangeFlows, 3), null, 2) 
      : 'No exchange flow data available';
    
    // Detailed coin information for deeper analysis
    let detailedCoinsData = 'No detailed coin data available';
    if (data.detailedCoins && Object.keys(data.detailedCoins).length > 0) {
      detailedCoinsData = JSON.stringify(
        Object.entries(data.detailedCoins)
        .slice(0, 3)
        .map(([coinId, coinData]) => ({
          id: coinId,
          data: limitObjectDepth(coinData, 4)
        })), 
        null, 2
      );
    }
    
    // Get model ready
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.4, // Slightly higher temperature for more creative analysis
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192, // Increased for more detailed reports
      }
    });
    
    // Create a more detailed prompt for comprehensive human-like reports
    const prompt = `
    You are CryptoInsightPro, an expert cryptocurrency market analyst with 10+ years of experience in financial markets and blockchain technology. Create a detailed, professional market report based on the following real-time data from ${new Date().toLocaleString()}.

    Your report should read as if written by a senior human analyst who has meticulously studied this data and identified key patterns, correlations, and actionable insights. Use professional financial analysis language but remain accessible.

    # Global Market Data
    ${marketData}

    # Top Cryptocurrencies
    ${topCoinsData}

    # Detailed Cryptocurrency Information
    ${detailedCoinsData}

    # Recent Whale Transactions
    ${whaleData}

    # Recent Crypto News
    ${newsData}

    # Breaking News
    ${breakingNewsData}

    # Exchange Flows
    ${exchangeData}

    Create a comprehensive analyst report with the following structure:

    ## BREAKING NEWS & CRITICAL DEVELOPMENTS
    - Highlight 2-3 of the most important and time-sensitive market developments
    - Focus on events with immediate market impact (major price movements, regulatory changes, significant hacks)
    - Include relevant timestamps and immediate implications
    - Use bold formatting for truly urgent items
    - Be alert for events that could cause immediate volatility

    ## 1. EXECUTIVE SUMMARY
    - Provide a concise but detailed overview of current market conditions
    - Highlight 3-4 key insights that investors should know immediately
    - Include one standout opportunity and one notable risk

    ## 2. MARKET ANALYSIS
    - Analyze global market trends including total market capitalization, trading volumes, and BTC dominance
    - Identify specific market patterns (accumulation, distribution, consolidation)
    - Compare current conditions to historical contexts where relevant
    - Use bullet points for key metrics with your interpretation of what they mean

    ## 3. TOP CRYPTOCURRENCY ANALYSIS
    - Provide detailed analysis for each major cryptocurrency
    - Include price action, trading volume analysis, key support/resistance levels
    - Note any divergences between price and volume or other technical indicators
    - Make comparisons between different assets where meaningful patterns exist

    ## 4. WHALE ACTIVITY ANALYSIS
    - Analyze recent large transactions
    - Interpret what these movements might indicate about institutional sentiment
    - Identify any concentration or distribution patterns
    - Connect whale activity to price movements where correlations exist

    ## 5. NEWS IMPACT ASSESSMENT
    - Analyze how recent news has affected or might affect market movements
    - Separate signal from noise - identify which news items actually matter
    - Predict potential future impacts of ongoing developments
    - Use bulleted lists for a breakdown of key news items and their significance

    ## 6. TECHNICAL INDICATORS & SIGNALS
    - Identify specific trading signals from the data
    - Note key levels to watch (support, resistance, liquidity zones)
    - Highlight any divergences, pattern formations, or noteworthy volume profiles
    - Present risk/reward assessments for potential trade setups

    ## 7. MARKET OUTLOOK & PREDICTIONS
    - Provide short-term (24-48h) and medium-term (7-14d) market outlook
    - Include specific price targets or ranges for major assets
    - Highlight key events on the horizon that could impact markets
    - Offer strategic recommendations for different types of market participants (traders, investors)

    Format the report in clean, professional Markdown with appropriate headings, bullet points, and occasional emphasis. Include specific figures, percentages and price levels. Your analysis should be data-driven yet nuanced, showing the insight of an experienced human analyst.
    `;
    
    // Generate content using Gemini with retry logic
    const maxRetries = 3;
    let retries = 0;
    let result = null;
    
    while (retries < maxRetries) {
      try {
        result = await model.generateContent(prompt);
        break; // Success, exit the loop
      } catch (error) {
        retries++;
        
        // Check if it's a rate limit error (429)
        if (error.message && error.message.includes('429')) {
          // Extract retry delay if available
          let retryDelay = 30000; // Default 30 seconds
          const retryMatch = error.message.match(/retryDelay":"(\d+)s"/);
          if (retryMatch && retryMatch[1]) {
            retryDelay = parseInt(retryMatch[1]) * 1000;
          }
          
          console.log(`Rate limit hit. Retrying in ${retryDelay/1000} seconds... (Attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else if (retries < maxRetries) {
          // For other errors, use exponential backoff
          const backoffDelay = Math.pow(2, retries) * 1000;
          console.log(`Error: ${error.message}. Retrying in ${backoffDelay/1000} seconds... (Attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          // Max retries reached, throw the error
          throw error;
        }
      }
    }
    
    if (!result) {
      throw new Error('Failed to generate content after maximum retries');
    }
    
    const response = result.response;
    const report = response.text();
    
    // Add custom header and timestamp to the report
    const timestamp = new Date().toLocaleString();
    const reportWithHeader = `# CryptoInsightPro Market Report
## ${timestamp}

*This professional analysis is generated from real-time market data*

⚠️ **Check the BREAKING NEWS section for critical market developments**

---

${report}

---

*Report generated by CryptoInsightPro - Advanced Market Analytics*`;
    
    console.log('Detailed market analysis report generated successfully');
    return reportWithHeader;
  } catch (error) {
    console.error(`Error generating analysis report: ${error.message}`);
    return `Error generating report: ${error.message}`;
  }
}

/**
 * Helper function to limit object depth and reduce data size
 * @param {Object} obj - The object to limit
 * @param {number} maxDepth - Maximum depth to keep
 * @param {number} currentDepth - Current depth (internal use)
 * @returns {Object} Limited object
 */
function limitObjectDepth(obj, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.length > 5 ? '[Array with ' + obj.length + ' items]' : obj.slice(0, 5);
      } else {
        return '{Object}';
      }
    }
    return obj;
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    // Limit array length to maximum 15 items (increased from 10)
    const limitedArray = obj.slice(0, 15);
    return limitedArray.map(item => limitObjectDepth(item, maxDepth, currentDepth + 1));
  }
  
  const result = {};
  // Limit to 25 keys maximum (increased from 15)
  const keys = Object.keys(obj).slice(0, 25);
  for (const key of keys) {
    result[key] = limitObjectDepth(obj[key], maxDepth, currentDepth + 1);
  }
  
  return result;
}

/**
 * Save the generated report to a file
 * @param {string} report - The analysis report
 */
function saveReport(report) {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const reportFile = path.join(REPORTS_DIR, `report-${timestamp}.md`);
    const latestReportFile = path.join(REPORTS_DIR, 'latest-report.md');
    
    fs.writeFileSync(reportFile, report);
    fs.writeFileSync(latestReportFile, report);
    
    console.log(`Report saved to ${reportFile} and ${latestReportFile}`);
  } catch (error) {
    console.error(`Error saving report: ${error.message}`);
  }
}

/**
 * Check if the API server is running
 * @returns {Promise<boolean>} Whether the API server is running
 */
async function checkApiServerStatus() {
  try {
    const response = await apiClient.get('/health');
    return response.data.status === 'ok';
  } catch (error) {
    console.error(`API server check failed: ${error.message}`);
    return false;
  }
}

/**
 * Main function to run the analysis cycle
 */
async function runAnalysis() {
  console.log('\n📊 Starting cryptocurrency data analysis...');
  
  try {
    // Check if API server is running
    const isApiServerRunning = await checkApiServerStatus();
    if (!isApiServerRunning) {
      console.error(`Cannot connect to API server at ${API_SERVER_URL}. Please make sure it's running.`);
      return;
    }
    
    // Fetch latest data from API server
    const data = await fetchLatestData();
    
    if (!data) {
      console.error('No data available for analysis. Skipping this cycle.');
      return;
    }
    
    // Generate analysis report
    const report = await generateAnalysisReport(data);
    
    // Save the report
    saveReport(report);
    
    console.log('Analysis cycle completed successfully');
  } catch (error) {
    console.error(`Error in analysis cycle: ${error.message}`);
  }
}

// Start the agent
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║             📊 RADIOO DATA ANALYST AGENT 📊                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Starting cryptocurrency data analysis agent...
- API Server URL: ${API_SERVER_URL}
- Analysis interval: ${ANALYSIS_INTERVAL / 1000} seconds
- Reports directory: ${REPORTS_DIR}
- Gemini model: ${GEMINI_MODEL}
- Gemini API configured: ${GEMINI_API_KEY ? 'Yes ✓' : 'No ✗'}

Press Ctrl+C to stop the agent.
`);

// Run initial analysis after a delay to ensure API server is ready
setTimeout(async () => {
  // Check API server before starting
  const isApiServerRunning = await checkApiServerStatus();
  if (!isApiServerRunning) {
    console.error(`Cannot connect to API server at ${API_SERVER_URL}. Please make sure it's running.`);
    console.log('The analyst agent will continue checking for the API server...');
  } else {
    console.log('API server is running. Starting analysis...');
  }
  
  // Run first analysis
  runAnalysis();
  
  // Set up regular analysis interval
  setInterval(runAnalysis, ANALYSIS_INTERVAL);
  
  console.log(`Analysis scheduled every ${ANALYSIS_INTERVAL / 1000} seconds`);
}, 5000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nStopping data analyst agent...');
  process.exit(0);
}); 