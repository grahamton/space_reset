/**
 * storageModule - Handles all localStorage persistence for sessions and timers
 */

const STORAGE_KEYS = {
  SESSION_STATE: 'session_state',
  TIMER_STATE: 'timer_state',
  SELECTED_PERSONA_ID: 'selected_persona_id',
  ROOM_TYPE: 'room_type',
  DIFFICULTY: 'difficulty',
  // String values: a number of missions, or 'auto' to let Claude size it to the photo.
  MISSION_COUNT: 'mission_count',
  // 'true' | 'false'. When 'true', a session with at least one mission done keeps the streak.
  STREAK_INCLUDES_SKIPS: 'streak_includes_skips',
  // 'true' | 'false'. What happens when a mission timer reaches zero.
  TIMER_SOUND: 'timer_sound',
  TIMER_NOTIFY: 'timer_notify'
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
      // The persona's in-character line for this session, so a refresh keeps it.
      note: parsed.note || null,
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
 * Timer phases:
 *   counting - a normal countdown; `seconds` is time left
 *   timesUp  - the countdown hit zero and is waiting for a choice
 *   overtime - "Keep going" was chosen; `seconds` counts up from zero
 *   done     - the mission was completed or skipped; restore a fresh time box
 */
export const TIMER_PHASES = ['counting', 'timesUp', 'overtime', 'done'];

/**
 * Save timer state for a specific mission.
 *
 * Scoped by mission id: a single shared key meant a paused timer from one
 * mission was restored onto the next one instead of its own time box.
 *
 * @param {string} missionId - Mission the timer belongs to
 * @param {number} seconds - Time left (counting) or time elapsed (overtime)
 * @param {boolean} isActive - Whether the clock is running
 * @param {string} phase - One of TIMER_PHASES
 */
export const saveTimer = (missionId, seconds, isActive, phase = 'counting') => {
  try {
    const toSave = {
      missionId,
      timeLeft: seconds,
      isActive,
      phase,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save timer state:', error);
  }
};

/**
 * Load timer state for a mission, accounting for time that passed while the
 * page was closed: a running countdown loses that time (and lands on timesUp
 * if it ran out), running overtime gains it.
 *
 * @param {string} missionId - Mission whose timer to restore
 * @returns {Object|null} { timeLeft, isActive, phase }, or null when there's
 *   nothing to restore (caller should fall back to the mission's own time box)
 */
export const loadTimer = (missionId) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (parsed.missionId !== missionId) return null;

    const { timeLeft, isActive, savedAt } = parsed;
    // Timers saved before phases existed are plain countdowns.
    const phase = TIMER_PHASES.includes(parsed.phase) ? parsed.phase : 'counting';
    if (phase === 'done') return null;

    const elapsedSeconds = isActive && savedAt ? Math.floor((Date.now() - savedAt) / 1000) : 0;

    if (phase === 'overtime') {
      return { timeLeft: timeLeft + elapsedSeconds, isActive: Boolean(isActive), phase };
    }
    if (phase === 'timesUp') {
      return { timeLeft: 0, isActive: false, phase };
    }

    const remaining = Math.max(0, timeLeft - elapsedSeconds);
    if (remaining === 0) {
      // Ran out while the page was closed. An old-format paused timer at zero
      // is ambiguous, so treat it as nothing to restore.
      return isActive ? { timeLeft: 0, isActive: false, phase: 'timesUp' } : null;
    }
    return { timeLeft: remaining, isActive: Boolean(isActive), phase };
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
