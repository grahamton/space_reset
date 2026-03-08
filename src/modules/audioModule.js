/**
 * audioModule - Handles ambient sounds during timer and notifications
 */

// Ambient sound options (using free, royalty-free sources)
export const AMBIENT_SOUNDS = {
  none: {
    id: 'none',
    name: 'None',
    description: 'No background sound',
    url: null
  },
  lofi: {
    id: 'lofi',
    name: 'Lo-Fi Hip Hop',
    description: 'Chill beats for focused work',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Placeholder
  },
  nature: {
    id: 'nature',
    name: 'Nature Sounds',
    description: 'Forest ambience with birds',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Placeholder
  },
  white_noise: {
    id: 'white_noise',
    name: 'White Noise',
    description: 'Gentle background noise',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Placeholder
  },
  rain: {
    id: 'rain',
    name: 'Rain',
    description: 'Calming rainfall sounds',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Placeholder
  }
};

let audioElement = null;

/**
 * Play ambient sound (with loop)
 */
export const playAmbientSound = (soundId, volume = 0.3) => {
  try {
    const sound = AMBIENT_SOUNDS[soundId];
    if (!sound || !sound.url) {
      console.log('No ambient sound to play');
      return false;
    }

    // Stop existing audio
    stopAmbientSound();

    audioElement = new Audio(sound.url);
    audioElement.loop = true;
    audioElement.volume = Math.max(0, Math.min(1, volume));

    audioElement.play().catch((error) => {
      console.error('Failed to play ambient sound:', error);
    });

    return true;
  } catch (error) {
    console.error('Error playing ambient sound:', error);
    return false;
  }
};

/**
 * Stop ambient sound
 */
export const stopAmbientSound = () => {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement = null;
  }
};

/**
 * Set volume (0-1)
 */
export const setAmbientVolume = (volume) => {
  if (audioElement) {
    audioElement.volume = Math.max(0, Math.min(1, volume));
  }
};

/**
 * Play timer completion sound (simple beep)
 */
export const playTimerCompletionSound = () => {
  try {
    // Create simple beep using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // 800Hz
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Failed to play completion sound:', error);
  }
};

/**
 * Play success/celebration sound
 */
export const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Play ascending notes (celebratory)
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = audioContext.currentTime;

    notes.forEach((frequency, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.frequency.value = frequency;
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.2, now + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.2);

      osc.start(now + index * 0.1);
      osc.stop(now + index * 0.1 + 0.2);
    });
  } catch (error) {
    console.error('Failed to play success sound:', error);
  }
};

/**
 * Get all available ambient sounds
 */
export const getAvailableSounds = () => {
  return Object.values(AMBIENT_SOUNDS);
};

/**
 * Check if audio is supported
 */
export const isAudioSupported = () => {
  return !!window.AudioContext || !!window.webkitAudioContext;
};
