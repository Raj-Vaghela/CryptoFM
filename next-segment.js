/**
 * Crypto FM - Next Segment API Route (Root Level)
 * 
 * This endpoint generates real speech using Google Cloud TTS API
 */

// Require Google Cloud Text-to-Speech library
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

// Create Google Cloud TTS client
const ttsClient = new textToSpeech.TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Create tmp directory if it doesn't exist (for Vercel)
const TMP_DIR = '/tmp/audio';
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Generate realistic crypto news text
function generateCryptoNews() {
  const cryptos = [
    { name: 'Bitcoin', symbol: 'BTC', price: Math.floor(60000 + Math.random() * 10000) },
    { name: 'Ethereum', symbol: 'ETH', price: Math.floor(3000 + Math.random() * 1000) },
    { name: 'Solana', symbol: 'SOL', price: Math.floor(100 + Math.random() * 100) },
    { name: 'Cardano', symbol: 'ADA', price: Math.floor(30 + Math.random() * 20) / 100 },
    { name: 'Ripple', symbol: 'XRP', price: Math.floor(40 + Math.random() * 30) / 100 }
  ];
  
  // Select random cryptos
  const mainCrypto = cryptos[Math.floor(Math.random() * 2)]; // BTC or ETH usually
  const altCrypto = cryptos[2 + Math.floor(Math.random() * 3)]; // One of the altcoins
  
  // Generate random price movements
  const mainChange = (Math.random() * 8 - 3).toFixed(1);
  const altChange = (Math.random() * 10 - 4).toFixed(1);
  
  // Create news templates
  const templates = [
    `Welcome to Crypto FM! In today's market update, ${mainCrypto.name} has ${mainChange > 0 ? 'climbed' : 'fallen'} ${Math.abs(mainChange)}% to $${mainCrypto.price}, while ${altCrypto.name} is ${altChange > 0 ? 'up' : 'down'} ${Math.abs(altChange)}% at $${altCrypto.price}. Analysts attribute this to recent developments in regulatory clarity and institutional adoption.`,
    
    `This is Crypto FM with your hourly update. ${mainCrypto.name} is trading at $${mainCrypto.price}, ${mainChange > 0 ? 'gaining' : 'losing'} ${Math.abs(mainChange)}% in the past 24 hours. Meanwhile, ${altCrypto.name} has ${altChange > 0 ? 'surged' : 'declined'} by ${Math.abs(altChange)}%, now at $${altCrypto.price}. Trading volume across major exchanges remains ${Math.random() > 0.5 ? 'strong' : 'steady'}.`,
    
    `Crypto FM news brief: ${mainCrypto.name} is experiencing ${mainChange > 0 ? 'bullish' : 'bearish'} momentum today, currently at $${mainCrypto.price}, a ${Math.abs(mainChange)}% ${mainChange > 0 ? 'increase' : 'decrease'}. In altcoin news, ${altCrypto.name} is showing ${altChange > 0 ? 'positive' : 'negative'} price action with a ${Math.abs(altChange)}% ${altChange > 0 ? 'gain' : 'loss'}, now trading at $${altCrypto.price}.`
  ];
  
  // Select a random template
  return templates[Math.floor(Math.random() * templates.length)];
}

// Generate speech audio from text using Google Cloud TTS
async function generateSpeech(text, outputFileName) {
  try {
    // Configure the request
    const request = {
      input: { text },
      voice: {
        languageCode: 'en-US',
        ssmlGender: 'MALE',
        name: 'en-US-Neural2-J' // Male news announcer voice
      },
      audioConfig: { audioEncoding: 'MP3' }
    };
    
    // Call Google Cloud TTS API
    const [response] = await ttsClient.synthesizeSpeech(request);
    
    // Write the audio content to a file
    const outputPath = path.join(TMP_DIR, outputFileName);
    await writeFileAsync(outputPath, response.audioContent, 'binary');
    console.log(`Audio content written to: ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error('TTS Error:', error);
    return null;
  }
}

// Generate a public URL for the audio file
function getPublicUrl(filePath) {
  // Extract filename from path
  const fileName = path.basename(filePath);
  
  // For Vercel, we need to serve from a public URL
  // Since we're using the /tmp directory in Vercel, we'll need to serve it differently
  return `/api/audio/${fileName}`;
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('API Route: /next-segment was called (root level)');
  
  try {
    // Create a unique segment ID
    const segmentId = Date.now();
    
    // Generate realistic crypto news text
    const newsText = generateCryptoNews();
    console.log(`Generated news text: ${newsText.substring(0, 100)}...`);
    
    // Generate audio from text using Google Cloud TTS
    const outputFileName = `segment-${segmentId}.mp3`;
    
    // TTS generation may fail, use fallback if needed
    let audioUrl;
    try {
      const audioFilePath = await generateSpeech(newsText, outputFileName);
      if (audioFilePath) {
        audioUrl = getPublicUrl(audioFilePath);
        console.log(`Generated TTS audio at: ${audioUrl}`);
      } else {
        throw new Error('Failed to generate TTS audio');
      }
    } catch (ttsError) {
      console.error('Failed to generate TTS, using fallback:', ttsError);
      audioUrl = "https://storage.googleapis.com/cloud-samples-data/speech/brooklyn_bridge.mp3";
    }
    
    // Return a segment with the generated audio URL
    const response = {
      hasSegment: true,
      id: segmentId,
      audioUrl: audioUrl,
      text: newsText,
      generated: true,
      timestamp: new Date().toISOString()
    };
    
    console.log('Response payload:', JSON.stringify(response));
    res.status(200).json(response);
  } catch (error) {
    console.error('Error generating segment:', error);
    
    // Fallback response if anything fails
    res.status(200).json({
      hasSegment: true,
      id: Date.now(),
      audioUrl: "https://storage.googleapis.com/cloud-samples-data/speech/brooklyn_bridge.mp3",
      text: "Welcome to Crypto FM! We're currently experiencing technical difficulties with our live updates. We'll be back shortly with the latest cryptocurrency news and analysis. In the meantime, please enjoy this brief message.",
      generated: false,
      error: error.message
    });
  }
}; 