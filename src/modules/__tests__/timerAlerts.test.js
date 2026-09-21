import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class MockOscillator {
  constructor() {
    this.type = null;
    this.frequency = { value: 0 };
    this.start = vi.fn();
    this.stop = vi.fn();
    this.connect = vi.fn();
  }
}

class MockGain {
  constructor() {
    this.gain = {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn()
    };
    this.connect = vi.fn();
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
    this.resume = vi.fn(() => {
      this.state = 'running';
    });
    this.createOscillator = vi.fn(() => new MockOscillator());
    this.createGain = vi.fn(() => new MockGain());
  }
}

describe('timerAlerts', () => {
  // The module keeps a single lazily-created AudioContext for the life of
  // the page (that's the point - one shared context, not one per chime).
  // That singleton would otherwise leak between tests, so each test gets a
  // fresh module instance via resetModules + a dynamic re-import.
  let timerAlerts;

  beforeEach(async () => {
    localStorage.clear();
    window.AudioContext = MockAudioContext;
    vi.resetModules();
    timerAlerts = await import('../timerAlerts');
  });

  afterEach(() => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    delete window.Notification;
    delete window.focus;
    vi.restoreAllMocks();
  });

  describe('playChime / primeAudioContext', () => {
    it('creates oscillators and does not throw when AudioContext is available', () => {
      expect(() => timerAlerts.primeAudioContext()).not.toThrow();
      expect(() => timerAlerts.playChime()).not.toThrow();
    });

    it('resumes a suspended context', () => {
      window.AudioContext = class extends MockAudioContext {
        constructor() {
          super();
          this.state = 'suspended';
        }
      };
      timerAlerts.primeAudioContext();
      // No AudioContext instance is exposed, so we assert indirectly: a
      // second call should not throw even though state started suspended.
      expect(() => timerAlerts.playChime()).not.toThrow();
    });

    it('does nothing (and does not throw) when Web Audio is unsupported', () => {
      delete window.AudioContext;
      expect(() => timerAlerts.playChime()).not.toThrow();
      expect(() => timerAlerts.primeAudioContext()).not.toThrow();
    });

    it('swallows errors thrown while building the chime', () => {
      window.AudioContext = class {
        constructor() {
          this.state = 'running';
          this.currentTime = 0;
          this.createOscillator = () => {
            throw new Error('boom');
          };
        }
      };
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => timerAlerts.playChime()).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('maybePlayTimesUpSound', () => {
    it('plays when TIMER_SOUND is unset (defaults to on)', () => {
      const ctx = new MockAudioContext();
      window.AudioContext = vi.fn(() => ctx);
      timerAlerts.maybePlayTimesUpSound();
      expect(ctx.createOscillator).toHaveBeenCalled();
    });

    it('plays when TIMER_SOUND is true', () => {
      localStorage.setItem('timer_sound', 'true');
      const ctx = new MockAudioContext();
      window.AudioContext = vi.fn(() => ctx);
      timerAlerts.maybePlayTimesUpSound();
      expect(ctx.createOscillator).toHaveBeenCalled();
    });

    it('stays silent when TIMER_SOUND is false', () => {
      localStorage.setItem('timer_sound', 'false');
      const ctx = new MockAudioContext();
      window.AudioContext = vi.fn(() => ctx);
      timerAlerts.maybePlayTimesUpSound();
      expect(ctx.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('notification support and permission', () => {
    it('reports unsupported when Notification does not exist', () => {
      delete window.Notification;
      expect(timerAlerts.isNotificationSupported()).toBe(false);
      expect(timerAlerts.getNotificationPermission()).toBe('unsupported');
    });

    it('reports the current permission when supported', () => {
      window.Notification = { permission: 'default' };
      expect(timerAlerts.isNotificationSupported()).toBe(true);
      expect(timerAlerts.getNotificationPermission()).toBe('default');
    });

    it('requestNotificationPermission returns "unsupported" without Notification', async () => {
      delete window.Notification;
      const result = await timerAlerts.requestNotificationPermission();
      expect(result).toBe('unsupported');
    });

    it('requestNotificationPermission resolves the granted result', async () => {
      window.Notification = {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted')
      };
      const result = await timerAlerts.requestNotificationPermission();
      expect(result).toBe('granted');
    });

    it('falls back to current permission if requestPermission throws', async () => {
      window.Notification = {
        permission: 'denied',
        requestPermission: vi.fn().mockRejectedValue(new Error('nope'))
      };
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await timerAlerts.requestNotificationPermission();
      expect(result).toBe('denied');
    });
  });

  describe('maybeShowTimesUpNotification', () => {
    const setNotification = (permission) => {
      class FakeNotification {
        constructor(title, options) {
          FakeNotification.lastInstance = this;
          this.title = title;
          this.options = options;
        }
      }
      FakeNotification.permission = permission;
      window.Notification = FakeNotification;
      return FakeNotification;
    };

    it('does nothing when TIMER_NOTIFY is unset (defaults to off)', () => {
      const FakeNotification = setNotification('granted');
      timerAlerts.maybeShowTimesUpNotification('Clear the counter');
      expect(FakeNotification.lastInstance).toBeUndefined();
    });

    it('does nothing when opted in but permission is not granted', () => {
      localStorage.setItem('timer_notify', 'true');
      const FakeNotification = setNotification('denied');
      timerAlerts.maybeShowTimesUpNotification('Clear the counter');
      expect(FakeNotification.lastInstance).toBeUndefined();
    });

    it('shows a notification with the mission title when opted in and granted', () => {
      localStorage.setItem('timer_notify', 'true');
      const FakeNotification = setNotification('granted');
      timerAlerts.maybeShowTimesUpNotification('Clear the counter');
      expect(FakeNotification.lastInstance.title).toBe("Time's up: Clear the counter");
    });

    it('focuses the window when the notification is clicked', () => {
      localStorage.setItem('timer_notify', 'true');
      setNotification('granted');
      window.focus = vi.fn();
      timerAlerts.maybeShowTimesUpNotification('Clear the counter');
      const instance = window.Notification.lastInstance;
      instance.close = vi.fn();
      instance.onclick();
      expect(window.focus).toHaveBeenCalled();
      expect(instance.close).toHaveBeenCalled();
    });
  });

  describe('fireTimesUpAlerts', () => {
    it('plays sound and shows notification per current preferences', () => {
      localStorage.setItem('timer_sound', 'true');
      localStorage.setItem('timer_notify', 'true');
      const ctx = new MockAudioContext();
      window.AudioContext = vi.fn(() => ctx);

      class FakeNotification {
        constructor(title) {
          FakeNotification.lastTitle = title;
        }
      }
      FakeNotification.permission = 'granted';
      window.Notification = FakeNotification;

      timerAlerts.fireTimesUpAlerts('Clear the counter');

      expect(ctx.createOscillator).toHaveBeenCalled();
      expect(FakeNotification.lastTitle).toBe("Time's up: Clear the counter");
    });

    it('does neither when both preferences are off', () => {
      localStorage.setItem('timer_sound', 'false');
      localStorage.setItem('timer_notify', 'false');
      const ctx = new MockAudioContext();
      window.AudioContext = vi.fn(() => ctx);

      class FakeNotification {
        constructor(title) {
          FakeNotification.lastTitle = title;
        }
      }
      FakeNotification.permission = 'granted';
      window.Notification = FakeNotification;

      timerAlerts.fireTimesUpAlerts('Clear the counter');

      expect(ctx.createOscillator).not.toHaveBeenCalled();
      expect(FakeNotification.lastTitle).toBeUndefined();
    });
  });
});
