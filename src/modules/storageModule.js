/**
 * storageModule - Handles all localStorage persistence for sessions and timers
 */

const STORAGE_KEYS = {
  SESSION_STATE: 'session_state',
  TIMER_STATE: 'timer_state',
  SELECTED_PERSONA_ID: 'selected_persona_id',
  ROOM_TYPE: 'room_type',
  DIFFICULTY: 'difficulty'
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
      startedAt: parsed.startedAt || savedAt,
      error: parsed.error || null,
      // Carried through so a round trip through the app doesn't hide the
      // session's own age from the expiry check above.
      savedAt
    };
  } catch (error) {
    console.error('Failed to load session:', error);
    clearSession();
    return null;
  }
};

/**
 * Save timer state for a specific mission.
 *
 * Scoped by mission id: a single shared key meant a paused timer from one
 * mission was restored onto the next one instead of its own time box.
 *
 * @param {string} missionId - Mission the timer belongs to
 * @param {number} timeLeft - Seconds remaining
 * @param {boolean} isActive - Whether timer is running
 */
export const saveTimer = (missionId, timeLeft, isActive) => {
  try {
    const toSave = {
      missionId,
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
 * Load timer state for a mission, accounting for time that passed while the
 * page was closed.
 *
 * @param {string} missionId - Mission whose timer to restore
 * @returns {Object|null} { timeLeft, isActive }, or null if no timer is stored
 *   for this mission (caller should fall back to the mission's own time box)
 */
export const loadTimer = (missionId) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (parsed.missionId !== missionId) return null;

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
    return null;
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

/**
 * Read/write the user's persisted preferences.
 */
export const loadPreference = (key, fallback = null) => {
  try {
    return localStorage.getItem(STORAGE_KEYS[key]) ?? fallback;
  } catch (error) {
    console.error(`Failed to load preference ${key}:`, error);
    return fallback;
  }
};

export const savePreference = (key, value) => {
  try {
    localStorage.setItem(STORAGE_KEYS[key], value);
  } catch (error) {
    console.error(`Failed to save preference ${key}:`, error);
  }
};
