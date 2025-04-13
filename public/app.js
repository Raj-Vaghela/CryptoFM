/**
 * RADIOO Frontend Player
 * Handles audio playback and UI interactions for vintage radio interface
 */

$(document).ready(function() {
  // DOM elements
  const audioPlayer = document.getElementById('audioPlayer');
  const currentTranscript = $('#currentTranscript');
  const volumeHandle = document.getElementById('volumeHandle');
  const volumeTrack = volumeHandle.parentElement;
  const tickerTape = document.getElementById('tickerTape');
  const statusIndicator = document.querySelector('.status-indicator');
  
  // Crypto data elements
  const nftPrice = document.getElementById('nftPrice');
  const priceChange = document.getElementById('priceChange');
  const tradeVolume = document.getElementById('tradeVolume');
  const holders = document.getElementById('holders');
  const btcPrice = document.getElementById('btcPrice');
  const solPrice = document.getElementById('solPrice');
  const adaPrice = document.getElementById('adaPrice');
  const dogePrice = document.getElementById('dogePrice');
  
  // State variables
  let currentSegmentId = null;
  let isPlaying = false;
  let checkInterval;
  let isPlayerInitialized = false;
  let lastSegmentCheck = 0;
  let connectionAttempts = 0;
  let volumePosition = 0.7; // Starting position (0-1)
  let activeTab = 'eth';
  let activeCategory = 'top-nfts';
  const MAX_CONNECTION_ATTEMPTS = 5;
  
  // Set initial volume (mid-level)
  audioPlayer.volume = volumePosition;
  
  // Audio player event listeners
  audioPlayer.addEventListener('ended', function() {
    if (currentSegmentId) {
      markSegmentAsSpoken(currentSegmentId);
      currentSegmentId = null;
    }
    
    // Play next segment after current one ends
    playNextSegment();
  });
  
  audioPlayer.addEventListener('playing', function() {
    isPlaying = true;
    updateStatusIndicator('playing');
    
    // Reset connection attempts on successful play
    connectionAttempts = 0;
    
    // Track player initialization
    isPlayerInitialized = true;
  });
  
  audioPlayer.addEventListener('pause', function() {
    isPlaying = false;
    updateStatusIndicator('paused');
  });
  
  audioPlayer.addEventListener('error', function(e) {
    console.error('Audio player error:', e);
    currentTranscript.text('Error playing audio. Reconnecting...');
    updateStatusIndicator('error');
    
    // Increment connection attempts
    connectionAttempts++;
    
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      // Try next segment in 2 seconds
      setTimeout(playNextSegment, 2000);
    } else {
      currentTranscript.text('Connection failed. Please refresh the page to try again.');
      updateStatusIndicator('disconnected');
    }
  });
  
  // Update status indicator based on player state
  function updateStatusIndicator(state) {
    const dots = document.querySelectorAll('.indicator-dot');
    const statusBadge = document.querySelector('.status-badge');
    
    // Reset all dots
    dots.forEach(dot => {
      dot.classList.remove('active');
      dot.style.animation = 'none';
    });
    
    switch(state) {
      case 'playing':
        statusBadge.innerHTML = '<i class="fas fa-broadcast-tower me-1"></i> LIVE BROADCAST';
        dots.forEach(dot => dot.classList.add('active'));
        break;
      case 'paused':
        statusBadge.innerHTML = '<i class="fas fa-pause me-1"></i> PAUSED';
        dots[0].classList.add('active');
        break;
      case 'error':
        statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> RECONNECTING';
        dots[0].classList.add('active');
        dots[1].classList.add('active');
        break;
      case 'disconnected':
        statusBadge.innerHTML = '<i class="fas fa-times me-1"></i> DISCONNECTED';
        break;
    }
  }
  
  // Initialize slider position
  function initializeVolumeSlider() {
    // Set volume slider to 70%
    volumePosition = 0.7;
    updateVolumeSlider(volumePosition);
    
    // Set initial audio volume
    audioPlayer.volume = volumePosition;
  }
  
  // Update volume slider position and fill
  function updateVolumeSlider(position) {
    // Ensure position is between 0 and 1
    position = Math.max(0, Math.min(1, position));
    
    // Update handle position
    const leftPosition = position * 100;
    volumeHandle.style.left = `${leftPosition}%`;
    
    // Update the track's before pseudo-element width through CSS variable
    document.documentElement.style.setProperty('--volume-fill-width', `${leftPosition}%`);
    
    // Also directly set the width as a backup in case CSS variable doesn't work
    const fillTrack = volumeTrack.querySelector('.fill-track');
    if (!fillTrack) {
      // Create fill track element if it doesn't exist
      const newFillTrack = document.createElement('div');
      newFillTrack.className = 'fill-track';
      newFillTrack.style.position = 'absolute';
      newFillTrack.style.left = '0';
      newFillTrack.style.top = '0';
      newFillTrack.style.height = '100%';
      newFillTrack.style.backgroundColor = '#b8ed86';
      newFillTrack.style.borderRadius = '3px';
      newFillTrack.style.boxShadow = '0 0 6px rgba(184, 237, 134, 0.5)';
      newFillTrack.style.pointerEvents = 'none';
      newFillTrack.style.width = `${leftPosition}%`;
      volumeTrack.appendChild(newFillTrack);
    } else {
      fillTrack.style.width = `${leftPosition}%`;
    }
  }
  
  // Handle volume slider movement
  let isDraggingVolume = false;
  
  // Event handlers for volume slider - improve by adding event capture phase
  volumeHandle.addEventListener('mousedown', function(e) {
    isDraggingVolume = true;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
    e.stopPropagation();
    
    // Initial position update on mousedown
    const trackRect = volumeTrack.getBoundingClientRect();
    const trackWidth = trackRect.width;
    const relativeX = Math.max(0, Math.min(e.clientX - trackRect.left, trackWidth));
    volumePosition = relativeX / trackWidth;
    updateVolumeSlider(volumePosition);
    audioPlayer.volume = volumePosition;
    
    // Capture event to handle cases where mouse moves out of slider handle
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, true);
  
  // Mouse handlers as separate functions to enable proper cleanup
  function handleMouseMove(e) {
    handleVolumeSliderMove(e.clientX);
  }
  
  function handleMouseUp() {
    isDraggingVolume = false;
    document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
  
  // Touch events with more robust handling
  volumeHandle.addEventListener('touchstart', function(e) {
    isDraggingVolume = true;
    e.preventDefault();
    e.stopPropagation();
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
  }, { passive: false });
  
  function handleTouchMove(e) {
    if (!isDraggingVolume) return;
    e.preventDefault(); // Prevent scrolling
    handleVolumeSliderMove(e.touches[0].clientX);
  }
  
  function handleTouchEnd() {
    isDraggingVolume = false;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchEnd);
  }
  
  // Track click handler - immediately update volume on click
  volumeTrack.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const trackRect = volumeTrack.getBoundingClientRect();
    const trackWidth = trackRect.width;
    const relativeX = Math.max(0, Math.min(e.clientX - trackRect.left, trackWidth));
    
    // Calculate new volume position (0-1)
    volumePosition = relativeX / trackWidth;
    
    // Update slider position and fill
    updateVolumeSlider(volumePosition);
    
    // Update audio volume
    audioPlayer.volume = volumePosition;
    
    // Pause/play based on volume level
    if (volumePosition < 0.05) {
      if (isPlaying && audioPlayer.src) {
        audioPlayer.pause();
      }
    } else if (!isPlaying && audioPlayer.src && audioPlayer.paused) {
      audioPlayer.play().catch(handlePlayError);
    }
  });
  
  // Add cursor styles on hover
  volumeHandle.addEventListener('mouseover', function() {
    document.body.style.cursor = 'grab';
  });
  
  volumeHandle.addEventListener('mouseout', function() {
    if (!isDraggingVolume) {
      document.body.style.cursor = 'default';
    }
  });
  
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      activeTab = this.getAttribute('data-coin');
      fetchCryptoData();
    });
  });
  
  document.querySelectorAll('.category').forEach(category => {
    category.addEventListener('click', function() {
      document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      activeCategory = this.textContent.toLowerCase().replace(' ', '-');
      fetchCryptoData();
    });
  });
  
  // Error handling for play
  function handlePlayError(error) {
    console.error('Error playing audio:', error);
    currentTranscript.text('Error playing audio. Reconnecting...');
    updateStatusIndicator('error');
    
    // Increment connection attempts
    connectionAttempts++;
    
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      setTimeout(playNextSegment, 3000);
    } else {
      currentTranscript.text('Connection failed. Please refresh the page to try again.');
      updateStatusIndicator('disconnected');
    }
  }
  
  // API functions
  function checkNewSegments() {
    // Throttle checks to prevent too many requests
    const now = Date.now();
    if (now - lastSegmentCheck < 5000) return;
    lastSegmentCheck = now;
    
    $.get('/api/check-new-segments')
      .done(function(data) {
        if (data.success && data.hasNewSegment) {
          if (!isPlaying) {
            playNextSegment();
          }
        }
      })
      .fail(function(error) {
        console.error('Error checking for new segments:', error);
      });
  }
  
  function getNextSegment() {
    return $.get('/api/next-segment');
  }
  
  function markSegmentAsSpoken(id) {
    return $.post(`/api/mark-spoken/${id}`);
  }
  
  function getApiStatus() {
    return $.get('/api/status');
  }
  
  function playNextSegment() {
    getNextSegment()
      .done(function(data) {
        if (data.success && data.hasSegment) {
          const segment = data.segment;
          currentSegmentId = segment.id;
          
          // Update transcript
          currentTranscript.text(segment.text);
          
          // Play audio if available
          if (segment.audioUrl) {
            audioPlayer.src = segment.audioUrl;
            // Only play if volume is not at minimum
            if (audioPlayer.volume > 0.05) {
              audioPlayer.play().catch(handlePlayError);
            } else {
              // Mark as not playing but ready to play when volume increases
              isPlaying = false;
              updateStatusIndicator('paused');
            }
          } else {
            console.warn('No audio available for segment');
            
            // Mark as spoken and try the next one after a delay
            if (currentSegmentId) {
              markSegmentAsSpoken(currentSegmentId);
              currentSegmentId = null;
              setTimeout(playNextSegment, 1000);
            }
          }
        } else {
          // No segment available, check again in a few seconds
          currentTranscript.text('Waiting for new content...');
          setTimeout(checkNewSegments, 5000);
        }
      })
      .fail(function(error) {
        console.error('Error getting next segment:', error);
        currentTranscript.text('Error connecting to radio service. Retrying...');
        updateStatusIndicator('error');
        
        // Increment connection attempts
        connectionAttempts++;
        
        if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
          setTimeout(playNextSegment, 5000);
        } else {
          currentTranscript.text('Connection failed. Please refresh the page to try again.');
          updateStatusIndicator('disconnected');
        }
      });
  }
  
  // Fetch crypto data with updated value display
  function fetchCryptoData() {
    // For demo purposes, we'll use simulated data
    // In production, replace with actual API calls
    
    let coinData = {
      eth: {
        nftPrice: "2.88",
        priceChange: "+1.5%",
        volume: "1,234.5 ETH",
        holders: "10,492"
      },
      btc: {
        nftPrice: "0.034",
        priceChange: "-0.8%",
        volume: "256.2 BTC",
        holders: "8,745"
      },
      sol: {
        nftPrice: "23.5",
        priceChange: "+4.2%",
        volume: "15,430 SOL",
        holders: "6,129"
      }
    };
    
    // Update display with selected coin data
    const data = coinData[activeTab];
    nftPrice.textContent = data.nftPrice;
    priceChange.textContent = data.priceChange;
    tradeVolume.textContent = data.volume;
    holders.textContent = data.holders;
    
    // Add appropriate CSS class for price change color
    if (data.priceChange.startsWith('+')) {
      priceChange.classList.add('positive');
      priceChange.classList.remove('negative');
    } else {
      priceChange.classList.add('negative');
      priceChange.classList.remove('positive');
    }
    
    // We're no longer updating the ticker here since we have custom text in the HTML
  }
  
  // Initialize the application
  function initialize() {
    // Add CSS variable for volume fill
    document.documentElement.style.setProperty('--volume-fill-width', '70%');
    
    // Initialize volume slider
    initializeVolumeSlider();
    
    // Load initial crypto data
    fetchCryptoData();
    
    // Set initial status indicator
    updateStatusIndicator('playing');
    
    // Start playing the radio automatically after a short delay
    setTimeout(playNextSegment, 1500);
    
    // Start periodic checks for new content
    checkInterval = setInterval(checkNewSegments, 10000);
    
    // Update market highlights and ticker every 60 seconds
    setInterval(fetchCryptoData, 60000);
    
    // Check API status every 30 seconds
    setInterval(function() {
      getApiStatus()
        .done(function(data) {
          if (data.success) {
            // If API is healthy but player is not playing anything,
            // try to restart playback if volume is not at minimum
            if (!isPlaying && connectionAttempts < MAX_CONNECTION_ATTEMPTS && audioPlayer.volume > 0.05) {
              playNextSegment();
            }
          }
        });
    }, 30000);
  }
  
  // Start the application
  initialize();
}); 