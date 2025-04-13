/**
 * Crypto FM - Offline MP3 Data
 * 
 * This provides a base64-encoded tiny MP3 file that can be used as a fallback
 * when other audio sources fail. The audio is a simple "beep" sound.
 */

// This is a base64-encoded MP3 file (a short beep sound)
window.FALLBACK_AUDIO_DATA = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFCgUFBQUFBQ8PDw8PDxVPDw8PDw8aWlpaWlpfmlpaWlpaZaWlpaWlq+WlpaWlpbMzMzMzMzj29vb29vb9/f39/f3//f39/f39/////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAUHkkIAAAAAAAAAAAAAAMXaR0EAAAAAAAAAAAAAAAAAAAAA//tAxAAABvQfX7kEACDwg2snIIAEAQA0PN1C4TYEJ4RY2ppJTctJocTYVE/NSaRchUMRwRw8PnhKSQiFAGWQyyfJPCQfB8Pn/+cHg+H//5CEeJBEQhr/5cqlUqiQTEP//0rRBwAP/+yDE1gAM9CNvuPKAIpaIbXcekAQPC8ulUBIpWLsWlU9M9Y2rlltMtNGYR1l0rC1GBUoVQuTaastjTM2YVowACS7lEUNFzA8WCQQVNcDxUJAt//2YZKOTDGh4/+nblPa4LEBI2XP/9Le3KBgQ8A0M0//+2DE4AMD/ENruPSAIYOIbPcekARFZQsWIrCxHC86EgKpkiEx7PJwkEgaJKvMPFAIJnCRC6+Q9cGT//kLOEA2Tla56k2IX///zrYUBBEWyQUdwgCxQEL1////////zJ3/////uESRZQAEAQBAMDggBQofr////8z9P/in6CCsErNVkkQkELjgaG48PHpCgmqD/8SL4/WQsiNIEgAAAAAA";

/**
 * Create an audio element with the fallback MP3 data
 * Returns an audio element that's ready to play
 */
window.createFallbackAudio = function() {
  const audio = new Audio();
  const source = 'data:audio/mp3;base64,' + window.FALLBACK_AUDIO_DATA;
  audio.src = source;
  return audio;
};

/**
 * Play the fallback audio immediately
 * This can be useful to test if audio can be played at all
 */
window.playFallbackBeep = function() {
  const audio = createFallbackAudio();
  audio.volume = 0.5;
  return audio.play().catch(err => console.error('Failed to play fallback audio:', err));
};

// Log that the fallback audio is available
console.log('Crypto FM fallback audio loaded and ready'); 