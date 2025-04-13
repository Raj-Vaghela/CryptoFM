# Crypto FM Dependencies

This document outlines all the dependencies required for the Crypto FM project, including their versions and the purpose they serve.

## Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@google-cloud/text-to-speech` | ^5.0.0 | Google Cloud Text-to-Speech client library for converting text to audio |
| `@google/generative-ai` | ^0.1.3 | Google Gemini AI client for generating radio scripts |
| `axios` | ^1.6.2 | Promise-based HTTP client for making API requests |
| `cors` | ^2.8.5 | Express middleware for enabling Cross-Origin Resource Sharing |
| `dotenv` | ^16.3.1 | Loads environment variables from .env files |
| `express` | ^4.21.2 | Web framework for creating HTTP servers and APIs |
| `uuid` | ^9.0.1 | For generating unique identifiers |

## Frontend Dependencies (included via CDN)

| Package | Version | Purpose |
|---------|---------|---------|
| `jQuery` | ^3.6.0 | JavaScript library for DOM manipulation and AJAX requests |
| `Bootstrap` | ^5.3.0 | CSS framework for responsive design |
| `Font Awesome` | ^6.4.0 | Icon toolkit for UI elements |

## Development Dependencies

None specifically listed in package.json, but you may want to consider:

| Package | Version | Purpose |
|---------|---------|---------|
| `nodemon` | ^2.0.22 | Utility for auto-restarting Node applications during development |
| `eslint` | ^8.43.0 | JavaScript linter for code quality |

## Installation

All required dependencies can be installed with npm:

```bash
npm install
```

This will install all dependencies listed in the package.json file.

## API Keys Required

The following external services require API keys:

1. **Google Cloud Text-to-Speech API**
   - Required for converting text scripts to audio
   - Set in .env as `GOOGLE_CLOUD_TTS_API_KEY`
   - [Get a key from Google Cloud Console](https://console.cloud.google.com/)

2. **Google Gemini API**
   - Required for AI-generated content
   - Set in .env as `GEMINI_API_KEY`
   - [Get a key from Google AI Studio](https://makersuite.google.com/app/apikey)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
# API Keys
GOOGLE_CLOUD_TTS_API_KEY=your_google_cloud_api_key
GEMINI_API_KEY=your_gemini_api_key

# Voice Configuration
GCP_VOICE_NAME=en-GB-Chirp3-HD-Orus
GCP_VOICE_LANGUAGE=en-GB
GCP_VOICE_GENDER=MALE

# Server Configuration
PORT=3000
VOICE_PORT=3001
DATA_API_PORT=3002

# Script Generation
SCRIPT_INTERVAL=60000
SCRIPT_MEMORY_MINUTES=30
VOICE_STYLE=professional
PROMPT_TEMPERATURE=0.7
GEMINI_MODEL=gemini-2.0-flash
```

## Version Compatibility

- **Node.js**: v16.0.0 or higher
- **npm**: v8.0.0 or higher
- **Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

## Updating Dependencies

To update dependencies to their latest compatible versions:

```bash
npm update
```

For major version updates (which may include breaking changes):

```bash
npx npm-check-updates -u
npm install
``` 