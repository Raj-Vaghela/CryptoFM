/**
 * Crypto FM - Client-side Debug Helper
 * Add this to your HTML:
 * <script src="/client-debug.js"></script>
 */

(function() {
  console.log('Crypto FM Client Debug Helper loaded');
  
  // Client-side debugging library
  window.CryptoFMDebug = {
    // Store logs
    logs: [],
    
    // Log a message with optional data
    log: function(message, data) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message: message,
        data: data || null
      };
      
      this.logs.push(logEntry);
      console.log(`[CryptoFM Debug] ${message}`, data || '');
      
      // Keep only the last 100 logs
      if (this.logs.length > 100) {
        this.logs.shift();
      }
      
      return logEntry;
    },
    
    // Send logs to server
    sendLogsToServer: function() {
      fetch('/api/debug-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientLogs: this.logs,
          userAgent: navigator.userAgent,
          screenSize: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Debug logs sent to server:', data);
      })
      .catch(error => {
        console.error('Error sending debug logs:', error);
      });
    },
    
    // Test audio playback
    testAudio: function(url) {
      const audioUrl = url || 'https://cdn.freesound.org/previews/459/459659_5622826-lq.mp3';
      this.log('Testing audio playback', { url: audioUrl });
      
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('canplaythrough', () => {
        this.log('Audio can play through', { url: audioUrl });
      });
      
      audio.addEventListener('playing', () => {
        this.log('Audio is playing', { url: audioUrl });
      });
      
      audio.addEventListener('error', (e) => {
        this.log('Audio error', { 
          url: audioUrl, 
          error: e.target.error ? e.target.error.message : 'Unknown error'
        });
      });
      
      audio.volume = 0.5;
      audio.play().then(() => {
        this.log('Audio play promise resolved');
      }).catch(error => {
        this.log('Audio play promise rejected', { error: error.message });
      });
      
      return audio;
    },
    
    // Get server logs
    getServerLogs: function() {
      return fetch('/api/debug-logs')
        .then(response => response.json())
        .then(data => {
          console.log('Server logs:', data);
          return data;
        });
    },
    
    // Test API endpoints
    testApiEndpoint: function(endpoint) {
      this.log(`Testing API endpoint: ${endpoint}`);
      return fetch(`/api/${endpoint}`)
        .then(response => {
          const status = response.status;
          const ok = response.ok;
          return response.json().then(data => ({ data, status, ok }));
        })
        .then(result => {
          this.log(`API endpoint ${endpoint} result:`, result);
          return result;
        })
        .catch(error => {
          this.log(`API endpoint ${endpoint} error:`, { message: error.message });
          throw error;
        });
    }
  };
  
  // Add debugging for audio playback issues
  const originalAudio = window.Audio;
  window.Audio = function(src) {
    const audio = new originalAudio(src);
    
    const debugAudio = function(event) {
      if (window.CryptoFMDebug) {
        window.CryptoFMDebug.log(`Audio event: ${event.type}`, { 
          src: audio.src, 
          currentTime: audio.currentTime,
          paused: audio.paused,
          ended: audio.ended,
          error: audio.error ? audio.error.code : null
        });
      }
    };
    
    audio.addEventListener('play', debugAudio);
    audio.addEventListener('pause', debugAudio);
    audio.addEventListener('ended', debugAudio);
    audio.addEventListener('error', debugAudio);
    audio.addEventListener('canplay', debugAudio);
    audio.addEventListener('canplaythrough', debugAudio);
    
    return audio;
  };
  
  // Add this script to the page
  console.log('CryptoFM Debug Helper ready. Use window.CryptoFMDebug to access debug functions.');
})(); 