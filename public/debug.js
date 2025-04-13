// Crypto FM Debug Helper - Simplified Version
console.log('Crypto FM Debug Helper loaded');

// Create global debug object
window.CryptoFMDebug = {
  // Test audio playback with the specified URL
  testAudio: function(url) {
    const audioUrl = url || 'https://cdn.freesound.org/previews/459/459659_5622826-lq.mp3';
    console.log('Testing audio playback:', audioUrl);
    
    const audio = new Audio(audioUrl);
    audio.volume = 0.5;
    
    // Add event listeners for debugging
    audio.addEventListener('canplaythrough', () => console.log('✅ Audio can play through'));
    audio.addEventListener('playing', () => console.log('✅ Audio started playing'));
    audio.addEventListener('error', (e) => console.error('❌ Audio error:', e));
    
    // Try to play the audio
    audio.play()
      .then(() => console.log('✅ Audio play command accepted'))
      .catch(err => console.error('❌ Audio play rejected:', err.message));
    
    return audio;
  },
  
  // Test API endpoint
  testEndpoint: function(endpoint) {
    console.log('Testing API endpoint:', endpoint);
    
    return fetch('/api/' + endpoint)
      .then(res => res.json())
      .then(data => {
        console.log('✅ API response:', data);
        return data;
      })
      .catch(err => {
        console.error('❌ API error:', err);
        return null;
      });
  },
  
  // Run all tests
  runTests: function() {
    console.log('🔍 Running all tests...');
    
    // Test API endpoints
    this.testEndpoint('status');
    this.testEndpoint('next-segment')
      .then(data => {
        if (data && data.audioUrl) {
          console.log('🔊 Testing audio from API response');
          this.testAudio(data.audioUrl);
        }
      });
      
    // Test direct audio
    this.testAudio();
  }
};

console.log('Debug helper ready! Run CryptoFMDebug.runTests() to test audio and API endpoints'); 