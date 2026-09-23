/**
 * Copy checks: TypeSafe questions that test generated missions against the
 * rules in prompt.js and personas.js.
 *
 * The prompt asks Claude to follow these rules; nothing downstream checked
 * them. Each rule here is one narrow judgment over the mission text, asked of
 * a TypeSafe System One model. Everything is plain data (TypeSafe questions are
 * JSON), so this file stays browser- and worker-safe; the caller owns the
 * client and the policy for what to do with a flag.
 *
 * Every Noul is phrased so that yes means the rule was broken, which keeps
 * reporting uniform: a high `noul` is always bad.
 */

import { MISSION_TYPES } from './roomTypes.js';
import { MISSION_TYPE_GUIDE, MISSION_TYPE_RULE } from './prompt.js';

/** Starting thresholds from the TypeSafe guardrails pattern; tune on real output. */
export const COPY_CHECK_THRESHOLDS = { review: 0.35, flag: 0.7 };

/**
 * Rules asked of every card and/or the note. `target` is a backticked path
 * into the state (see buildCopyCheckRequest), without backticks: `missions[2]` or `note`.
 */
export const COPY_RULES = [
  {
    id: 'mentions_person',
    appliesTo: ['card', 'note'],
    label: 'Mentions a person or pet',
    question: (path) => ({
      type: 'noul',
      instructions: `Does \`${path}\` refer to a real person or a living animal other than the reader being coached?`,
      criteria: {
        true: 'Mentions, describes, jokes about or gives a task to someone else (a partner, housemate, child, a pet), or comments on what someone is wearing or holding.',
        false:
          'Only talks to the reader ("you", "your") about the room and its objects. Toys, stuffed animals and objects described as if alive are still objects, and naming an object by its owner, like "the dog bowl", is still about the object.'
      }
    })
  },
  {
    id: 'meta_text',
    appliesTo: ['card', 'note'],
    label: 'Not final copy',
    question: (path) => ({
      type: 'noul',
      instructions: `Does \`${path}\` contain writing-process leftovers that were never meant for the reader?`,
      criteria: {
        true: 'A second draft or alternative ("or:", "alt:"), a note from the writer to themselves, a bracketed stage direction, a placeholder like [item] or TODO, or stray markup or characters.',
        false:
          'Every sentence is addressed to the reader, including playful, dramatic or oddly worded lines and em dashes.'
      }
    })
  },
  {
    id: 'shames_user',
    appliesTo: ['card', 'note'],
    label: 'Shames the person',
    question: (path) => ({
      type: 'noul',
      instructions: `Does \`${path}\` shame or insult the reader as a person, rather than teasing the mess?`,
      criteria: {
        true: 'Implies the reader is lazy, gross or failing, or comments on their body, looks, intelligence, mental health, ADHD, diagnosis or medication.',
        false:
          'Any teasing is aimed at the objects or the state of the room, or there is no teasing at all.'
      }
    })
  },
  {
    id: 'endearment',
    appliesTo: ['card', 'note'],
    label: 'Pet name or assumed gender',
    question: (path) => ({
      type: 'noul',
      instructions: `Does \`${path}\` call the reader a pet name or assume the reader's gender?`,
      criteria: {
        true: 'Uses a term of endearment such as "love", "sweetie", "honey", "babe" or "hun", or a gendered address such as "girl", "queen", "king", "bro", "sir" or "ma\'am".',
        // personas.js allows these for the Bestie voice.
        false:
          'Addresses the reader without pet names or gendered terms. Gender-neutral friendly address such as "bestie", "friend", "legend", "icon" or "recruit" is allowed.'
      }
    })
  },
  {
    id: 'vague_strategy',
    appliesTo: ['card'],
    label: 'Strategy is encouragement, not a tactic',
    question: (path) => ({
      type: 'noul',
      instructions: `Is \`${path}.strategy\` general encouragement rather than a concrete tactic for starting the job?`,
      criteria: {
        true: 'Motivation or a pep talk ("you can do it", "every bit counts") with no specific starting point, rule or method.',
        false:
          'Names something specific to do: where to start, a rule that removes a decision, or a way to carry or group things.'
      }
    })
  },
  {
    id: 'note_restates_mission',
    appliesTo: ['note'],
    label: 'Note repeats a mission',
    question: () => ({
      type: 'noul',
      instructions:
        'Does `note` repeat or restate the instruction or the strategy of any mission in `missions`, instead of being a short intro to the session?',
      criteria: {
        true: 'The note tells the reader to do a specific job that one of the missions already covers, or repeats how a mission says to do it (its strategy or tactic).',
        false:
          'The note sets the mood or comments on the room, even naming its biggest mess, without saying what to do or how to do it.'
      }
    })
  }
];

