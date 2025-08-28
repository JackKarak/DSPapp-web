// Emoji constants to prevent corruption issues
export const EMOJIS = {
  // Profile emojis
  PROFILE: '👤',
  NAME: '👤', 
  PHONE: '📱',
  EMAIL: '📧',
  UID: '🆔',
  BIRTHDAY: '🎂',
  PRONOUNS: '🏷️',
  MAJOR: '🎓',
  MINOR: '📚',
  GRADUATION: '🎓',
  PLEDGE: '🤝',
  HOUSE: '🏠',
  LIVING: '🏘️',
  RACE: '🌈',
  GENDER: '⚧️',
  ORIENTATION: '💜',
  
  // Action emojis
  EDIT: '✏️',
  SAVE: '💾',
  CANCEL: '❌',
  ADD: '➕',
  REMOVE: '➖',
  
  // Status emojis
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  
  // DSP emojis
  DSP: '💜',
  GOLD: '🏆',
  PURPLE: '💜'
} as const;

// Fallback text for when emojis don't display
export const EMOJI_FALLBACKS = {
  PROFILE: 'Profile',
  NAME: 'Name', 
  PHONE: 'Phone',
  EMAIL: 'Email',
  UID: 'UID',
  BIRTHDAY: 'DOB',
  PRONOUNS: 'Pronouns',
  MAJOR: 'Major',
  MINOR: 'Minor',
  GRADUATION: 'Graduation',
  PLEDGE: 'Pledge',
  HOUSE: 'House',
  LIVING: 'Living',
  RACE: 'Race',
  GENDER: 'Gender',
  ORIENTATION: 'Orientation',
  
  EDIT: 'Edit',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  ADD: 'Add',
  REMOVE: 'Remove',
  
  SUCCESS: 'Success',
  ERROR: 'Error',
  WARNING: 'Warning',
  INFO: 'Info',
  
  DSP: 'DSP',
  GOLD: 'Gold',
  PURPLE: 'Purple'
} as const;

// Helper function to get emoji with fallback
export const getEmoji = (key: keyof typeof EMOJIS, useFallback: boolean = false): string => {
  return useFallback ? EMOJI_FALLBACKS[key] : EMOJIS[key];
};

// Helper function to create emoji + text combination
export const emojiText = (key: keyof typeof EMOJIS, text: string, useFallback: boolean = false): string => {
  const emoji = getEmoji(key, useFallback);
  return `${emoji} ${text}`;
};
