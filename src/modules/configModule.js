/**
 * configModule - Manages app configuration, room types, and difficulty settings
 */

const STORAGE_KEY_CONFIG = 'app_config';

export const ROOM_TYPES = {
  bedroom: {
    id: 'bedroom',
    name: 'Bedroom',
    icon: '🛏️',
    description: 'Focus on laundry, organizing, surfaces',
    commonTasks: ['laundry', 'clear', 'organize']
  },
  kitchen: {
    id: 'kitchen',
    name: 'Kitchen',
    icon: '🍳',
    description: 'Focus on dishes, food waste, counters',
    commonTasks: ['dishes', 'trash', 'clear']
  },
  living_room: {
    id: 'living_room',
    name: 'Living Room',
    icon: '🛋️',
    description: 'Focus on clutter, surfaces, sweeping',
    commonTasks: ['clear', 'organize', 'trash']
  },
  bathroom: {
    id: 'bathroom',
    name: 'Bathroom',
    icon: '🚿',
    description: 'Focus on surfaces, organization, mirrors',
    commonTasks: ['clear', 'organize', 'trash']
  },
  garage: {
    id: 'garage',
    name: 'Garage',
    icon: '🚗',
    description: 'Focus on large items, sweeping, organization',
    commonTasks: ['clear', 'organize', 'trash']
  },
  office: {
    id: 'office',
    name: 'Office/Study',
    icon: '💻',
    description: 'Focus on desk, papers, surfaces',
    commonTasks: ['clear', 'organize', 'trash']
  },
  other: {
    id: 'other',
    name: 'Other',
    icon: '📦',
    description: 'Custom room type',
    commonTasks: []
  }
};

export const DIFFICULTY_LEVELS = {
  easy: {
    id: 'easy',
    name: 'Easy',
    description: 'Quick 5-minute missions, less challenging',
    timePerMission: 300, // 5 min
    missionCount: 3,
    breakAfterMissions: 1,
    breakDuration: 300, // 5 min
    multiplier: 0.7 // Missions 30% easier
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    description: 'Standard missions, balanced challenge',
    timePerMission: 600, // 10 min
    missionCount: 4,
    breakAfterMissions: 2,
    breakDuration: 300,
    multiplier: 1.0 // Standard
  },
  hard: {
    id: 'hard',
    name: 'Hard',
    description: 'Ambitious goals, longer time boxes',
    timePerMission: 900, // 15 min
    missionCount: 5,
    breakAfterMissions: 3,
    breakDuration: 600, // 10 min
    multiplier: 1.3 // Missions 30% harder/more ambitious
  }
};

/**
 * Load app configuration
 */
export const loadConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    return (
      stored || {
        roomType: null,
        difficulty: 'medium',
        enableSounds: true,
        enableNotifications: true,
        preferredPersona: null
      }
    );
  } catch (error) {
    console.error('Failed to load config:', error);
    return {};
  }
};

/**
 * Save app configuration
 */
export const saveConfig = (config) => {
  try {
    const parsed = typeof config === 'string' ? JSON.parse(config) : config;
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(parsed));
    return true;
  } catch (error) {
    console.error('Failed to save config:', error);
    return false;
  }
};

/**
 * Update specific config value
 */
export const updateConfig = (key, value) => {
  const config = loadConfig();
  config[key] = value;
  return saveConfig(config);
};

/**
 * Get difficulty settings for current configuration
 */
export const getDifficultySettings = () => {
  const config = loadConfig();
  return DIFFICULTY_LEVELS[config.difficulty] || DIFFICULTY_LEVELS.medium;
};

/**
 * Get room type settings
 */
export const getRoomType = (roomTypeId) => {
  return ROOM_TYPES[roomTypeId] || ROOM_TYPES.other;
};

/**
 * Get all available room types
 */
export const getAllRoomTypes = () => {
  return Object.values(ROOM_TYPES);
};

/**
 * Get all available difficulty levels
 */
export const getAllDifficulties = () => {
  return Object.values(DIFFICULTY_LEVELS);
};

/**
 * Adjust mission data based on difficulty
 */
export const applyDifficultyToMissions = (missions, difficulty = 'medium') => {
  const settings = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.medium;
  
  return missions.map((mission) => ({
    ...mission,
    // Adjust time based on difficulty multiplier
    time: Math.round(mission.time * settings.multiplier)
  }));
};

/**
 * Generate prompt adjustment for room type
 */
export const getRoomTypePromptAddition = (roomTypeId) => {
  const room = ROOM_TYPES[roomTypeId];
  if (!room || room.id === 'other') return '';

  return `\nThis is a ${room.name.toLowerCase()}. Focus especially on: ${room.description}`;
};

/**
 * Generate prompt adjustment for difficulty
 */
export const getDifficultyPromptAddition = (difficulty = 'medium') => {
  const settings = DIFFICULTY_LEVELS[difficulty];
  if (!settings) return '';

  if (difficulty === 'easy') {
    return '\nMake missions short, simple, and achievable in 3-5 minutes. Keep them VERY small and doable.';
  } else if (difficulty === 'hard') {
    return '\nMake missions more ambitious and challenging. 10-15 minute time boxes. Push for bigger impact.';
  }
  return '';
};
