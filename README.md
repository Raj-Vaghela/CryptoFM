# RADIOO - Cryptocurrency Data Radio 📡🎙️

RADIOO is a comprehensive cryptocurrency system that fetches, analyzes, and broadcasts market data, whale transaction alerts, and crypto news. It consists of:

1. **Data API Server**: Collects cryptocurrency data from various sources
2. **Data Analyst Agent**: Generates professional market reports using Gemini AI
3. **Radio Jockey Agent**: Creates engaging radio scripts based on analysis
4. **Voice Server**: Converts scripts to natural-sounding speech using Google Cloud TTS

## Architecture

RADIOO uses a modern pipeline architecture:

1. **Data Collection**: The API server gathers data from CoinGecko, Whale Alert, and other sources
2. **Analysis**: The analyst agent processes raw data into human-readable reports
3. **Script Creation**: The radio jockey agent transforms reports into conversational radio scripts
4. **Voice Synthesis**: The voice server converts scripts to audio using Google Cloud TTS
5. **Web Frontend**: Delivers the audio experience through a browser-based player

This architecture provides several benefits:
- Clean separation of concerns between data collection, analysis, and presentation
- Real-time access to the most up-to-date data
- Ability to scale each component independently
- Efficient handling of large datasets

## Features

- 📊 **Market Data**: Regularly collects price and market data for top cryptocurrencies
- 🐋 **Whale Alerts**: Captures large cryptocurrency transactions 
- 📰 **Crypto News**: Logs latest news from trusted crypto sources
- ⚠️ **Breaking News**: Highlights critical market developments with immediate impact
- 🌐 **REST API**: Provides all data through clean, well-structured API endpoints
- 🔄 **Continuous Operation**: Keeps running 24/7 with automatic error recovery
- 🧠 **AI Analysis**: Generates comprehensive market reports using Gemini AI
- 🎙️ **Radio Jockey**: Creates engaging radio scripts for an audio broadcast experience
- 🔊 **Text-to-Speech**: Converts scripts to natural speech using Google Cloud TTS
- 📱 **Web Player**: Responsive web interface for listening to the broadcast

## Installation

1. Clone this repository:
```
git clone https://github.com/yourusername/radioo.git
cd radioo
```

2. Install dependencies:
```
npm install
```

3. Set up Google Cloud for Text-to-Speech:
   - Create a Google Cloud account if you don't have one
   - Create a new project in Google Cloud Console
   - Enable the Text-to-Speech API
   - Create a service account and download the credentials JSON file
   - Place the credentials file in a secure location in your project

4. Set up API keys:
Create a `.env` file in the project root (you can copy from `.env.example`):
```
# API Keys
COINGECKO_API_KEY=your_coingecko_api_key
WHALE_ALERT_API_KEY=your_whale_alert_api_key
CRYPTO_PANIC_API_KEY=your_cryptopanic_api_key
GEMINI_API_KEY=your_gemini_api_key

# Google Cloud Text-to-Speech
GCP_PROJECT_ID=your_gcp_project_id
GCP_KEY_FILE=path/to/your-gcp-credentials.json
GCP_VOICE_NAME=en-US-Neural2-D
GCP_VOICE_LANGUAGE=en-US
GCP_VOICE_GENDER=MALE

# AI Model
GEMINI_MODEL=gemini-2.0-flash

# Server Configuration
API_PORT=3000
VOICE_PORT=3001

# Intervals (milliseconds)
FETCH_INTERVAL=120000
ANALYSIS_INTERVAL=180000
SCRIPT_INTERVAL=60000
```

