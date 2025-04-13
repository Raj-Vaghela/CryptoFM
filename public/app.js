/**
 * Crypto FM - Cryptocurrency Radio Frontend
 * 
 * This script powers the interactive frontend for the Crypto FM application,
 * a vintage-styled radio interface for cryptocurrency news and information.
 * 
 * Main features:
 * - Volume control via custom slider
 * - Audio player management for streaming content
 * - Cryptocurrency data display and updates
 * - Status indicator management
 * - Touch and mouse event handling
 * 
 * The application follows a modular design pattern with separate concerns for:
 * - UI interaction and updates
 * - Audio playback control
 * - Data fetching and display
 * - Connection status management
 */

$(document).ready(function() {
  // DOM elements
  const audioPlayer = document.getElementById('audioPlayer');
  const currentTranscript = $('#currentTranscript');
  const volumeHandle = document.getElementById('volumeHandle');
  const volumeTrack = document.querySelector('.slider-track');
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
  let volumeLevel = 0.7; // Starting volume (0-1)
  let activeTab = 'eth';
  let activeCategory = 'top-nfts';
  const MAX_CONNECTION_ATTEMPTS = 5;
  
  // Set initial volume
  audioPlayer.volume = volumeLevel;
  
  // Audio player event listeners
  audioPlayer.addEventListener('ended', function() {
    if (currentSegmentId) {
      markSegmentAsSpoken(currentSegmentId);
      currentSegmentId = null;
    }
    
    // Add a small delay before playing the next segment
    // This helps create a more natural break between segments
    setTimeout(() => {
      playNextSegment();
    }, 1000);
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
  
  // ---------- Volume Slider Implementation ----------
  
  /**
   * Initialize the volume slider
   */
  function initializeVolumeSlider() {
    // Set default volume level
    volumeLevel = 0.7;
    
    // Update the visual slider and audio player volume
    updateSliderUI(volumeLevel);
    audioPlayer.volume = volumeLevel;
    
    // Add event listeners
    setupVolumeEvents();
  }
  
  /**
   * Updates the UI of the slider based on current volume level
   * @param {number} level - Volume level (0-1)
   */
  function updateSliderUI(level) {
    // Ensure level is between 0 and 1
    level = Math.max(0, Math.min(1, level));
    
    // Calculate position as percentage
    const position = `${level * 100}%`;
    
    // Update handle position
    volumeHandle.style.left = position;
    
    // Update CSS variable for the track fill
    document.documentElement.style.setProperty('--volume-fill-width', position);
  }
  
  /**
   * Setup all event listeners for the volume slider
   */
  function setupVolumeEvents() {
    // Mouse events
    volumeHandle.addEventListener('mousedown', handleDragStart);
    volumeTrack.addEventListener('click', handleTrackClick);
    
    // Touch events
    volumeHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // Hover effects
    volumeHandle.addEventListener('mouseover', () => {
      document.body.style.cursor = 'grab';
    });
    
    volumeHandle.addEventListener('mouseout', () => {
      if (!isDragging) {
        document.body.style.cursor = 'default';
      }
    });
  }
  
  // Dragging state
  let isDragging = false;
  
  /**
   * Handle the start of a drag operation
   * @param {MouseEvent} e - The mouse event
   */
  function handleDragStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isDragging = true;
    document.body.style.cursor = 'grabbing';
    
    // Add no-transition class to remove lag during interaction
    volumeTrack.classList.add('no-transition');
    
    // Update volume based on initial click position
    updateVolumeFromEvent(e);
    
    // Add document-level event listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }
  
  /**
   * Handle mouse movement during drag
   * @param {MouseEvent} e - The mouse event
   */
  function handleDragMove(e) {
    if (!isDragging) return;
    updateVolumeFromEvent(e);
  }
  
  /**
   * Handle the end of a drag operation
   */
  function handleDragEnd() {
    isDragging = false;
    document.body.style.cursor = 'default';
    
    // Remove no-transition class to restore smooth transitions
    volumeTrack.classList.remove('no-transition');
    
    // Remove document-level event listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }
  
  /**
   * Handle click on the track to update volume
   * @param {MouseEvent} e - The mouse event
   */
  function handleTrackClick(e) {
    e.preventDefault();
    e.stopPropagation();
    updateVolumeFromEvent(e);
  }
  
  /**
   * Handle touch start for mobile devices
   * @param {TouchEvent} e - The touch event
   */
  function handleTouchStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isDragging = true;
    
    // Add no-transition class to remove lag during interaction
    volumeTrack.classList.add('no-transition');
    
    // Update volume based on initial touch position
    const touch = e.touches[0];
    updateVolumeFromClientX(touch.clientX);
    
    // Add document-level event listeners
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
  }
  
  /**
   * Handle touch movement
   * @param {TouchEvent} e - The touch event
   */
  function handleTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling
    
    const touch = e.touches[0];
    updateVolumeFromClientX(touch.clientX);
  }
  
  /**
   * Handle touch end
   */
  function handleTouchEnd() {
    isDragging = false;
    
    // Remove no-transition class to restore smooth transitions
    volumeTrack.classList.remove('no-transition');
    
    // Remove document-level event listeners
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchEnd);
  }
  
  /**
   * Calculate and update volume from a mouse or touch event
   * @param {MouseEvent|TouchEvent} e - The event
   */
  function updateVolumeFromEvent(e) {
    updateVolumeFromClientX(e.clientX);
  }
  
  /**
   * Calculate and update volume from client X position
   * @param {number} clientX - The clientX position
   */
  function updateVolumeFromClientX(clientX) {
    const trackRect = volumeTrack.getBoundingClientRect();
    const trackWidth = trackRect.width;
    const relativeX = Math.max(0, Math.min(clientX - trackRect.left, trackWidth));
    
    // Calculate new volume level (0-1)
    volumeLevel = relativeX / trackWidth;
    
    // Update slider UI
    updateSliderUI(volumeLevel);
    
    // Update audio player volume
    audioPlayer.volume = volumeLevel;
    
    // Toggle play/pause based on volume level
    handleVolumePlayback();
  }
  
  /**
   * Handle playback based on current volume level
   * Allows playback to continue even at zero volume
   */
  function handleVolumePlayback() {
    // Continue playback even if volume is zero
    if (!isPlaying && audioPlayer.src && audioPlayer.paused) {
      // Resume playback if paused
      audioPlayer.play().catch(handlePlayError);
    }
  }
  
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
  
  /**
   * Plays the next audio segment from the server
   */
  function playNextSegment() {
    // Don't try to play if we're already playing
    if (audioPlayer.currentTime > 0 && !audioPlayer.paused && !audioPlayer.ended) {
      return;
    }
    
    // Update UI to show loading state
    updateStatusIndicator('loading');
    currentTranscript.html('<em>Loading next segment...</em>');
    
    // Fetch the next segment from the server
    getNextSegment()
      .then(response => {
        if (response.hasSegment) {
          const segment = response.segment;
          currentSegmentId = segment.id;
          
          // Update the transcript text
          currentTranscript.html(segment.text);
          
          // Set the audio source and play when ready
          if (segment.audioUrl) {
            // Add timestamp parameter to prevent browser caching
            const cacheBuster = new Date().getTime();
            const audioUrl = `${segment.audioUrl}?t=${cacheBuster}`;
            
            // Preload the next audio before playing
            audioPlayer.src = audioUrl;
            audioPlayer.load(); // Explicitly load the audio
            
            // Set a small pause before playing to allow for buffering
            setTimeout(() => {
              // Start playback
              const playPromise = audioPlayer.play();
              
              // Handle play promise (might be rejected if user hasn't interacted with page)
              if (playPromise !== undefined) {
                playPromise.catch(error => {
                  console.error('Playback error:', error);
                  updateStatusIndicator('paused');
                  
                  // Show play button if autoplay isn't allowed
                  $('#playButton').show();
                });
              }
            }, 800); // Increased from 500ms to 800ms for better buffering
            
            // Schedule the next segment check earlier than the end
            // This helps preload the next segment for a smoother transition
            audioPlayer.addEventListener('timeupdate', function checkTimeForNextSegment() {
              if (audioPlayer.duration && audioPlayer.currentTime > 0) {
                const timeLeft = audioPlayer.duration - audioPlayer.currentTime;
                if (timeLeft <= 5 && timeLeft > 0) {
                  audioPlayer.removeEventListener('timeupdate', checkTimeForNextSegment);
                  checkNewSegments();
                }
              }
            });
            
          } else {
            // No audio URL available
            currentTranscript.html('<em>Audio for this segment is still generating. Please wait...</em>');
            // Retry after 3 seconds
            setTimeout(playNextSegment, 3000);
          }
        } else {
          // No segment available yet
          if (lastSegmentCheck === 0) {
            // First check - show initial message
            currentTranscript.html('<em>Waiting for the broadcast to begin. The AI DJ is preparing the latest crypto news for you...</em>');
          } else {
            // Subsequent check - show waiting message
            currentTranscript.html('<em>The broadcast will continue shortly. Our AI DJ is analyzing the latest market data...</em>');
          }
          
          // Check for new segments in 5 seconds
          setTimeout(checkNewSegments, 5000);
        }
        
        lastSegmentCheck = Date.now();
      })
      .catch(error => {
        handlePlayError(error);
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
  }
  
  // Initialize the application
  function initialize() {
    // Add CSS variable for volume fill
    document.documentElement.style.setProperty('--volume-fill-width', '70%');
    
    // Initialize volume slider with our new approach
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
            // try to restart playback regardless of volume level
            if (!isPlaying && connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
              playNextSegment();
            }
          }
        });
    }, 30000);
  }
  
  // Start the application
  initialize();
});