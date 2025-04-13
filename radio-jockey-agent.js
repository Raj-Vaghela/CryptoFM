/**
 * Crypto FM - Radio Jockey Script Generator
 * 
 * An AI agent that generates a continuous radio script for the RadioJockey/NewsReporter
 * based on cryptocurrency analysis reports and previous script segments.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ### Configuration
const REPORTS_DIR = path.join(__dirname, 'reports');
const SCRIPTS_DIR = path.join(__dirname, 'scripts');
const SCRIPT_ARCHIVE_DIR = path.join(__dirname, 'script-archive');
const SCRIPT_INTERVAL = parseInt(process.env.SCRIPT_INTERVAL || 60 * 1000); // Default: 60 seconds
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const WORDS_PER_MINUTE = parseInt(process.env.WORDS_PER_MINUTE || 150); // Average speaking rate, configurable
const SCRIPT_MEMORY_MINUTES = parseInt(process.env.SCRIPT_MEMORY_MINUTES || 30); // Remember previous 30 mins of script context
const MAX_SCRIPT_MEMORY_WORDS = WORDS_PER_MINUTE * SCRIPT_MEMORY_MINUTES; // ~4500 words
const PROMPT_TEMPERATURE = parseFloat(process.env.PROMPT_TEMPERATURE || 0.7); // Control creativity
const MAX_OUTPUT_TOKENS = parseInt(process.env.MAX_OUTPUT_TOKENS || 2048); // Control response length
const VOICE_STYLE = process.env.VOICE_STYLE || 'professional'; // Can be professional, casual, energetic

// ### Ensure Directories Exist
[REPORTS_DIR, SCRIPTS_DIR, SCRIPT_ARCHIVE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    } catch (error) {
      console.error(`Failed to create directory ${dir}: ${error.message}`);
      process.exit(1);
    }
  }
});

// ### Initialize Gemini API
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY is required. Please add it to your .env file.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ### Console Log with Timestamps
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
 * ### Get the Latest Report
 * @returns {string} Latest report content
 */
function getLatestReport() {
  const latestReportPath = path.join(REPORTS_DIR, 'latest-report.md');
  if (!fs.existsSync(latestReportPath)) {
    console.error('No latest report found');
    return null;
  }
  
  try {
    return fs.readFileSync(latestReportPath, 'utf8');
  } catch (error) {
    console.error(`Error reading latest report: ${error.message}`);
    return null;
  }
}

/**
 * ### Check if report has changed since last read
 * @param {string} currentReport - Current report content
 * @returns {boolean} True if report has changed
 */
function hasReportChanged(currentReport) {
  const lastReportPath = path.join(SCRIPTS_DIR, 'last-processed-report.md');
  
  // If no last report exists, assume it's changed
  if (!fs.existsSync(lastReportPath)) {
    if (currentReport) {
      fs.writeFileSync(lastReportPath, currentReport);
    }
    return true;
  }
  
  try {
    const lastReport = fs.readFileSync(lastReportPath, 'utf8');
    const hasChanged = lastReport !== currentReport;
    
    // Update the last processed report
    if (hasChanged && currentReport) {
      fs.writeFileSync(lastReportPath, currentReport);
    }
    
    return hasChanged;
  } catch (error) {
    console.error(`Error checking if report changed: ${error.message}`);
    return true; // Assume changed on error
  }
}

/**
 * ### Get the Current Script Content
 * @returns {string} Current script content
 */
function getCurrentScript() {
  const scriptPath = path.join(SCRIPTS_DIR, 'current-script.txt');
  if (!fs.existsSync(scriptPath)) {
    fs.writeFileSync(scriptPath, '');
    return '';
  }
  
  try {
    return fs.readFileSync(scriptPath, 'utf8');
  } catch (error) {
    console.error(`Error reading current script: ${error.message}`);
    return '';
  }
}

/**
 * ### Get the Full Script Content
 * @returns {string} Full script content
 */
function getFullScript() {
  const fullScriptPath = path.join(SCRIPTS_DIR, 'full-script.txt');
  if (!fs.existsSync(fullScriptPath)) {
    fs.writeFileSync(fullScriptPath, '');
    return '';
  }
  
  try {
    return fs.readFileSync(fullScriptPath, 'utf8');
  } catch (error) {
    console.error(`Error reading full script: ${error.message}`);
    return '';
  }
}

/**
 * ### Append Script with Memory Limit
 * @param {string} currentScript - Current script content
 * @param {string} newSegment - New script segment to append
 * @returns {string} Updated script with memory limit applied
 */