Note: Free API keys can be obtained from:
- [CoinGecko](https://www.coingecko.com/api/documentation) - Free tier is limited to 30 calls/minute
- [Whale Alert](https://docs.whale-alert.io/)
- [CryptoPanic](https://cryptopanic.com/developers/api/)
- [Google AI Studio (Gemini)](https://makersuite.google.com/app/apikey)
- [Google Cloud Console (TTS)](https://console.cloud.google.com/)

### CoinGecko API Rate Limiting

This system implements aggressive rate limiting for CoinGecko API calls to avoid hitting the 30 requests/minute limit:

- Conservative limit of 20 requests per minute (well below the 30/min limit)
- Minimum 3-second delay between consecutive calls
- Tracking of requests within each minute window
- Automatic waiting if approaching the rate limit
- Caching and reduced fetching for detailed coin data (only top 5 coins)
- 30-minute cache duration for detailed coin data
- Staggered fetching of different data sources
- Extended back-off periods after rate limit errors (429 responses)

These measures ensure stable operation without hitting CoinGecko's rate limits, even during extended use.

### Start the Complete System

To start all components with automatic crash recovery:

```
npm run start:all
# or
node scripts/start-all.js
```

This will:
- Start the Data API server on port 3000
- Start the analyst agent to generate reports every 180 seconds
- Start the radio jockey agent to create script segments every 60 seconds
- Start the voice server on port 3001 to convert scripts to speech
- Automatically restart any component if it crashes

### Listen to the Radio

Once all systems are running, you can access the RADIOO web player at:
```
http://localhost:3001
```

The player features:
- Automatic playback of the latest market updates
- Visual transcript of what's being said
- Basic player controls (play/pause, volume)
- Market data highlights
- Responsive design for desktop and mobile

## Reports, Scripts, and Audio Files

### Reports

AI-generated reports are stored in the `reports` directory:
- `report-YYYY-MM-DDThh-mm-ss.md`: Timestamped reports
- `latest-report.md`: Always contains the most recent report

### Radio Scripts

Radio jockey scripts are stored in the `scripts` directory:
- `current-script.txt`: The current script context window (for AI generation)
- `full-script.txt`: The complete, continuously growing script (never trimmed)
- `script-archive/script-YYYY-MM-DDThh-mm-ss.txt`: Archived script versions

### Voice Audio

Audio files generated by the voice server are stored in:
- `scripts/current/`: Audio files for pending segments
- `scripts/spoken/`: Archive of spoken audio segments

### Log Files

All data is also logged to files in the `logs` directory for backup and debugging:

- `market_global.log`: Global market statistics
- `market_top_coins.log`: Data for top 50 cryptocurrencies
- `market_trending.log`: Currently trending cryptocurrencies
- `coin_{id}.log`: Detailed data for specific top coins
- `whale_transactions.log`: Large cryptocurrency transactions
- `crypto_news.log`: Latest cryptocurrency news
- `exchange_flows.log`: Exchange inflow/outflow simulation
- `heartbeat.log`: Regular timestamps showing the service is running
- `system.log`: System metrics including memory usage
- `status.log`: Service status updates
- `errors.log`: Error messages and exceptions

## System Requirements

- Node.js v14 or higher
- Internet connection for API access
- Sufficient disk space for logs (logs can grow large over time)
- Google Gemini API key for the analyst and radio jockey agents
- Google Cloud Text-to-Speech credentials

## Module Structure

- `data-api-server.js`: RESTful API server for data collection and serving
- `data-analyst-agent.js`: AI-powered market analyst agent
- `radio-jockey-agent.js`: AI-powered radio script generator
- `voice-management.js`: Script segmentation and Google Cloud TTS integration
- `voice-server.js`: Audio serving and frontend REST API 
- `scripts/start-all.js`: Script to start all components together
- `public/`: Frontend web player files (HTML, CSS, JavaScript)

## Troubleshooting

- **API server won't start**: Check that the port is not in use and that all dependencies are installed
- **Analyst can't connect to API**: Verify that the API server is running and that the API_SERVER_URL is correct
- **API errors (400 Bad Request)**: 
  - Verify your CoinGecko API key format in the .env file
  - Check if you've exceeded the free tier API limits
  - The system is configured to stay well below the 30 calls/minute limit but may need adjustment
- **API errors (429 Too Many Requests)**:
  - This indicates you've hit rate limits despite the conservative settings
  - Increase FETCH_INTERVAL to 300000 (5 minutes) or more
  - Consider upgrading to a paid API plan if you need more frequent updates
- **Slow or infrequent data updates**: This is normal and expected. The system deliberately spaces out API calls to stay within rate limits
- **High memory usage**: Adjust the fetch interval to be less frequent
- **AI analysis failing**: Verify your Gemini API key and check the error logs

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Created for Encode AI London Hackathon 2025
