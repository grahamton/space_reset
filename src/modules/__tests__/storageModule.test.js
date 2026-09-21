import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveSession,
  loadSession,
  clearSession,
  hasSession,
  saveTimer,
  loadTimer
} from '../storageModule';

describe('storageModule', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Session Persistence', () => {
    it('should save and load a session', () => {
      const sessionData = {
        status: 'active',
        missionQueue: [{ id: 'm1', title: 'Test' }],
        currentMissionIndex: 0,
        completedCount: 0,
        error: null
      };

      saveSession(sessionData);
      const loaded = loadSession();

      expect(loaded).toEqual(expect.objectContaining(sessionData));
      expect(loaded.savedAt).toBeDefined();
    });

    it('should return null when no session exists', () => {
      const loaded = loadSession();
      expect(loaded).toBeNull();
    });

    it('should clear session data', () => {
      const sessionData = {
        status: 'active',
        missionQueue: [{ id: 'm1' }],
        currentMissionIndex: 0,
        completedCount: 0,
        error: null
      };

      saveSession(sessionData);
      clearSession();

      const loaded = loadSession();
      expect(loaded).toBeNull();
    });

    it('should detect if session exists', () => {
      expect(hasSession()).toBeFalsy();

      saveSession({
        status: 'active',
        missionQueue: [{ id: 'm1' }],
        currentMissionIndex: 0,
        completedCount: 0,
        error: null
      });

      expect(hasSession()).toBeTruthy();
    });

    it('should expire old sessions', () => {
      const oldSession = {
        status: 'active',
        missionQueue: [{ id: 'm1' }],
        currentMissionIndex: 0,
        completedCount: 0,
        error: null,
        savedAt: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      };

      localStorage.setItem('session_state', JSON.stringify(oldSession));

      const loaded = loadSession();
      expect(loaded).toBeNull();
    });
  });

  describe('Timer State', () => {
    const MISSION = 'm1';

    const seedTimer = (state) =>
      localStorage.setItem('timer_state', JSON.stringify({ missionId: MISSION, ...state }));

    it('should save and load timer state', () => {
      saveTimer(MISSION, 120, false);
      const { timeLeft, isActive } = loadTimer(MISSION);

      expect(timeLeft).toBe(120);
      expect(isActive).toBeFalsy();
    });

    it('should return null when no timer saved', () => {
      expect(loadTimer(MISSION)).toBeNull();
    });

    it('should not return another mission\'s timer', () => {
      saveTimer(MISSION, 120, true);

      // Regression: a single shared key meant a paused timer from one mission
      // was restored onto the next one instead of its own time box.
      expect(loadTimer('m2')).toBeNull();
    });

    it('should calculate time decay for active timer', () => {
      const startTime = 120;
      seedTimer({ timeLeft: startTime, isActive: true, savedAt: Date.now() - 30000 });

      const { timeLeft } = loadTimer(MISSION);

      // Should have lost ~30 seconds
      expect(timeLeft).toBeLessThanOrEqual(startTime - 29);
      expect(timeLeft).toBeGreaterThanOrEqual(startTime - 31);
    });

    it('should not decay paused timer', () => {
      const startTime = 120;
      seedTimer({ timeLeft: startTime, isActive: false, savedAt: Date.now() - 30000 });

      expect(loadTimer(MISSION).timeLeft).toBe(startTime);
    });

    it('should not return negative time', () => {
      seedTimer({ timeLeft: 60, isActive: true, savedAt: Date.now() - 200000 });

      const { timeLeft, isActive } = loadTimer(MISSION);
      expect(timeLeft).toBe(0);
      expect(isActive).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted session data gracefully', () => {
      localStorage.setItem('session_state', 'invalid json');
      const loaded = loadSession();

      expect(loaded).toBeNull();
    });

    it('should handle corrupted timer data gracefully', () => {
      localStorage.setItem('timer_state', 'invalid json');

      expect(loadTimer('m1')).toBeNull();
    });

    it('should not throw on clear when storage is empty', () => {
      expect(() => clearSession()).not.toThrow();
    });
  });
});
