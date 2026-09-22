/**
 * historyModule - Manages session history, streaks, and statistics
 * Enables gamification and progress tracking for ADHD users
 */

import { loadPreference } from './storageModule';

const STORAGE_KEY_HISTORY = 'session_history';
const STORAGE_KEY_STATS = 'user_statistics';
const STORAGE_KEY_LAST_SESSION_DATE = 'last_session_date';

/**
 * Session history entry structure:
 * {
 *   id: "session_20260307_143022",
 *   date: "2025-03-07",
 *   timestamp: 1709874600000,
 *   personaId: "gentle",
 *   roomType: "bedroom",
 *   missionCount: 5,
 *   completedCount: 5,
 *   totalTime: 1250,  // seconds
 *   beforePhoto: "data:image/...",
 *   afterPhoto: "data:image/...",
 *   rating: 4,  // 1-5 stars
 *   notes: "Felt good today"
 * }
 */

/**
 * Save completed session to history
 */
export const saveSessionToHistory = (sessionData) => {
  try {
    const history = loadHistory();
    const sessionEntry = {
      id: `session_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      ...sessionData
    };

    history.push(sessionEntry);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));

    // Update streak
    updateStreak();

    return sessionEntry;
  } catch (error) {
    console.error('Failed to save session to history:', error);
    return null;
  }
};

/**
 * Load all session history
 */
export const loadHistory = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
};

/**
 * Get session history with filters
 */
export const getHistoryFiltered = (filters = {}) => {
  const history = loadHistory();
  let filtered = [...history];

  if (filters.personaId) {
    filtered = filtered.filter((s) => s.personaId === filters.personaId);
  }

  if (filters.roomType) {
    filtered = filtered.filter((s) => s.roomType === filters.roomType);
  }

  if (filters.daysBack) {
    const cutoff = Date.now() - filters.daysBack * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((s) => s.timestamp >= cutoff);
  }

  if (filters.completedOnly) {
    filtered = filtered.filter((s) => s.completedCount === s.missionCount);
  }

  // Sort by date descending (newest first)
  return filtered.sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Whether a session with at least one completed mission (rather than every
 * mission) keeps the streak alive. Defaults to true: an ADHD user who starts
 * and skips still showed up. 'Completionist' and the "with every mission
 * done" stats stay all-done regardless of this setting.
 */
export const isStreakIncludingSkips = () =>
  loadPreference('STREAK_INCLUDES_SKIPS', 'true') !== 'false';

const sessionCountsForStreak = (session, includeSkips) =>
  includeSkips ? session.completedCount > 0 : session.completedCount === session.missionCount;

/**
 * Calculate current streak (consecutive days meeting the streak bar above).
 */
export const calculateStreak = (includeSkips = isStreakIncludingSkips()) => {
  const history = loadHistory();
  if (history.length === 0) return 0;

  const completed = history.filter((s) => sessionCountsForStreak(s, includeSkips));
  if (completed.length === 0) return 0;

  // Get unique dates sorted descending
  const dates = [...new Set(completed.map((s) => s.date))].sort().reverse();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let streak = 0;
  // Day offset the next session in the run must land on. Seeded from the most
  // recent session so a streak survives until a full day is missed: finishing
  // yesterday but not yet today still counts.
  let expectedOffset = null;

  for (const dateStr of dates) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const sessionDate = new Date(year, month - 1, day);
    // Rounded, not floored: DST turns some day boundaries into 23 or 25 hours.
    const diffDays = Math.round((today - sessionDate) / (1000 * 60 * 60 * 24));

    if (expectedOffset === null) {
      if (diffDays > 1) break; // the run already lapsed
      expectedOffset = diffDays;
    }

    if (diffDays !== expectedOffset) break;

    streak++;
    expectedOffset++;
  }

  return streak;
};

/**
 * Update and persist streak
 */
export const updateStreak = () => {
  const streak = calculateStreak();
  const stats = loadStats();
  stats.currentStreak = streak;
  stats.maxStreak = Math.max(stats.maxStreak || 0, streak);
  saveStats(stats);
  return streak;
};

/**
 * Get user statistics
 */
const emptyStats = () => ({
  totalSessions: 0,
  completedSessions: 0,
  totalTime: 0,
  currentStreak: 0,
  maxStreak: 0,
  totalMissionsCompleted: 0,
  averageCompletionRate: 0,
  lastSessionDate: null
});

export const loadStats = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_STATS);
    // Must be parsed: returning the raw string made every caller that assigned
    // a property to it throw, which kept streaks and stats permanently at zero.
    return stored ? { ...emptyStats(), ...JSON.parse(stored) } : emptyStats();
  } catch (error) {
    console.error('Failed to load stats:', error);
    return emptyStats();
  }
};

/**
 * Save statistics
 */
export const saveStats = (stats) => {
  try {
    const parsed = typeof stats === 'string' ? JSON.parse(stats) : stats;
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(parsed));
  } catch (error) {
    console.error('Failed to save stats:', error);
  }
};

/**
 * Update statistics after session completion
 */
export const updateStats = () => {
  try {
    const stats = loadStats();
    const history = loadHistory();

    stats.totalSessions = history.length;
    stats.completedSessions = history.filter(
      (s) => s.completedCount === s.missionCount
    ).length;
    stats.totalTime = history.reduce((sum, s) => sum + (s.totalTime || 0), 0);
    stats.totalMissionsCompleted = history.reduce(
      (sum, s) => sum + s.completedCount,
      0
    );
    stats.averageCompletionRate = stats.totalSessions
      ? ((stats.completedSessions / stats.totalSessions) * 100).toFixed(1)
      : 0;
    stats.lastSessionDate = new Date().toISOString();

    saveStats(stats);
    return stats;
  } catch (error) {
    console.error('Failed to update stats:', error);
    return null;
  }
};

/**
 * Get achievements/badges based on history
 */
export const getAchievements = () => {
  const history = loadHistory();
  const stats = loadStats();
  const streak = calculateStreak();
  const achievements = [];

  // Badge: First Clean
  if (history.length >= 1) {
    achievements.push({
      id: 'first_clean',
      name: 'First Clean',
      description: 'Finished your first session',
      icon: '🎯',
      unlockedAt: history[0]?.timestamp
    });
  }

  // Badge: Speed Demon (session < 5 minutes)
  if (history.some((s) => s.totalTime < 300)) {
    const first = history.find((s) => s.totalTime < 300);
    achievements.push({
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Wrapped up a session in under 5 minutes',
      icon: '⚡',
      unlockedAt: first?.timestamp
    });
  }

  // Badge: Patient (session > 30 minutes)
  if (history.some((s) => s.totalTime > 1800)) {
    const first = history.find((s) => s.totalTime > 1800);
    achievements.push({
      id: 'patient',
      name: 'Patient',
      description: 'Stuck with one session for 30+ minutes',
      icon: '🧘',
      unlockedAt: first?.timestamp
    });
  }

  // Badge: Week Warrior (7-day streak)
  if (streak >= 7) {
    achievements.push({
      id: 'week_warrior',
      name: 'Week Warrior',
      description: 'Cleared every mission, 7 days in a row',
      icon: '🔥',
      unlockedAt: Date.now()
    });
  }

  // Badge: Unstoppable (14-day streak)
  if (streak >= 14) {
    achievements.push({
      id: 'unstoppable',
      name: 'Unstoppable',
      description: 'Cleared every mission, 14 days in a row',
      icon: '💪',
      unlockedAt: Date.now()
    });
  }

  // Badge: Completionist (10 completed sessions)
  if (stats.completedSessions >= 10) {
    achievements.push({
      id: 'completionist',
      name: 'Completionist',
      description: 'Cleared every mission in 10 sessions',
      icon: '✨',
      unlockedAt: Date.now()
    });
  }

  // Badge: Time Master (10+ hours total)
  if (stats.totalTime >= 36000) {
    achievements.push({
      id: 'time_master',
      name: 'Time Master',
      description: '10 hours of cleaning, all added up',
      icon: '⏰',
      unlockedAt: Date.now()
    });
  }

  // Badge: All-Star (100+ missions completed)
  if (stats.totalMissionsCompleted >= 100) {
    achievements.push({
      id: 'all_star',
      name: 'All-Star',
      description: '100 missions done',
      icon: '⭐',
      unlockedAt: Date.now()
    });
  }

  return achievements;
};

/**
 * Clear all history (for testing or user reset)
 */
export const clearHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    localStorage.removeItem(STORAGE_KEY_STATS);
    localStorage.removeItem(STORAGE_KEY_LAST_SESSION_DATE);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
};

/**
 * Get summary stats for display
 */
export const getStatsSummary = () => {
  const stats = loadStats();
  const streak = calculateStreak();
  const achievements = getAchievements();

  return {
    totalSessions: stats.totalSessions || 0,
    completedSessions: stats.completedSessions || 0,
    totalTime: stats.totalTime || 0,
    totalMissionsCompleted: stats.totalMissionsCompleted || 0,
    completionRate: stats.averageCompletionRate || '0',
    currentStreak: streak,
    maxStreak: stats.maxStreak || 0,
    achievements: achievements.length,
    unlockedAchievements: achievements
  };
};