const TYPE_NONE = 'none';

/** The type a card's text actually describes, to compare with the type Claude assigned. */
const typeFitQuestion = (path) => ({
  type: 'choice',
  instructions: `Which kind of cleaning job does the title and description of \`${path}\` describe? ${MISSION_TYPE_RULE}`,
  criteria: {
    ...Object.fromEntries(MISSION_TYPES.map((type) => [type, MISSION_TYPE_GUIDE[type]])),
    [TYPE_NONE]: 'None of these, or several different kinds of job at once'
  }
});

const cardPath = (index) => `missions[${index}]`;
const questionId = (scope, ruleId) => `${scope}__${ruleId}`;

/**
 * Build one TypeSafe request covering every card and the note of a worker
 * response. All questions share the same state and run in parallel.
 *
 * @param {{status: string, note: string, missions: object[]}} result - A worker response
 * @returns {{state: object, questions: object} | null} null when there is no text to check
 */
export const buildCopyCheckRequest = ({ status, note = '', missions = [] }) => {
  const questions = {};

  missions.forEach((_, index) => {
    const scope = `m${index}`;
    for (const rule of COPY_RULES) {
      if (rule.appliesTo.includes('card')) {
        questions[questionId(scope, rule.id)] = rule.question(cardPath(index));
      }
    }
    questions[questionId(scope, 'type_fit')] = typeFitQuestion(cardPath(index));
  });

  // The offline fallback has an empty note; nothing to judge.
  if (note.trim()) {
    for (const rule of COPY_RULES) {
      if (rule.appliesTo.includes('note')) {
        questions[questionId('note', rule.id)] = rule.question('note');
      }
    }
  }

  if (Object.keys(questions).length === 0) return null;

  // Only the reader-facing text. `id` and `time` would add tokens and nothing to judge.
  const state = {
    status,
    note,
    missions: missions.map(({ type, title, description, strategy }) => ({
      type,
      title,
      description,
      strategy
    }))
  };

  return { state, questions };
};

const levelFor = (probability, thresholds) => {
  if (probability >= thresholds.flag) return 'flag';
  if (probability >= thresholds.review) return 'review';
  return 'pass';
};

/**
 * Turn TypeSafe answers back into per-card and per-note findings.
 *
 * Only `review` and `flag` findings are returned. `type_fit` is reported when
 * the model's pick differs from the assigned type and the assigned type's own
 * probability is below the review threshold.
 *
 * @returns {Array<{where: string, rule: string, level: 'review'|'flag', probability: number, text: string, detail?: string}>}
 */
export const readCopyCheckAnswers = (
  { note = '', missions = [] },
  answers,
  thresholds = COPY_CHECK_THRESHOLDS
) => {
  const findings = [];

  const cardText = (m) => `${m.title} | ${m.description} | ${m.strategy}`;

  missions.forEach((mission, index) => {
    const scope = `m${index}`;
    for (const rule of COPY_RULES) {
      const answer = answers[questionId(scope, rule.id)];
      if (!answer) continue;
      const level = levelFor(answer.noul, thresholds);
      if (level === 'pass') continue;
      findings.push({
        where: `mission ${index + 1}`,
        rule: rule.id,
        level,
        probability: answer.noul,
        text: rule.id === 'vague_strategy' ? mission.strategy : cardText(mission)
      });
    }

    const fit = answers[questionId(scope, 'type_fit')];
    if (fit && fit.choice !== mission.type) {
      // Inverted so, like the Nouls, a higher number means a worse mismatch.
      const mismatch = 1 - (fit.probabilities[mission.type] ?? 0);
      const level = levelFor(mismatch, thresholds);
      if (level !== 'pass') {
        findings.push({
          where: `mission ${index + 1}`,
          rule: 'type_fit',
          level,
          probability: mismatch,
          text: `${mission.title} | ${mission.description}`,
          detail: `assigned "${mission.type}", reads as "${fit.choice}"`
        });
      }
    }
  });

  for (const rule of COPY_RULES) {
    const answer = answers[questionId('note', rule.id)];
    if (!answer) continue;
    const level = levelFor(answer.noul, thresholds);
    if (level === 'pass') continue;
    findings.push({ where: 'note', rule: rule.id, level, probability: answer.noul, text: note });
  }

  return findings;
};

/** Every rule id a report can contain, in display order. */
export const COPY_RULE_IDS = [...COPY_RULES.map((rule) => rule.id), 'type_fit'];
