/**
 * Mission prompt assembly.
 *
 * The persona goes in the system prompt (see worker/src/index.js); everything
 * here is the user-turn instruction that accompanies the photo.
 */

import { getDifficulty, getRoomType, DEFAULT_DIFFICULTY, MISSION_TYPES } from './roomTypes.js';

/** Steer the model toward what actually accumulates in a given room. */
export const getRoomTypePromptAddition = (roomTypeId) => {
  const room = getRoomType(roomTypeId);
  if (room.id === 'other') return '';
  return `\nThis is a ${room.name.toLowerCase()}. ${room.description}.`;
};

/** Difficulty controls ambition and time-box size, not just mission count. */
export const getDifficultyPromptAddition = (difficultyId = DEFAULT_DIFFICULTY) => {
  const difficulty = getDifficulty(difficultyId);

  if (difficulty.id === 'easy') {
    return '\nKeep missions very small and achievable — 3-5 minutes each. Err on the side of too easy; finishing matters more than thoroughness.';
  }
  if (difficulty.id === 'hard') {
    return '\nMake missions ambitious, with 10-15 minute time boxes. Push for visible, high-impact change.';
  }
  return '';
};

/**
 * Build the user-turn text that accompanies the room photo.
 *
 * The response shape is enforced by the structured-output schema, so this
 * describes intent and tone only — no JSON examples to drift out of sync.
 */
export const buildMissionPrompt = ({ roomType, difficulty = DEFAULT_DIFFICULTY } = {}) => {
  const { missionCount, timePerMission } = getDifficulty(difficulty);

  return [
    `Look at this room and create ${missionCount} cleaning missions using the "5 Things" method.`,
    '',
    'Rules:',
    '1. Batch by category rather than by object — "all the trash", not "the receipt on the desk".',
    `2. Assign each mission a type: ${MISSION_TYPES.join(', ')}.`,
    `3. Time each mission in seconds, around ${timePerMission} seconds, based on how much of that category you can actually see.`,
    '4. Write the title, description and strategy in your own voice, staying fully in character.',
    '5. The strategy is a tactic for beating the executive-function wall on that specific mission — not generic encouragement.',
    '6. Order the missions so the fastest visible win comes first.',
    '',
    'Only include a category you can actually see evidence of in the photo.',
    getRoomTypePromptAddition(roomType),
    getDifficultyPromptAddition(difficulty)
  ]
    .join('\n')
    .trim();
};