function appendScriptWithMemoryLimit(currentScript, newSegment) {
  const combinedScript = currentScript + '\n\n' + newSegment;
  const wordCount = combinedScript.split(/\s+/).length;
  
  if (wordCount <= MAX_SCRIPT_MEMORY_WORDS) {
    return combinedScript;
  }
  
  const words = combinedScript.split(/\s+/);
  const trimmedWords = words.slice(-MAX_SCRIPT_MEMORY_WORDS);
  const trimmedText = trimmedWords.join(' ');
  const firstSentenceBreak = trimmedText.search(/[.!?]\s+[A-Z]/);
  
  return firstSentenceBreak > 0 
    ? trimmedText.substring(firstSentenceBreak + 2) 
    : trimmedText;
}

/**
 * ### Save the Updated Script
 * @param {string} script - Script content to save
 * @param {string} fullScript - Complete script with all history
 */
function saveScript(script, fullScript) {
  try {
    const currentTime = new Date();
    const timestamp = currentTime.toISOString().replace(/:/g, '-').replace(/\..+/, '');
    
    const scriptPath = path.join(SCRIPTS_DIR, 'current-script.txt');
    fs.writeFileSync(scriptPath, script);
    
    const fullScriptPath = path.join(SCRIPTS_DIR, 'full-script.txt');
    fs.writeFileSync(fullScriptPath, fullScript || script);
    
    const archivePath = path.join(SCRIPT_ARCHIVE_DIR, `script-${timestamp}.txt`);
    fs.writeFileSync(archivePath, fullScript || script);
    
    console.log(`Script saved to ${scriptPath}, ${fullScriptPath} and archived to ${archivePath}`);
  } catch (error) {
    console.error(`Error saving script: ${error.message}`);
  }
}

/**
 * ### Get the Last Complete Sentence
 * @param {string} text - The full text
 * @param {number} maxChars - Maximum characters to consider
 * @returns {string} The last complete sentence within the limit
 */
function getLastSentence(text, maxChars) {
  const truncated = text.substring(Math.max(0, text.length - maxChars));
  const sentenceEnd = truncated.lastIndexOf('.') + 1;
  if (sentenceEnd > 0) {
    return truncated.substring(sentenceEnd).trim();
  }
  return truncated;
}

/**
 * ### Generate Script Segment using Gemini
 * @param {string} report - Market analysis report
 * @param {string} previousScript - Previous script content
 * @returns {Promise<string>} Generated script segment
 */
