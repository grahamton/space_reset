import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useMissionControl } from '../App';
import { saveSessionToHistory, updateStats } from '../modules/historyModule';
import { visionModule } from '../modules/visionModule';

vi.mock('../modules/historyModule', () => ({
  saveSessionToHistory: vi.fn(),
  updateStats: vi.fn(),
  loadStats: vi.fn(() => ({ currentStreak: 0 }))
}));

vi.mock('../modules/visionModule', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, visionModule: { analyzeImage: vi.fn() } };
});

const mission = (id, type = 'trash') => ({
  id,
  title: `Mission ${id}`,
  description: 'do the thing',
  time: 120,
  type,
  strategy: 'just start'
});

const PREFS = { personaId: 'gentle', roomType: 'bedroom', difficulty: 'medium' };

const startWith = async (missions, status = 'ok', note = null) => {
  visionModule.analyzeImage.mockResolvedValue({ status, note, missions });
  const hook = renderHook(() => useMissionControl(PREFS));
  await act(async () => {
    await hook.result.current.startAnalysis(new File([''], 'room.jpg', { type: 'image/jpeg' }));
  });
  return hook;
};

describe('useMissionControl', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts idle with an empty queue', () => {
    const { result } = renderHook(() => useMissionControl(PREFS));

    expect(result.current.sessionState.status).toBe('idle');
    expect(result.current.getCurrentMission()).toBeNull();
  });

  it('goes active with the returned missions', async () => {
    const { result } = await startWith([mission('a'), mission('b')]);

    expect(result.current.sessionState.status).toBe('active');
    expect(result.current.sessionState.missionQueue).toHaveLength(2);
    expect(result.current.getCurrentMission().id).toBe('a');
  });

  it('surfaces the failure reason instead of silently using fallback missions', async () => {
    visionModule.analyzeImage.mockRejectedValue(new Error('Too many requests right now.'));
    const { result } = renderHook(() => useMissionControl(PREFS));

    await act(async () => {
      await result.current.startAnalysis(new File([''], 'room.jpg', { type: 'image/jpeg' }));
    });

    expect(result.current.sessionState.status).toBe('idle');
    expect(result.current.sessionState.error).toBe('Too many requests right now.');
    expect(result.current.sessionState.missionQueue).toHaveLength(0);
  });

  it('advances on complete and finishes the session on the last one', async () => {
    const { result } = await startWith([mission('a'), mission('b')]);

    act(() => result.current.completeCurrentMission());
    expect(result.current.sessionState.status).toBe('active');
    expect(result.current.getCurrentMission().id).toBe('b');

    act(() => result.current.completeCurrentMission());
    expect(result.current.sessionState.status).toBe('complete');
    expect(result.current.sessionState.completedCount).toBe(2);
  });

  it('records the session to history exactly once on completion', async () => {
    const { result } = await startWith([mission('a')]);

    act(() => result.current.completeCurrentMission());

    expect(saveSessionToHistory).toHaveBeenCalledTimes(1);
    expect(saveSessionToHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: 'gentle',
        roomType: 'bedroom',
        difficulty: 'medium',
        missionCount: 1,
        completedCount: 1
      })
    );
    expect(updateStats).toHaveBeenCalledTimes(1);
  });

  it('defers a skipped mission to the back of the queue', async () => {
    const { result } = await startWith([mission('a'), mission('b'), mission('c')]);

    act(() => result.current.skipCurrentMission());

    expect(result.current.sessionState.missionQueue.map((m) => m.id)).toEqual(['b', 'c', 'a']);
    expect(result.current.getCurrentMission().id).toBe('b');
    expect(result.current.sessionState.status).toBe('active');
  });

  // Regression: skipping rotated the queue without advancing the index, so the
  // last mission could be deferred forever and 'complete' was unreachable.
  it('ends the session once every remaining mission has been skipped', async () => {
    const { result } = await startWith([mission('a'), mission('b')]);

    act(() => result.current.skipCurrentMission());
    expect(result.current.sessionState.status).toBe('active');

    act(() => result.current.skipCurrentMission());
    expect(result.current.sessionState.status).toBe('complete');
  });

  it('ends immediately when the only remaining mission is skipped', async () => {
    const { result } = await startWith([mission('a')]);

    act(() => result.current.skipCurrentMission());

    expect(result.current.sessionState.status).toBe('complete');
  });

  it('gives the deferred missions another chance after any progress', async () => {
    const { result } = await startWith([mission('a'), mission('b'), mission('c')]);

    act(() => result.current.skipCurrentMission()); // a deferred
    act(() => result.current.completeCurrentMission()); // b done, skips reset

    expect(result.current.sessionState.consecutiveSkips).toBe(0);

    act(() => result.current.skipCurrentMission());
    expect(result.current.sessionState.status).toBe('active');
  });

  it('restores a saved session and clears it on reset', async () => {
    const { result } = await startWith([mission('a'), mission('b')]);
    act(() => result.current.completeCurrentMission());

    const { result: restored } = renderHook(() => useMissionControl(PREFS));
    expect(restored.current.sessionState.completedCount).toBe(1);
    expect(restored.current.getCurrentMission().id).toBe('b');

    act(() => restored.current.resetSession());
    expect(restored.current.sessionState.status).toBe('idle');
    expect(localStorage.getItem('session_state')).toBeNull();
  });

  it('can start an offline session with the built-in missions', async () => {
    const { result } = renderHook(() => useMissionControl(PREFS));

    act(() => result.current.startFallbackSession());

    expect(result.current.sessionState.status).toBe('active');
    expect(result.current.sessionState.missionQueue.length).toBeGreaterThan(0);
  });

  it('keeps the persona note in session state for an ok session', async () => {
    const { result } = await startWith([mission('a')], 'ok', 'Alright, let’s move.');

    expect(result.current.sessionState.status).toBe('active');
    expect(result.current.sessionState.note).toBe('Alright, let’s move.');
  });

  it('does not start a session on retake; surfaces the note as info, not an error', async () => {
    const note = 'Too blurry to see. Try again from the doorway.';
    const { result } = await startWith([], 'retake', note);

    expect(result.current.sessionState.status).toBe('idle');
    expect(result.current.sessionState.info).toBe(note);
    expect(result.current.sessionState.error).toBeNull();
    expect(result.current.sessionState.missionQueue).toHaveLength(0);
  });

  it('treats a tidy room with no missions like retake: back to idle with the note', async () => {
    const note = 'Already looking good in here.';
    const { result } = await startWith([], 'tidy', note);

    expect(result.current.sessionState.status).toBe('idle');
    expect(result.current.sessionState.info).toBe(note);
    expect(result.current.sessionState.missionQueue).toHaveLength(0);
  });

  it('starts a real session for a tidy room with a couple of small missions', async () => {
    const note = 'Nice, just a couple of resets.';
    const { result } = await startWith([mission('a')], 'tidy', note);

    expect(result.current.sessionState.status).toBe('active');
    expect(result.current.sessionState.note).toBe(note);
    expect(result.current.sessionState.missionQueue).toHaveLength(1);
  });
});
