/**
 * storageModule - Handles all localStorage persistence for sessions and timers
 */

const STORAGE_KEYS = {
  SESSION_STATE: 'session_state',
  TIMER_STATE: 'timer_state',
  GEMINI_API_KEY: 'gemini_api_key',
  SELECTED_PERSONA_ID: 'selected_persona_id'
};

const SESSION_EXPIRY_HOURS = 24;

/**
 * Serialize and save session state to localStorage
 * @param {Object} sessionState - Mission queue, index, completedCount, status, error
 */
export const saveSession = (sessionState) => {
  try {
    const toSave = {
      ...sessionState,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.SESSION_STATE, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
};

/**
 * Load session state from localStorage
 * @returns {Object|null} Restored sessionState or null if expired/corrupted
 */
export const loadSession = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION_STATE);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const savedAt = parsed.savedAt || Date.now();
    const hoursOld = (Date.now() - savedAt) / (1000 * 60 * 60);

    // Expire sessions older than 24 hours
    if (hoursOld > SESSION_EXPIRY_HOURS) {
      clearSession();
      return null;
    }

    return {
      status: parsed.status || 'idle',
      missionQueue: parsed.missionQueue || [],
      currentMissionIndex: parsed.currentMissionIndex || 0,
      completedCount: parsed.completedCount || 0,
      error: parsed.error || null
    };
  } catch (error) {
    console.error('Failed to load session:', error);
    clearSession();
    return null;
  }
};

/**
 * Save timer state (remaining seconds, active flag, last saved timestamp)
 * @param {number} timeLeft - Seconds remaining
 * @param {boolean} isActive - Whether timer is running
 */
export const saveTimer = (timeLeft, isActive) => {
  try {
    const toSave = {
      timeLeft,
      isActive,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save timer state:', error);
  }
};

/**
 * Load timer state and calculate elapsed time since last save
 * Accounts for time that passed while page was closed
 * @returns {Object} { timeLeft, isActive }
 */
export const loadTimer = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    if (!stored) return { timeLeft: 0, isActive: false };

    const parsed = JSON.parse(stored);
    const { timeLeft, isActive, savedAt } = parsed;

    // If timer was running, subtract elapsed time
    if (isActive && savedAt) {
      const elapsedSeconds = Math.floor((Date.now() - savedAt) / 1000);
      const remaining = Math.max(0, timeLeft - elapsedSeconds);
      return { timeLeft: remaining, isActive: remaining > 0 };
    }

    return { timeLeft, isActive: false };
  } catch (error) {
    console.error('Failed to load timer state:', error);
    return { timeLeft: 0, isActive: false };
  }
};

/**
 * Clear all session data (session + timer)
 */
export const clearSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION_STATE);
    localStorage.removeItem(STORAGE_KEYS.TIMER_STATE);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
};

/**
 * Check if a session exists in storage
 * @returns {boolean}
 */
export const hasSession = () => {
  const session = loadSession();
  return session !== null && session.missionQueue.length > 0;
};

/**
 * Get only the missionQueue and index (for resume button context)
 * @returns {Object} { missionCount, completedCount, remainingCount }
 */
export const getSessionSummary = () => {
  const session = loadSession();
  if (!session) return null;

  return {
    missionCount: session.missionQueue.length,
    completedCount: session.completedCount,
    remainingCount: session.missionQueue.length - session.completedCount
  };
};
