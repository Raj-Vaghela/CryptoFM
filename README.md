# Crypto FM - AI-powered Cryptocurrency Radio

Crypto FM is an innovative AI-powered cryptocurrency radio application that provides real-time market updates, analysis, and commentary in an engaging radio broadcast format. Using a vintage-styled radio interface, users can tune in to get the latest information on cryptocurrency markets delivered by an AI DJ.

Created for Encode AI London Hackathon 2025

![Crypto FM Screenshot](https://placeholder-for-screenshot.png)

## Features

- **Live AI-Generated Broadcast**: Continuous cryptocurrency market commentary and analysis generated using Google's Gemini AI
- **Text-to-Speech Conversion**: High-quality British voice narration using Google Cloud TTS
- **Vintage Radio Interface**: Interactive UI with volume control and visual indicators
- **Real-time Market Data**: Integration with cryptocurrency APIs for up-to-date information
- **Responsive Design**: Works on desktop and mobile devices

## System Architecture

Crypto FM consists of several interconnected components:

1. **Data Collection Service**: Gathers cryptocurrency market data from various sources
2. **Analysis Agent**: Processes market data and generates insights
3. **Radio Jockey Agent**: Creates natural-sounding radio scripts based on analysis
4. **Voice Server**: Converts scripts to speech using Google Cloud TTS
5. **Web Interface**: Vintage radio UI for users to interact with the service

## Installation

### Prerequisites

- Node.js (v16 or newer)
- npm (v8 or newer)
- Google Cloud API key (for Text-to-Speech)
- Google Gemini API key (for AI script generation)

### Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/crypto-fm.git
cd crypto-fm
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
```

Edit the `.env` file and add your API keys:

```
GOOGLE_CLOUD_TTS_API_KEY=your_google_cloud_api_key
GEMINI_API_KEY=your_gemini_api_key
```

4. **Create required directories**

The application will create necessary directories automatically on first run, but you can create them manually if preferred:

```bash
mkdir -p reports scripts/current scripts/spoken script-archive logs
```

## Running the Application

### Starting All Services

To start all services at once:

```bash
npm run start:all
```

### Starting Individual Components

You can also run individual components:

```bash
# Start the data collection service
npm run start:logger

# Start the monitoring service
npm run start:monitor

# Start the data analysis agent
npm run start:analyst

# Start the radio jockey agent
npm run start:jockey

# Start the voice server
npm run start:voice
```

### Accessing the Web Interface

Once all services are running, open your browser and navigate to:

```
http://localhost:3000
```

## Configuration Options

You can customize Crypto FM by modifying the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Main server port | 3000 |
| `DATA_API_PORT` | Data API port | 3002 |
| `VOICE_PORT` | Voice server port | 3001 |
| `SCRIPT_INTERVAL` | Interval between script generations (ms) | 60000 |
| `SCRIPT_MEMORY_MINUTES` | How much previous script to remember | 30 |
| `VOICE_STYLE` | DJ personality (professional, casual, energetic) | professional |
| `PROMPT_TEMPERATURE` | AI creativity level (0.0-1.0) | 0.7 |
| `GCP_VOICE_LANGUAGE` | TTS voice language | en-GB |
| `GCP_VOICE_GENDER` | TTS voice gender | MALE |

## Project Structure

```
crypto-fm/
├── public/              # Web interface files
│   ├── index.html       # Main HTML file
│   ├── style.css        # Styles for the vintage radio interface
│   └── app.js           # Frontend JavaScript
├── scripts/             # Generated radio scripts
├── reports/             # Market analysis reports
├── agent-control.js     # Service orchestration
├── data-analyst-agent.js # Market data analysis
├── radio-jockey-agent.js # Script generation
├── voice-management.js  # TTS conversion handling
├── voice-server.js      # Voice API server
└── data-api-server.js   # Data API server
```

## Troubleshooting

### Common Issues

1. **No audio playing**
   - Ensure your Google Cloud TTS API key is correctly configured
   - Check that the voice server is running (`npm run start:voice`)
   - Verify that audio is not muted in the browser

2. **No market data**
   - Ensure data collection services are running
   - Check connectivity to cryptocurrency data APIs

3. **Script generation not working**
   - Verify your Gemini API key is correct
   - Check logs for any rate limiting issues

### Logs

Log files are stored in the `logs/` directory. Check these files for detailed error information if you encounter issues.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Cloud Text-to-Speech for voice synthesis
- Google Gemini for AI-generated content
- Various cryptocurrency data providers
- Bootstrap and jQuery for frontend components
