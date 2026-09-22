import { describe, it, expect } from 'vitest';

import { buildCopyCheckRequest, readCopyCheckAnswers, COPY_RULES } from '../copyChecks.js';
import { MISSION_TYPES } from '../roomTypes.js';

const mission = (overrides = {}) => ({
  id: 'm1',
  type: 'dishes',
  title: 'Mugs to the Sink',
  description: 'Carry the two mugs on the desk to the sink.',
  strategy: 'Hold both in one hand so it is one trip.',
  time: 90,
  ...overrides
});

const cardRules = COPY_RULES.filter((r) => r.appliesTo.includes('card'));
const noteRules = COPY_RULES.filter((r) => r.appliesTo.includes('note'));

describe('buildCopyCheckRequest', () => {
  it('asks every card rule plus a type check per mission, and every note rule once', () => {
    const { questions } = buildCopyCheckRequest({
      status: 'ok',
      note: 'Let us begin.',
      missions: [mission(), mission({ type: 'trash' })]
    });

    expect(Object.keys(questions)).toHaveLength(2 * (cardRules.length + 1) + noteRules.length);
    expect(questions.m1__vague_strategy.instructions).toContain('`missions[1].strategy`');
    expect(questions.note__note_restates_mission.type).toBe('noul');
  });

  it('offers every mission type plus a no-match option for type_fit', () => {
    const { questions } = buildCopyCheckRequest({ status: 'ok', note: '', missions: [mission()] });

    expect(Object.keys(questions.m0__type_fit.criteria)).toEqual([...MISSION_TYPES, 'none']);
  });

  it('sends only reader-facing fields in state', () => {
    const { state } = buildCopyCheckRequest({ status: 'ok', note: 'Hi', missions: [mission()] });

    expect(state.missions[0]).not.toHaveProperty('id');
    expect(state.missions[0]).not.toHaveProperty('time');
  });

  it('skips the note when it is empty, and returns null when nothing is left', () => {
    const cardsOnly = buildCopyCheckRequest({ status: 'ok', note: '', missions: [mission()] });
    expect(Object.keys(cardsOnly.questions).some((id) => id.startsWith('note__'))).toBe(false);

    expect(buildCopyCheckRequest({ status: 'retake', note: '  ', missions: [] })).toBeNull();
  });
});

describe('readCopyCheckAnswers', () => {
  const response = { status: 'ok', note: 'Let us begin.', missions: [mission()] };

  it('reports review and flag levels, and drops passes', () => {
    const findings = readCopyCheckAnswers(response, {
      m0__mentions_person: { type: 'noul', noul: 0.9 },
      m0__meta_text: { type: 'noul', noul: 0.5 },
      m0__shames_user: { type: 'noul', noul: 0.1 },
      note__endearment: { type: 'noul', noul: 0.8 }
    });

    expect(findings.map((f) => [f.rule, f.where, f.level])).toEqual([
      ['mentions_person', 'mission 1', 'flag'],
      ['meta_text', 'mission 1', 'review'],
      ['endearment', 'note', 'flag']
    ]);
  });

  it('flags a type mismatch only when the assigned type is unlikely', () => {
    const probabilities = (assigned) =>
      Object.fromEntries([...MISSION_TYPES, 'none'].map((t) => [t, t === 'dishes' ? assigned : 0]));

    const clear = readCopyCheckAnswers(response, {
      m0__type_fit: { type: 'choice', choice: 'trash', probabilities: probabilities(0.02) }
    });
    expect(clear).toMatchObject([{ rule: 'type_fit', level: 'flag', detail: expect.any(String) }]);

    const agrees = readCopyCheckAnswers(response, {
      m0__type_fit: { type: 'choice', choice: 'dishes', probabilities: probabilities(0.9) }
    });
    expect(agrees).toEqual([]);
  });
});
