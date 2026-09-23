/**
 * Mission prompt assembly.
 *
 * The persona goes in the system prompt (see worker/src/index.js); everything
 * here is the user-turn instruction that accompanies the photo. The response
 * shape is enforced by the structured-output schema, so this describes intent,
 * judgement and length only — no JSON examples to drift out of sync.
 */

import {
  getDifficulty,
  getRoomType,
  DEFAULT_DIFFICULTY,
  DEFAULT_MISSION_COUNT,
  MISSION_TYPES
} from './roomTypes.js';

/**
 * What each mission type means, following the "5 Things" method: every item in
 * a messy room is trash, dishes, laundry, something with a home, or something
 * without one. Keys must match MISSION_TYPES.
 */
export const MISSION_TYPE_GUIDE = {
  trash: 'rubbish, packaging, empty bottles and cans, food waste',
  dishes: 'plates, mugs, glasses, cutlery, pans; the job is getting them to the sink',
  laundry: 'clothes, towels and bedding; the job is getting them into the basket or hamper',
  organize: 'things that already have a home (books, shoes, chargers): put them back there',
  clear:
    'things without a home yet: gather onto one spot or into one box so a surface or floor area is visibly clear'
};

const minutes = (seconds) => Math.round(seconds / 60);

/** Steer the model toward what actually accumulates in a given room. */
export const getRoomTypePromptAddition = (roomTypeId) => {
  const room = getRoomType(roomTypeId);
  if (room.id === 'other') return '';
  return [
    '',
    '## Room type',
    `The user says this is a ${room.name.toLowerCase()}. Typical hotspots: ${room.description.toLowerCase()}.`,
    'Use that as a hint about where to look, not a checklist. If the photo shows something different, trust the photo.'
  ].join('\n');
};

/** Difficulty controls ambition and time-box size, not just mission count. */
export const getDifficultyPromptAddition = (difficultyId = DEFAULT_DIFFICULTY) => {
  const difficulty = getDifficulty(difficultyId);
  const max = minutes(difficulty.timePerMission);

  if (difficulty.id === 'easy') {
    return `\nDifficulty is easy: keep every mission very small and achievable, ${max} minutes at most. Err on the side of too easy; finishing matters more than thoroughness, and a partly-cleared category is still a win.`;
  }
  if (difficulty.id === 'hard') {
    return `\nDifficulty is hard: make missions ambitious, up to ${max} minutes each, aiming for visible, high-impact change such as a whole floor area or surface cleared. The first mission should still be a quick win to build momentum.`;
  }
  return `\nDifficulty is medium: a balanced session, up to ${max} minutes per mission.`;
};

/**
 * Mission count is independent of difficulty: 'auto' lets the photo decide
 * (roughly 3 to 6, fewer when there's less mess), a number pins a target the
 * model should hit unless the photo honestly doesn't support that many.
 */
export const getMissionCountInstruction = (missionCount = DEFAULT_MISSION_COUNT) => {
  if (missionCount === 'auto' || missionCount == null) {
    return 'Look at this photo and create cleaning missions using the "5 Things" method. Let the photo decide how many: roughly 3 to 6, fewer when there is less mess to work with.';
  }
  return `Look at this photo and create up to ${missionCount} cleaning missions using the "5 Things" method.`;
};

/**
 * Build the user-turn text that accompanies the room photo.
 */
export const buildMissionPrompt = ({
  roomType,
  difficulty = DEFAULT_DIFFICULTY,
  missionCount = DEFAULT_MISSION_COUNT
} = {}) => {
  const { timePerMission } = getDifficulty(difficulty);
  const maxMinutes = minutes(timePerMission);

  return [
    `${getMissionCountInstruction(missionCount)} Write every word in your own voice, staying in character.`,
    '',
    '## Why the missions look the way they do',
    'Each mission is shown as a single card with a countdown timer on a phone. The user reads it mid-task, often while holding something, and an ADHD brain stalls on long text and open-ended decisions. So cards must be short, concrete and startable in the first ten seconds.',
    '',
    '## Grounding',
    '- Base every mission on what is actually visible in the photo. Name the specific items and where they are ("the two plates by the bed", "the mugs on the desk"), so the user never has to work out what you meant.',
    '- Batch by category rather than by single object: "every mug on the desk", not "the blue mug". One category or one area per mission.',
    '- Only include a category you can see evidence of. Do not invent items, furniture or mess that is not in the photo, and do not pad with generic advice to reach the count. Fewer honest missions beat more made-up ones.',
    '',
    '## People and pets in the photo',
    'Photos are often taken with someone in frame: the user, a housemate, a child, a pet. Missions are about the room only. Do not mention, describe, joke about or assign tasks to anyone visible, and do not refer to what they are wearing or holding. Treat the space they occupy as not part of the job: work around them. This applies to every voice, the roast included, because the person in the photo may not be the person holding the phone.',
    '',
    '## Mission types',
    ...MISSION_TYPES.map((type) => `- ${type}: ${MISSION_TYPE_GUIDE[type]}`),
    '',
    '## Card length',
    '- title: 2 to 6 words. A label, not a sentence.',
    '- description: the physical action in 1 or 2 short sentences, about 25 words at most. What to pick up, from where, and where it goes.',
    '- strategy: one specific tactic for getting past the start-up wall on this mission, in 1 or 2 short sentences, about 25 words at most. A concrete trick (a starting point, a rule that removes a decision, a way to carry things), not general encouragement.',
    'Your character comes through in word choice, not word count. Each field is final copy shown verbatim on screen: no drafts, alternatives, notes to yourself or stage directions.',
    '',
    '## Timing and order',
    `- time is in seconds, a round number (a multiple of 30). Size it to how much of that category is actually visible: a couple of plates is 1 to 2 minutes, a floor covered in clothes is much more. Never exceed ${timePerMission} seconds (${maxMinutes} minutes).`,
    '- Order the missions so the quickest visible win comes first; it builds momentum. Leave slower, more decision-heavy jobs such as papers and putting things away for last.',
    '',
    '## Judging the photo',
    '- A genuinely messy room: status is "ok". Build the missions as described above.',
    '- Blurry, dark, or not a room at all (a screenshot, a face, an abstract image, an outdoor scene): status is "retake" and missions stays empty. Do not invent a mess to fill it.',
    '- Already tidy, or only a few things out of place: status is "tidy". Return only the one or two small resets you can actually see — zero missions is fine when there is truly nothing to do. Do not manufacture work.',
    '',
    '## The note',
    '- One line in your voice, about 20 words max, matching the status you chose.',
    '- ok: a brief in-character intro to the session. This is where your personality gets room to breathe — the mission cards themselves stay practical, so this line is the voice payoff.',
    '- retake: say honestly and briefly why the photo did not work, and how to retake it — from the doorway, showing the floor and main surfaces.',
    '- tidy: say the room already looks good.',
    "- Never repeat or restate a mission's instructions or its strategy here: no \"one armful at a time\" when a card already says to scoop by the armful. Remarking on the room's biggest mess is fine; telling them how to tackle it is the card's job.",
    '- Never mention anyone visible in the photo — same rule as the missions themselves.',
    getRoomTypePromptAddition(roomType),
    '',
    '## Difficulty',
    getDifficultyPromptAddition(difficulty).trim()
  ]
    .join('\n')
    .trim();
};
