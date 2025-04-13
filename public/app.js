/**
 * Crypto FM - Radio Frontend Application
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Crypto FM initialized');
  
  // Elements
  const audioPlayer = document.getElementById('audioPlayer');
  const volumeHandle = document.getElementById('volumeHandle');
  const transcript = document.getElementById('currentTranscript');
  
  // State
  const state = {
    volume: 0.7,
    playing: false,
    currentSegment: null,
    lastCheck: 0,
    userInteracted: false,
    pendingAudioUrl: null,
    audioRetryCount: 0,
    maxRetries: 3
  };
  
  // Initialize audio player
  if (audioPlayer) {
    audioPlayer.volume = state.volume;
    
    audioPlayer.addEventListener('playing', () => {
      console.log('Audio playing');
      state.playing = true;
      state.audioRetryCount = 0;
      
      // Show transcript when audio plays
      if (transcript && transcript.parentElement) {
        transcript.parentElement.style.display = 'block';
      }
      
      // Show now playing indicator
      document.querySelector('.current-status').textContent = '🔴 LIVE';
    });
    
    audioPlayer.addEventListener('ended', () => {
      console.log('Audio ended');
      state.playing = false;
      
      // Get next segment immediately after current one ends
      setTimeout(checkForContent, 500);
    });
    
    audioPlayer.addEventListener('error', (e) => {
      const errorCode = audioPlayer.error ? audioPlayer.error.code : 'unknown';
      console.error('Audio error code:', errorCode);
      state.playing = false;
      
      // Try one of our fallback audio sources if the main one fails
      if (state.audioRetryCount < state.maxRetries) {
        state.audioRetryCount++;
        console.log(`Audio error, retry attempt ${state.audioRetryCount}`);
        
        // Fallback to our guaranteed working audio
        const fallbackUrls = [
          "https://storage.googleapis.com/cloud-samples-data/speech/brooklyn_bridge.mp3",
          "https://audio.jukehost.co.uk/cGvR7jSG3aNbvt5LYoM4v43Hn92qHhQ7",
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        ];
        
        // Try a different fallback URL each time
        const fallbackUrl = fallbackUrls[state.audioRetryCount % fallbackUrls.length];
        console.log('Trying fallback audio URL:', fallbackUrl);
        
        playAudioDirect(fallbackUrl);
      } else {
        console.error('Max retry attempts reached, showing play button');
        showPlayButton('▶️ Try Again');
      }
    });
    
    // Add canplay event to track successful loading
    audioPlayer.addEventListener('canplay', () => {
      console.log('Audio can be played');
    });
  }
  
  // Track user interaction with the page
  document.addEventListener('click', function() {
    state.userInteracted = true;
    
    // If we have pending audio, try to play it
    if (state.pendingAudioUrl) {
      playAudioDirect(state.pendingAudioUrl);
      state.pendingAudioUrl = null;
    }
  });
  
  // Add play button for autoplay issues
  addPlayButton();
  
  // Check for content periodically
  setInterval(checkForContent, 5000);
  checkForContent();
  
  // Function to add play button
  function addPlayButton(text = '▶️ Start Broadcast') {
    const controlsInfo = document.querySelector('.controls-info');
    if (!controlsInfo) return;
    
    // Clear any existing content
    controlsInfo.innerHTML = '<p><i class="fas fa-info-circle me-2"></i>Click the button below to start the broadcast.</p>';
    
    const playButton = document.createElement('button');
    playButton.textContent = text;
    playButton.className = 'btn btn-lg btn-primary mt-3';
    playButton.style.margin = '0 auto';
    playButton.style.display = 'block';
    
    playButton.addEventListener('click', function() {
      state.userInteracted = true;
      if (audioPlayer && audioPlayer.src && !state.playing) {
        playAudioDirect(audioPlayer.src);
      } else {
        getNextSegment();
      }
    });
    
    controlsInfo.appendChild(playButton);
  }
  
  // Show play button with custom text
  function showPlayButton(text) {
    const button = document.querySelector('.btn-primary');
    if (button) {
      button.textContent = text;
      button.style.display = 'block';
    } else {
      addPlayButton(text);
    }
  }
  
  // Function to check for new content
  function checkForContent() {
    const now = Date.now();
    if (now - state.lastCheck < 3000) return;
    state.lastCheck = now;
    
    console.log('Checking for content...');
    
    fetch('/api/check-new-segments')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Check result:', data);
        
        if (data.newContent && (!audioPlayer || audioPlayer.paused || audioPlayer.ended)) {
          getNextSegment();
        }
      })
      .catch(error => {
        console.error('Check error:', error);
      });
  }
  
  // Get next segment to play
  function getNextSegment() {
    console.log('Getting next segment');
    
    fetch('/api/next-segment')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Next segment:', data);
        
        if (data && data.hasSegment) {
          state.currentSegment = data;
          
          // Update transcript
          if (transcript) {
            transcript.textContent = data.text || 'Welcome to Crypto FM!';
          }
          
          // Play audio
          if (data.audioUrl && audioPlayer) {
            playAudio(data.audioUrl);
            
            // Mark as spoken after a delay
            setTimeout(() => {
              if (data.id) markSegmentAsSpoken(data.id);
            }, 3000);
          }
        }
      })
      .catch(error => {
        console.error('Get segment error:', error);
        // Show error message
        if (transcript) {
          transcript.textContent = 'Connection error. Please try again later.';
        }
      });
  }
  
  // Play audio with URL and handle autoplay restrictions
  function playAudio(url) {
    if (!audioPlayer) return;
    console.log('Playing audio:', url);
    
    // Reset retry counter for new audio attempt
    state.audioRetryCount = 0;
    
    // Check if user has interacted with the page
    if (!state.userInteracted) {
      console.log('User has not interacted with the page yet, storing URL for later');
      state.pendingAudioUrl = url;
      
      // Make sure the play button is visible
      showPlayButton('▶️ Tap to Play');
      
      return;
    }
    
    playAudioDirect(url);
  }
  
  // Direct audio playback without autoplay checks
  function playAudioDirect(url) {
    if (!audioPlayer) return;
    
    // Reset player
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    
    // Set source and load
    audioPlayer.src = url;
    audioPlayer.load();
    
    // Add audio loading indicator
    document.querySelector('.current-status').textContent = '⏳ Loading...';
    
    // Attempt to play
    console.log('Attempting to play audio:', url);
    audioPlayer.play()
      .then(() => {
        console.log('Audio playback started successfully');
        // Hide play button when playback starts
        const button = document.querySelector('.btn-primary');
        if (button) button.style.display = 'none';
      })
      .catch(error => {
        console.error('Audio play error:', error.name, error.message);
        
        // Show play button when autoplay fails
        showPlayButton('▶️ Tap to Play Audio');
        
        // Update status
        document.querySelector('.current-status').textContent = '⚠️ Tap to Play';
      });
  }
  
  // Mark segment as spoken
  function markSegmentAsSpoken(segmentId) {
    console.log('Marking segment as spoken:', segmentId);
    
    fetch('/api/mark-spoken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segmentId: segmentId })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Mark spoken result:', data);
      })
      .catch(error => {
        console.error('Mark spoken error:', error);
      });
  }
  
  // Setup volume slider if present
  if (volumeHandle) {
    const sliderTrack = volumeHandle.parentElement;
    
    // Set initial position
    volumeHandle.style.left = (state.volume * 100) + '%';
    
    if (sliderTrack) {
      // Handle click on track
      sliderTrack.addEventListener('click', (e) => {
        const rect = sliderTrack.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const volume = Math.max(0, Math.min(1, pos));
        
        volumeHandle.style.left = (volume * 100) + '%';
        if (audioPlayer) audioPlayer.volume = volume;
      });
    }
  }
  
  // Expose functions for debugging
  window.cryptoFM = {
    checkForContent,
    getNextSegment,
    playAudio,
    playAudioDirect,
    markSegmentAsSpoken,
    state
  };
}); 