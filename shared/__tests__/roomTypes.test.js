import { describe, it, expect } from 'vitest';

import {
  DIFFICULTY_LEVELS,
  MISSION_COUNT_CHOICES,
  DEFAULT_MISSION_COUNT,
  MISSION_COUNT_MIN,
  MISSION_COUNT_MAX,
  normalizeMissionCount
} from '../roomTypes.js';

describe('difficulty', () => {
  it('no longer carries a mission count — that is a separate setting', () => {
    for (const level of Object.values(DIFFICULTY_LEVELS)) {
      expect(level).not.toHaveProperty('missionCount');
      expect(level.description).not.toMatch(/\d+ missions?/i);
    }
  });
});

describe('normalizeMissionCount', () => {
  it('passes "auto" through', () => {
    expect(normalizeMissionCount('auto')).toBe('auto');
  });

  it('defaults missing or nullish values to auto', () => {
    expect(normalizeMissionCount(undefined)).toBe(DEFAULT_MISSION_COUNT);
    expect(normalizeMissionCount(null)).toBe(DEFAULT_MISSION_COUNT);
  });

  it('accepts integers in range, including as numeric strings', () => {
    expect(normalizeMissionCount(1)).toBe(1);
    expect(normalizeMissionCount(8)).toBe(8);
    expect(normalizeMissionCount('3')).toBe(3);
  });

  it('falls back to auto for anything out of range or malformed', () => {
    expect(normalizeMissionCount(0)).toBe('auto');
    expect(normalizeMissionCount(9)).toBe('auto');
    expect(normalizeMissionCount(-1)).toBe('auto');
    expect(normalizeMissionCount(2.5)).toBe('auto');
    expect(normalizeMissionCount('banana')).toBe('auto');
    expect(normalizeMissionCount({})).toBe('auto');
  });

  it('keeps MISSION_COUNT_MIN/MAX consistent with the schema cap', () => {
    expect(MISSION_COUNT_MIN).toBe(1);
    expect(MISSION_COUNT_MAX).toBe(8);
  });

  it('exposes chip choices bounded by min/max, plus auto', () => {
    expect(MISSION_COUNT_CHOICES[0]).toBe('auto');
    for (const choice of MISSION_COUNT_CHOICES.slice(1)) {
      expect(choice).toBeGreaterThanOrEqual(MISSION_COUNT_MIN);
      expect(choice).toBeLessThanOrEqual(MISSION_COUNT_MAX);
    }
  });
});
