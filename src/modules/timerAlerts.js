/**
 * timerAlerts - sound and notification helpers for the mission timer.
 *
 * No audio files and no network calls: the chime is synthesized with the Web
 * Audio API. Browsers block audio until a user gesture has happened, so
 * primeAudioContext should be called from one (e.g. starting the timer, or
 * flipping the sound toggle in settings) well before playChime is ever
 * called on its own from a timer tick reaching zero.
 */

import { loadPreference } from './storageModule';

let audioCtx = null;

const getAudioContextClass = () => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
};

const ensureAudioContext = () => {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

/**
 * Create (or resume) the shared AudioContext from a user gesture, so the
 * browser's autoplay policy doesn't silently swallow the chime later, when
 * zero is reached on its own with no click involved.
 */
export const primeAudioContext = () => {
  try {
    ensureAudioContext();
  } catch (error) {
    console.error('Failed to prepare audio context:', error);
  }
};

/**
 * Play a short, two-note chime. Gentle by design - this is an ADHD app,
 * not an alarm clock.
 */
export const playChime = () => {
  try {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, start: 0, duration: 0.22 }, // D5
      { freq: 783.99, start: 0.14, duration: 0.3 } // G5
    ];

    notes.forEach(({ freq, start, duration }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;

      const startTime = now + start;
      const endTime = startTime + duration;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.16, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, endTime);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime + 0.02);
    });
  } catch (error) {
    console.error('Failed to play chime:', error);
  }
};

/** Play the chime only if the user has sound enabled (default on). */
export const maybePlayTimesUpSound = () => {
  if (loadPreference('TIMER_SOUND', 'true') === 'true') {
    playChime();
  }
};

export const isNotificationSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export const getNotificationPermission = () =>
  isNotificationSupported() ? Notification.permission : 'unsupported';

/**
 * Requests permission. Only call this from a user gesture (the settings
 * toggle) - browsers ignore or auto-deny requests made outside one.
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return Notification.permission;
  }
};

/**
 * Show the "time's up" notification if the user opted in and permission was
 * granted. Without a service worker this only fires while the page is open
 * (a background tab is fine, a fully closed tab is not) - acceptable for
 * this app, but worth knowing.
 */
export const maybeShowTimesUpNotification = (missionTitle) => {
  if (loadPreference('TIMER_NOTIFY', 'false') !== 'true') return;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(`Time's up: ${missionTitle}`, {
      body: 'Done, keep going, or grab a bit more time.',
      tag: 'space-reset-timer'
    });
    notification.onclick = () => {
      if (typeof window !== 'undefined' && window.focus) window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
};

/** Fire whichever alerts the user has opted into, once, at zero. */
export const fireTimesUpAlerts = (missionTitle) => {
  maybePlayTimesUpSound();
  maybeShowTimesUpNotification(missionTitle);
};
