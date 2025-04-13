/**
 * Crypto FM - Fixed Application Script
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
    lastCheck: 0
  };
  
  // Initialize audio player
  if (audioPlayer) {
    audioPlayer.volume = state.volume;
    
    audioPlayer.addEventListener('playing', () => {
      console.log('Audio playing');
      state.playing = true;
    });
    
    audioPlayer.addEventListener('ended', () => {
      console.log('Audio ended');
      state.playing = false;
      checkForContent();
    });
    
    audioPlayer.addEventListener('error', (e) => {
      console.error('Audio error:', audioPlayer.error);
      state.playing = false;
    });
  }
  
  // Add play button for autoplay issues
  const controlsInfo = document.querySelector('.controls-info');
  if (controlsInfo) {
    const playButton = document.createElement('button');
    playButton.textContent = 'Click to Play';
    playButton.className = 'btn btn-primary mt-3';
    playButton.style.margin = '0 auto';
    playButton.style.display = 'block';
    
    playButton.addEventListener('click', function() {
      if (audioPlayer && audioPlayer.src) {
        audioPlayer.play().catch(e => console.log('Play error:', e));
      } else {
        getNextSegment();
      }
    });
    
    controlsInfo.appendChild(playButton);
  }
  
  // Check for content periodically
  setInterval(checkForContent, 5000);
  checkForContent();
  
  // Function to check for new content
  function checkForContent() {
    const now = Date.now();
    if (now - state.lastCheck < 3000) return;
    state.lastCheck = now;
    
    console.log('Checking for content...');
    
    fetch('/api/check-new-segments')
      .then(response => response.json())
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
      .then(response => response.json())
      .then(data => {
        console.log('Next segment:', data);
        
        if (data.hasSegment) {
          state.currentSegment = data;
          
          // Update transcript
          if (transcript) {
            transcript.textContent = data.text;
            transcript.parentElement.style.display = 'block';
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
      });
  }
  
  // Play audio with URL
  function playAudio(url) {
    if (!audioPlayer) return;
    
    console.log('Playing audio:', url);
    
    // Reset player
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    
    // Set source and load
    audioPlayer.src = url;
    audioPlayer.load();
    
    // Attempt to play
    audioPlayer.play()
      .then(() => {
        console.log('Audio playback started');
      })
      .catch(error => {
        console.error('Audio play error:', error);
        // Show play button explicitly when autoplay fails
        const button = document.querySelector('.btn-primary');
        if (button) button.style.display = 'block';
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
      .then(response => response.json())
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
    markSegmentAsSpoken,
    state
  };
}); 