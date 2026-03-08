/**
 * PWA Utilities - Service Worker registration and app install prompts
 */

/**
 * Register service worker for PWA functionality
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('Service Worker registered:', registration);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Every minute

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
};

/**
 * Unregister service worker (for development/testing)
 */
export const unregisterServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('Service Worker unregistered');
    }
  } catch (error) {
    console.error('Failed to unregister Service Worker:', error);
  }
};

/**
 * Check if app is running in standalone mode (installed PWA)
 */
export const isStandalone = () => {
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
};

/**
 * Handle app installation prompt
 */
let deferredPrompt = null;

export const captureInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('Install prompt captured');
  });
};

export const showInstallPrompt = async () => {
  if (!deferredPrompt) {
    console.log('Install prompt not available');
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (error) {
    console.error('Error showing install prompt:', error);
    return false;
  }
};

export const isDeferredPromptAvailable = () => {
  return deferredPrompt !== null;
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  return false;
};

/**
 * Send notification (requires permission)
 */
export const sendNotification = (title, options = {}) => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return;
  }

  if (Notification.permission === 'granted') {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'NOTIFICATION',
        title,
        options
      });
    } else {
      new Notification(title, options);
    }
  }
};

/**
 * Check if device is online
 */
export const isOnline = () => navigator.onLine;

/**
 * Listen for online/offline changes
 */
export const onOnlineStatusChange = (callback) => {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
};

/**
 * Get app version from manifest
 */
export const getAppVersion = async () => {
  try {
    const response = await fetch('/manifest.json');
    const manifest = await response.json();
    return manifest.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
};
