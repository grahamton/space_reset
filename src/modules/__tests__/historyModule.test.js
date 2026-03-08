import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveSessionToHistory,
  loadHistory,
  calculateStreak,
  getAchievements,
  updateStats,
  getStatsSummary
} from '../historyModule';

describe('historyModule', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Session History', () => {
    it('should save session to history', () => {
      const session = {
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 5,
        totalTime: 600
      };

      saveSessionToHistory(session);
      const history = loadHistory();

      expect(history.length).toBe(1);
      expect(history[0]).toMatchObject(session);
      expect(history[0].id).toBeDefined();
      expect(history[0].timestamp).toBeDefined();
    });

    it('should load empty history when none exists', () => {
      const history = loadHistory();
      expect(history).toEqual([]);
    });

    it('should save multiple sessions', () => {
      for (let i = 0; i < 3; i++) {
        saveSessionToHistory({
          personaId: 'gentle',
          missionCount: 5,
          completedCount: 5,
          totalTime: 600
        });
      }

      const history = loadHistory();
      expect(history.length).toBe(3);
    });
  });

  describe('Streak Calculation', () => {
    it('should calculate 0 streak with no sessions', () => {
      const streak = calculateStreak();
      expect(streak).toBe(0);
    });

    it('should calculate 1 streak with 1 completed session today', () => {
      const today = new Date().toISOString().split('T')[0];
      saveSessionToHistory({
        date: today,
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 5,
        totalTime: 600
      });

      const streak = calculateStreak();
      expect(streak).toBe(1);
    });

    it('should break streak if day is missed', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const twodays = new Date();
      twodays.setDate(twodays.getDate() - 2);
      const twodaysStr = twodays.toISOString().split('T')[0];

      // Save 2 days ago
      saveSessionToHistory({
        date: twodaysStr,
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 5,
        totalTime: 600
      });

      // Streak should be 0 because yesterday is missing
      const streak = calculateStreak();
      expect(streak).toBe(0);
    });

    it('should ignore incomplete sessions in streak', () => {
      const today = new Date().toISOString().split('T')[0];
      saveSessionToHistory({
        date: today,
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 2, // Not completed
        totalTime: 600
      });

      const streak = calculateStreak();
      expect(streak).toBe(0);
    });
  });

  describe('Achievements', () => {
    it('should unlock "First Clean" achievement', () => {
      saveSessionToHistory({
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 5,
        totalTime: 600
      });

      const achievements = getAchievements();
      const firstClean = achievements.find((a) => a.id === 'first_clean');

      expect(firstClean).toBeDefined();
      expect(firstClean.name).toBe('First Clean');
    });

    it('should unlock "Speed Demon" achievement', () => {
      saveSessionToHistory({
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 5,
        totalTime: 250 // 4:10 - under 5 min
      });

      const achievements = getAchievements();
      const speedDemon = achievements.find((a) => a.id === 'speed_demon');

      expect(speedDemon).toBeDefined();
    });

    it('should unlock "Patient" achievement', () => {
      saveSessionToHistory({
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 5,
        totalTime: 2000 // 33 min - over 30 min
      });

      const achievements = getAchievements();
      const patient = achievements.find((a) => a.id === 'patient');

      expect(patient).toBeDefined();
    });

    it('should unlock streak achievements', () => {
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        saveSessionToHistory({
          date: dateStr,
          personaId: 'gentle',
          missionCount: 5,
          completedCount: 5,
          totalTime: 600
        });
      }

      const achievements = getAchievements();
      const weekWarrior = achievements.find((a) => a.id === 'week_warrior');

      expect(weekWarrior).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should update stats correctly', () => {
      saveSessionToHistory({
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 5,
        totalTime: 600
      });

      updateStats(5, 5, 600);
      const stats = getStatsSummary();

      expect(stats.totalSessions).toBe(1);
      expect(stats.completedSessions).toBe(1);
      expect(stats.totalTime).toBe(600);
      expect(stats.completionRate).toBe('100.0');
    });

    it('should calculate completion rate', () => {
      // 1 completed, 1 incomplete
      saveSessionToHistory({
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 5,
        totalTime: 600
      });

      saveSessionToHistory({
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 3,
        totalTime: 400
      });

      updateStats(5, 5, 600);
      const stats = getStatsSummary();

      expect(stats.completedSessions).toBe(1);
      expect(stats.totalSessions).toBe(2);
    });

    it('should track total missions completed', () => {
      saveSessionToHistory({
        personaId: 'gentle',
        missionCount: 5,
        completedCount: 5,
        totalTime: 600
      });

      saveSessionToHistory({
        personaId: 'gentle',
        missionCount: 6,
        completedCount: 4,
        totalTime: 500
      });

      updateStats(4, 6, 500);
      const stats = getStatsSummary();

      expect(stats.totalMissionsCompleted).toBe(9);
    });
  });
});
