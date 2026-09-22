import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { visionModule, getFallbackMissions, DEFAULT_FALLBACK_DATA } from '../visionModule';

const file = () => new File(['x'], 'room.jpg', { type: 'image/jpeg' });

const jsonResponse = (body, ok = true) => ({
  ok,
  json: async () => body
});

describe('visionModule.analyzeImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns status, note and missions for an ok response', async () => {
    fetch.mockResolvedValue(
      jsonResponse({
        status: 'ok',
        note: 'Alright, let’s move.',
        missions: [{ id: 'm1', title: 'Dish Dash', type: 'dishes', time: 60 }]
      })
    );

    const result = await visionModule.analyzeImage(file(), { personaId: 'gentle' });

    expect(result.status).toBe('ok');
    expect(result.note).toBe('Alright, let’s move.');
    expect(result.missions).toHaveLength(1);
  });

  it('does not throw the "no missions" error for a retake with an empty mission list', async () => {
    fetch.mockResolvedValue(
      jsonResponse({
        status: 'retake',
        note: 'Too blurry to see. Try again from the doorway.',
        missions: []
      })
    );

    const result = await visionModule.analyzeImage(file(), { personaId: 'gentle' });

    expect(result.status).toBe('retake');
    expect(result.missions).toEqual([]);
  });

  it('does not throw for a tidy room with an empty mission list', async () => {
    fetch.mockResolvedValue(
      jsonResponse({ status: 'tidy', note: 'Already looking good.', missions: [] })
    );

    const result = await visionModule.analyzeImage(file(), { personaId: 'gentle' });

    expect(result.status).toBe('tidy');
    expect(result.missions).toEqual([]);
  });

  it('still throws when status is ok but missions came back empty', async () => {
    fetch.mockResolvedValue(jsonResponse({ status: 'ok', note: '', missions: [] }));

    await expect(visionModule.analyzeImage(file(), { personaId: 'gentle' })).rejects.toThrow(
      /couldn't find any missions/i
    );
  });

  it('surfaces the server error message on a non-ok response', async () => {
    fetch.mockResolvedValue(jsonResponse({ error: 'That photo is too large.' }, false));

    await expect(visionModule.analyzeImage(file(), { personaId: 'gentle' })).rejects.toThrow(
      'That photo is too large.'
    );
  });
});

describe('getFallbackMissions', () => {
  it('reports status ok with a neutral (empty) note', () => {
    const result = getFallbackMissions('medium', 'auto');

    expect(result.status).toBe('ok');
    expect(result.note).toBe(DEFAULT_FALLBACK_DATA.note);
    expect(result.missions.length).toBeGreaterThan(0);
  });
});