async function generateScriptSegment(report, previousScript) {
  const fallbackDisclaimer = `
  Welcome to Crypto FM, your AI-powered cryptocurrency radio station. While we're waiting for the latest market data, here's a quick reminder: all content on this station is generated by artificial intelligence. We strive to provide accurate and up-to-date information, but please remember that this should not be considered financial advice. Always conduct your own research before making any investment decisions. Stay tuned, as we'll be back with the latest cryptocurrency updates as soon as possible.
  `;
  
  if (!report) {
    console.error('No report available for script generation');
    return fallbackDisclaimer;
  }
  
  console.log('Generating radio script segment using Gemini...');
  
  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: PROMPT_TEMPERATURE,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      }
    });
    
    const isNewBroadcast = previousScript.trim().length === 0;
    const previousScriptContext = isNewBroadcast ? '' : getLastSentence(previousScript, 1500); // Increased context size
    const includeDisclaimer = !isNewBroadcast && Math.random() < 0.2; // 20% chance for continuation
    
    // Get voice style instructions based on configuration
    const voiceStyleInstructions = getVoiceStyleInstructions(VOICE_STYLE);
    
    let prompt = '';
    
    if (isNewBroadcast) {
      prompt = `
    You are a professional cryptocurrency radio news broadcaster for Crypto FM, a cryptocurrency radio broadcast service.
    
    Your audience is cryptocurrency investors and enthusiasts. ${voiceStyleInstructions}
    
    Speak in a professional yet engaging and conversational tone, suited for radio. Use natural transitions and verbal timestamps like "It's ${getCurrentTimePhrase()}".
    
    📢 IMPORTANT INSTRUCTIONS:
    - Only output the exact words the host will speak
    - Do NOT include sound effects, caller prompts, or any bracketed directions
    - DO NOT use any SSML tags, XML, or special markup in the script
    - Use seamless opening and closing phrases that will work well for audio continuity
    - Focus on creating complete thoughts and sentences that can stand alone
    
    🎙 BEGIN THE BROADCAST WITH:
    1. A short intro with the station name (Crypto FM), your DJ name, and the current time
    2. A clear disclaimer that this is an AI-generated broadcast and not financial advice
    3. Market coverage from the report below
    
    📊 MARKET DATA:
    ${report}
    
    🎯 TASK:
    Create a 2-3 minute spoken script (approx. 300–450 words) for the opening broadcast segment.
    
    Focus on:
    - EXECUTIVE SUMMARY
    - MARKET ANALYSIS
    - TOP CRYPTOCURRENCY ANALYSIS
    
    IMPORTANT ABOUT BREAKING NEWS:
    - Only mention "BREAKING NEWS" if the report explicitly states critical market developments
    - If the report states "No breaking news available" or similar, then present a normal market update without any breaking news announcement
    - Present factual market information regardless of whether there's breaking news or not
    
    Keep the tone dynamic and easy to follow. Prioritize clarity, spoken flow, and pacing.
    Close with a transition that sets up smoothly for the next segment.
    
    REMINDER: The final output must be spoken text only. No visual formatting, non-spoken elements, or SSML tags.
    `;
    } else {
      prompt = `
    You are a professional cryptocurrency radio news broadcaster for Crypto FM, a cryptocurrency radio broadcast service.
    
    Continue the current broadcast in a natural, flowing manner. Your task is to create a seamless listening experience.
    
    ${voiceStyleInstructions} Include verbal timestamps like "As of ${getCurrentTimePhrase()}" where appropriate.
    
    📢 CRITICAL RULES:
    - Begin with a smooth transition picking up from the previous segment
    - Ensure content flows logically from what was said before
    - Create natural bridges between topics
    - Avoid awkward pauses or jarring topical shifts
    - DO NOT use any SSML tags, XML, or special markup in the script
    - Finish with a complete thought that could lead naturally to another segment
    
    📻 CONTEXT (PREVIOUS SEGMENT ENDED WITH):
    ${previousScriptContext}
    
    📊 MARKET REPORT:
    ${report}
    
    🧠 TASK:
    Write a natural continuation of the broadcast — around 1-2 minutes (approx. 150–300 words).
    
    If the previous segment was discussing:
    - A specific cryptocurrency → Either continue that analysis or transition to a related coin/topic
    - Market trends → Expand with specific examples or move to predictions
    - Breaking news → Provide more context or analysis of the impact
    
    IMPORTANT ABOUT BREAKING NEWS:
    - ONLY mention "Breaking news" for genuinely significant developments 
    - This means major price movements (>10%), regulatory announcements, hacks, or industry-changing events
    - The report must explicitly state these as critical developments
    - If there are no such developments, just present the content as regular market information
    
    ${includeDisclaimer ? "Please include a natural reminder that this is an AI-generated broadcast." : ""}
    
    For perfect audio continuity:
    - Start with a phrase that feels like a continuation
    - End with a complete thought that sounds natural if followed by another segment
    
    REMINDER: Output must contain only what the host would say out loud. No non-verbal directions, visual markup, or SSML tags.
    `;
    }

    const maxRetries = 3;
    let retries = 0;
    let result = null;
    
    while (retries < maxRetries) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (error) {
        retries++;
        if (error.message && error.message.includes('429')) {
          let retryDelay = 30000;
          const retryMatch = error.message.match(/retryDelay":"(\d+)s"/);
          if (retryMatch && retryMatch[1]) {
            retryDelay = parseInt(retryMatch[1]) * 1000;
          }
          console.log(`Rate limit hit. Retrying in ${retryDelay/1000} seconds... (Attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else if (retries < maxRetries) {
          const backoffDelay = Math.pow(2, retries) * 1000;
          console.log(`Error: ${error.message}. Retrying in ${backoffDelay/1000} seconds... (Attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          throw error;
        }
      }
    }
    
    if (!result) {
      throw new Error('Failed to generate content after maximum retries');
    }
    
    const response = result.response;
    let scriptSegment = response.text();
    
    // Remove any potential non-spoken elements and SSML tags
    scriptSegment = scriptSegment.replace(/\[.*?\]/g, '');
    scriptSegment = scriptSegment.replace(/\*.*?\*/g, '');
    scriptSegment = scriptSegment.replace(/<phoneme[^>]*>([^<]*)<\/phoneme>/g, '$1'); // Remove SSML phoneme tags
    scriptSegment = scriptSegment.replace(/<[^>]+>/g, ''); // Remove any remaining XML/SSML tags
    
    console.log('Radio script segment generated successfully');
    return scriptSegment;
  } catch (error) {
    console.error(`Error generating script segment: ${error.message}`);
    return fallbackDisclaimer;
  }
}

/**
 * ### Get voice style instructions based on configured style
 * @param {string} style - Voice style (professional, casual, energetic)
 * @returns {string} Voice style instructions
 */
