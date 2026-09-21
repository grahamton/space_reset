import { describe, it, expect } from 'vitest';

import {
  buildMissionPrompt,
  getDifficultyPromptAddition,
  getRoomTypePromptAddition,
  getMissionCountInstruction
} from '../prompt.js';
import { PERSONAS, DEFAULT_PERSONA } from '../personas.js';
import { DIFFICULTY_LEVELS, MISSION_TYPES, getAllDifficulties } from '../roomTypes.js';

describe('buildMissionPrompt', () => {
  it('defaults to letting the photo decide the count, roughly 3 to 6', () => {
    const prompt = buildMissionPrompt();
    expect(prompt).toMatch(/roughly 3 to 6/);
    expect(prompt).not.toMatch(/up to \d+ cleaning missions/);
  });

  it('lets the photo decide when missionCount is explicitly "auto"', () => {
    const prompt = buildMissionPrompt({ missionCount: 'auto' });
    expect(getMissionCountInstruction('auto')).toMatch(/Let the photo decide how many/);
    expect(prompt).toMatch(/roughly 3 to 6/);
  });

  it('asks for up to a fixed number when a mission count is given', () => {
    for (const n of [1, 3, 8]) {
      const prompt = buildMissionPrompt({ missionCount: n });
      expect(prompt).toContain(`up to ${n} cleaning missions`);
      expect(getMissionCountInstruction(n)).toContain(`up to ${n} cleaning missions`);
    }
  });

  it('keeps mission count independent of difficulty', () => {
    for (const { id } of getAllDifficulties()) {
      const prompt = buildMissionPrompt({ difficulty: id, missionCount: 4 });
      expect(prompt).toContain('up to 4 cleaning missions');
    }
  });

  it('caps time boxes at the configured timePerMission for every difficulty', () => {
    for (const { id, timePerMission } of getAllDifficulties()) {
      const prompt = buildMissionPrompt({ difficulty: id });
      expect(prompt).toContain(`Never exceed ${timePerMission} seconds`);
      expect(getDifficultyPromptAddition(id)).toContain(`${timePerMission / 60} minutes`);
    }
  });

  it('defines every mission type, so none render as undefined', () => {
    const prompt = buildMissionPrompt();
    for (const type of MISSION_TYPES) {
      expect(prompt).toMatch(new RegExp(`^- ${type}: \\S`, 'm'));
    }
    expect(prompt).not.toContain('undefined');
  });

  it('steers length, grounding and ordering', () => {
    const prompt = buildMissionPrompt();
    expect(prompt).toMatch(/title: 2 to 6 words/);
    expect(prompt).toMatch(/about 25 words at most/);
    expect(prompt).toMatch(/Do not invent items/);
    expect(prompt).toMatch(/quickest visible win comes first/);
  });

  it('covers non-room photos, tidy rooms and people in frame', () => {
    const prompt = buildMissionPrompt();
    expect(prompt).toMatch(/not a room at all/);
    expect(prompt).toMatch(/status is "retake"/);
    expect(prompt).toMatch(/Already tidy/);
    expect(prompt).toMatch(/status is "tidy"/);
    expect(prompt).toMatch(/Missions are about the room only/);
  });

  it('gives note-writing guidance for each status, without duplicating mission content', () => {
    const prompt = buildMissionPrompt();
    expect(prompt).toMatch(/## The note/);
    expect(prompt).toMatch(/about 20 words max/);
    expect(prompt).toMatch(/never mention anyone visible in the photo/);
  });

  it('treats the room type as a hint and omits it for "other"', () => {
    expect(getRoomTypePromptAddition('kitchen')).toMatch(/kitchen/);
    expect(getRoomTypePromptAddition('kitchen')).toMatch(/trust the photo/);
    expect(getRoomTypePromptAddition('other')).toBe('');
    expect(buildMissionPrompt({ roomType: 'other' })).not.toContain('## Room type');
  });

  it('keeps the easy/medium/hard wording distinct', () => {
    expect(getDifficultyPromptAddition('easy')).toMatch(/too easy/);
    expect(getDifficultyPromptAddition('medium')).toMatch(/balanced/);
    expect(getDifficultyPromptAddition('hard')).toMatch(/ambitious/);
    expect(Object.keys(DIFFICULTY_LEVELS)).toEqual(['easy', 'medium', 'hard']);
  });
});

describe('personas', () => {
  it('keeps ids stable and matching their keys', () => {
    expect(Object.keys(PERSONAS)).toEqual([
      'gentle',
      'drillSergeant',
      'roastMaster',
      'bestie',
      'existentialDread'
    ]);
    for (const [key, persona] of Object.entries(PERSONAS)) {
      expect(persona.id).toBe(key);
      expect(persona.name).toBeTruthy();
    }
    expect(PERSONAS[DEFAULT_PERSONA]).toBeDefined();
  });

  it('gives every persona the shared ADHD-aware guardrails', () => {
    for (const { systemInstruction } of Object.values(PERSONAS)) {
      expect(systemInstruction).toMatch(/ADHD/);
      expect(systemInstruction).toMatch(/Never shame them for the mess existing/);
      expect(systemInstruction).toMatch(/Never comment on their body/);
      expect(systemInstruction).toMatch(/No pet names/);
    }
  });

  it('keeps persona-specific guardrails in place', () => {
    expect(PERSONAS.roastMaster.systemInstruction).toMatch(/Roast the mess, never the person/);
    expect(PERSONAS.drillSergeant.systemInstruction).toMatch(/never abusive/);
    expect(PERSONAS.bestie.systemInstruction).toMatch(/Gender-neutral by default/);
    expect(PERSONAS.existentialDread.systemInstruction).toMatch(/never actually bleak/);
  });

  it('drops the old shame-based and gendered stock phrases', () => {
    const all = Object.values(PERSONAS)
      .map((p) => p.systemInstruction)
      .join('\n');
    expect(all).not.toMatch(/Use shame as a motivator/i);
    expect(all).not.toMatch(/YAAAS QUEEN/);
    expect(all).not.toMatch(/Do better/);
    expect(PERSONAS.roastMaster.name).not.toMatch(/shame/i);
  });
});
