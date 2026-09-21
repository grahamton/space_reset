/**
 * Room type and difficulty definitions.
 *
 * Shared between the client (which renders the pickers) and the worker (which
 * turns the selections into prompt fragments). Pure data — no storage, no DOM.
 */

export const ROOM_TYPES = {
  bedroom: {
    id: 'bedroom',
    name: 'Bedroom',
    icon: '🛏️',
    description: 'Laundry, nightstand, floor and surfaces',
    commonTasks: ['laundry', 'clear', 'organize']
  },
  kitchen: {
    id: 'kitchen',
    name: 'Kitchen',
    icon: '🍳',
    description: 'Dishes, food waste, counters and sink',
    commonTasks: ['dishes', 'trash', 'clear']
  },
  living_room: {
    id: 'living_room',
    name: 'Living Room',
    icon: '🛋️',
    description: 'Coffee table, sofa, floor clutter',
    commonTasks: ['clear', 'organize', 'trash']
  },
  bathroom: {
    id: 'bathroom',
    name: 'Bathroom',
    icon: '🚿',
    description: 'Counter, towels, bottles and floor',
    commonTasks: ['clear', 'organize', 'trash']
  },
  garage: {
    id: 'garage',
    name: 'Garage',
    icon: '🚗',
    description: 'Floor space, boxes, tools and large items',
    commonTasks: ['clear', 'organize', 'trash']
  },
  office: {
    id: 'office',
    name: 'Office/Study',
    icon: '💻',
    description: 'Desk, papers, cups and cables',
    commonTasks: ['clear', 'organize', 'trash']
  },
  other: {
    id: 'other',
    name: 'Other',
    icon: '📦',
    description: 'Any other space. We will read the photo',
    commonTasks: []
  }
};

export const DIFFICULTY_LEVELS = {
  easy: {
    id: 'easy',
    name: 'Easy',
    description: 'Running on empty: 3 tiny missions, 5 minutes max',
    timePerMission: 300, // 5 min
    missionCount: 3,
    multiplier: 0.7 // only applied to the offline fallback missions
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    description: 'Some fuel in the tank: 4 missions, up to 10 minutes',
    timePerMission: 600, // 10 min
    missionCount: 4,
    multiplier: 1.0
  },
  hard: {
    id: 'hard',
    name: 'Hard',
    description: 'Ready to go: 5 bigger missions, up to 15 minutes',
    timePerMission: 900, // 15 min
    missionCount: 5,
    multiplier: 1.3
  }
};

export const DEFAULT_DIFFICULTY = 'medium';

/** The five mission categories the UI knows how to colour-code. */
export const MISSION_TYPES = ['trash', 'laundry', 'dishes', 'clear', 'organize'];

export const getRoomType = (roomTypeId) => ROOM_TYPES[roomTypeId] || ROOM_TYPES.other;

export const getDifficulty = (difficultyId) =>
  DIFFICULTY_LEVELS[difficultyId] || DIFFICULTY_LEVELS[DEFAULT_DIFFICULTY];

export const getAllRoomTypes = () => Object.values(ROOM_TYPES);

export const getAllDifficulties = () => Object.values(DIFFICULTY_LEVELS);

/**
 * Scale mission times by the difficulty multiplier.
 *
 * Only for DEFAULT_FALLBACK_DATA, whose times are hardcoded and difficulty-blind.
 * Live missions get their pacing from the prompt instead — running both would
 * apply difficulty twice.
 */
export const applyDifficultyToMissions = (missions, difficultyId = DEFAULT_DIFFICULTY) => {
  const { multiplier } = getDifficulty(difficultyId);
  return missions.map((mission) => ({
    ...mission,
    time: Math.round(mission.time * multiplier)
  }));
};