function getVoiceStyleInstructions(style) {
  switch (style.toLowerCase()) {
    case 'casual':
      return 'Your style should be casual, conversational, and relatable. Use more informal language, occasional slang, and a friendly tone.';
    case 'energetic':
      return 'Your style should be high-energy, enthusiastic and exciting. Use dynamic language, emphasize key points with energy, and maintain an upbeat pace.';
    case 'professional':
    default:
      return 'Your style should be professional but engaging, conversational, clear, and easy to follow when heard rather than read.';
  }
}

/**
 * ### Get current time in a natural language format
 * @returns {string} Current time phrase
 */
function getCurrentTimePhrase() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const adjustedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  
  // Format minutes with leading zero if needed
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  
  // Determine timezone abbreviation (simplified)
  const timezoneOffset = now.getTimezoneOffset();
  let timezone = 'UTC';
  
  if (timezoneOffset === 240 || timezoneOffset === 300) {
    timezone = 'Eastern Time';
  } else if (timezoneOffset === 300 || timezoneOffset === 360) {
    timezone = 'Central Time';
  } else if (timezoneOffset === 360 || timezoneOffset === 420) {
    timezone = 'Mountain Time';
  } else if (timezoneOffset === 420 || timezoneOffset === 480) {
    timezone = 'Pacific Time';
  }
  
  return `${adjustedHours}:${formattedMinutes} ${ampm} ${timezone}`;
}

/**
 * ### Main Function to Run Script Generation
 */
async function generateScript() {
  console.log('\n🎙️ Starting radio script generation...');
  
  try {
    const report = getLatestReport();
    
    // Check if the report has changed since last run
    if (report && !hasReportChanged(report)) {
      console.log('Report has not changed since last run. Skipping script generation.');
      return null;
    }
    
    const currentScript = getCurrentScript();
    const fullScript = getFullScript();
    const newSegment = await generateScriptSegment(report, currentScript);
    const updatedScript = appendScriptWithMemoryLimit(currentScript, newSegment);
    const updatedFullScript = fullScript + '\n\n' + newSegment;
    saveScript(updatedScript, updatedFullScript);
    console.log('Script generation cycle completed successfully');
    return updatedFullScript;
  } catch (error) {
    console.error(`Error in script generation cycle: ${error.message}`);
    return null;
  }
}

/**
 * ### Clean up old script archives
 * Removes script archives older than 7 days to save disk space
 */
function cleanupOldScripts() {
  try {
    const files = fs.readdirSync(SCRIPT_ARCHIVE_DIR);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    let cleanedCount = 0;
    files.forEach(file => {
      const filePath = path.join(SCRIPT_ARCHIVE_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old script archives`);
    }
  } catch (error) {
    console.error(`Error cleaning up old scripts: ${error.message}`);
  }
}

// ### Start the Agent
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║             🎙️ Crypto FM JOCKEY SCRIPT GENERATOR 🎙️             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Starting radio jockey script generator...
- Script generation interval: ${SCRIPT_INTERVAL / 1000} seconds
- Speech memory duration: ${SCRIPT_MEMORY_MINUTES} minutes
- Word memory limit: ${MAX_SCRIPT_MEMORY_WORDS} words
- Voice style: ${VOICE_STYLE}
- Prompt temperature: ${PROMPT_TEMPERATURE}
- Max output tokens: ${MAX_OUTPUT_TOKENS}
- Scripts directory: ${SCRIPTS_DIR}
- Script archive: ${SCRIPT_ARCHIVE_DIR}
- Gemini model: ${GEMINI_MODEL}
- Gemini API configured: ${GEMINI_API_KEY ? 'Yes ✓' : 'No ✗'}

Press Ctrl+C to stop the agent.
`);

let scriptGenerationInterval;

// Start with a slight delay to give time for other services to start
setTimeout(async () => {
  const report = getLatestReport();
  if (!report) {
    console.error('No market reports available. Waiting for the analyst agent to generate reports...');
    console.log('The radio jockey agent will continue checking for reports...');
  } else {
    console.log('Market report found. Starting script generation...');
  }
  
  try {
    await generateScript();
    
    // Schedule regular script generation
    scriptGenerationInterval = setInterval(generateScript, SCRIPT_INTERVAL);
    console.log(`Script generation scheduled every ${SCRIPT_INTERVAL / 1000} seconds`);
    
    // Schedule weekly cleanup of old script archives
    setInterval(cleanupOldScripts, 24 * 60 * 60 * 1000); // Run daily
    
    // Run initial cleanup
    cleanupOldScripts();
  } catch (error) {
    console.error(`Failed to start script generation: ${error.message}`);
    process.exit(1);
  }
}, 5000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nStopping radio jockey script generator...');
  
  if (scriptGenerationInterval) {
    clearInterval(scriptGenerationInterval);
  }
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`Uncaught exception: ${error.message}`);
  console.error(error.stack);
});

module.exports = { generateScript, getCurrentTimePhrase };