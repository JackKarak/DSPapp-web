/**
 * Account screen constants
 * All dropdown options, validation rules, and configuration
 */

// Dropdown options
export const PRONOUNS_OPTIONS = [
  { label: 'He/Him', value: 'he/him' },
  { label: 'She/Her', value: 'she/her' },
  { label: 'They/Them', value: 'they/them' },
  { label: 'He/They', value: 'he/they' },
  { label: 'She/They', value: 'she/they' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' }
];

export const GRADUATION_OPTIONS = [
  'Winter 2025', 'Spring 2026', 'Winter 2026', 'Spring 2027',
  'Winter 2027', 'Spring 2028', 'Winter 2028', 'Spring 2029'
];

export const HOUSE_OPTIONS = ['Moysello', 'Tienken', 'Makay', 'Valentine'];

export const PLEDGE_CLASS_OPTIONS = ['Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi'];

export const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Genderfluid', value: 'genderfluid' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' }
];

export const SEXUAL_ORIENTATION_OPTIONS = [
  { label: 'Heterosexual', value: 'heterosexual' },
  { label: 'Gay', value: 'gay' },
  { label: 'Lesbian', value: 'lesbian' },
  { label: 'Bisexual', value: 'bisexual' },
  { label: 'Pansexual', value: 'pansexual' },
  { label: 'Asexual', value: 'asexual' },
  { label: 'Questioning', value: 'questioning' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' }
];

export const RACE_OPTIONS = [
  { label: 'American Indian or Alaska Native', value: 'american_indian_alaska_native' },
  { label: 'Asian', value: 'asian' },
  { label: 'Black or African American', value: 'black_african_american' },
  { label: 'Hispanic or Latino', value: 'hispanic_latino' },
  { label: 'Native Hawaiian or Other Pacific Islander', value: 'native_hawaiian_pacific_islander' },
  { label: 'White', value: 'white' },
  { label: 'Two or more races', value: 'two_or_more_races' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' }
];

export const LIVING_TYPE_OPTIONS = [
  { label: 'On Campus', value: 'on_campus' },
  { label: 'Off Campus', value: 'off_campus' },
  { label: 'With Parents', value: 'with_parents' },
  { label: 'Fraternity House', value: 'fraternity_house' },
  { label: 'Other', value: 'other' }
];

// Profile edit restrictions
export const PROFILE_EDIT_COOLDOWN_DAYS = 7;

// Tier configuration for styling and order
export const TIER_CONFIG = {
  bronze: { name: 'Bronze', color: '#CD7F32', gradient: ['#CD7F32', '#B8860B'], order: 1 },
  silver: { name: 'Silver', color: '#C0C0C0', gradient: ['#C0C0C0', '#A8A8A8'], order: 2 },
  gold: { name: 'Gold', color: '#FFD700', gradient: ['#FFD700', '#FFA500'], order: 3 },
  'rose-gold': { name: 'Rose Gold', color: '#E8B4A0', gradient: ['#E8B4A0', '#D4A574'], order: 4 }
};

// Achievement definitions
export const ACHIEVEMENTS = {
  // Consistency & Streaks (Bronze → Rose Gold)
  streak_starter: { title: 'Streak Starter', description: '3+ event streak', tier: 'bronze', icon: '🥉' },
  iron_brother: { title: 'Iron Brother', description: '10+ event streak', tier: 'silver', icon: '🥈' },
  unstoppable: { title: 'Unstoppable', description: '20+ event streak', tier: 'gold', icon: '🥇' },
  legend_streak: { title: 'Legend Streak', description: '30+ event streak', tier: 'rose_gold', icon: '🌹' },
  
  // Milestone Attendance
  first_timer: { title: 'First Timer', description: '1st event this semester', tier: 'bronze', icon: '🎉' },
  ten_strong: { title: 'Ten Strong', description: '10+ events this semester', tier: 'bronze', icon: '💪' },
  silver_brother: { title: 'Silver Brother', description: '25+ events this semester', tier: 'silver', icon: '🥈' },
  gold_brother: { title: 'Gold Brother', description: '50+ events this semester', tier: 'gold', icon: '🥇' },
  diamond_brother: { title: 'Diamond Brother', description: '100+ events this semester', tier: 'rose_gold', icon: '💎' },
  
  // Points-based
  points_50: { title: 'Rising Star', description: '50+ points earned', tier: 'bronze', icon: '⭐' },
  points_100: { title: 'Point Hunter', description: '100+ points earned', tier: 'silver', icon: '🎯' },
  points_250: { title: 'Point Master', description: '250+ points earned', tier: 'gold', icon: '👑' },
  points_500: { title: 'Point Legend', description: '500+ points earned', tier: 'rose_gold', icon: '🏆' },
  
  // Attendance rate
  punctual_pro: { title: 'Punctual Pro', description: '75%+ attendance rate', tier: 'silver', icon: '⏰' },
  perfect_semester: { title: 'Perfect Semester', description: '100% attendance rate', tier: 'rose_gold', icon: '✨' },
  
  // Monthly performance
  monthly_champion: { title: 'Monthly Champion', description: '5+ events this month', tier: 'bronze', icon: '📅' },
  
  // Leadership & Community
  top_3: { title: 'Top 3', description: 'Top 3 in pledge class', tier: 'gold', icon: '🏅' },
  community_leader: { title: 'Community Leader', description: '3+ event types attended', tier: 'silver', icon: '🤝' },
  dedicated_member: { title: 'Dedicated Member', description: '15+ events this semester', tier: 'silver', icon: '💙' },
  
  // Special Rose Gold
  fraternity_legend: { title: 'Fraternity Legend', description: '1000+ points, 95%+ attendance, 75+ events', tier: 'rose_gold', icon: '🌟' },
  mentor_master: { title: 'Mentor Master', description: 'Top 2 in class, 50+ events, 4+ event types', tier: 'rose_gold', icon: '🎓' },
} as const;

// Available majors for multi-select
export const AVAILABLE_MAJORS = [
  'Finance',
  'Accounting',
  'Information Systems',
  'Marketing',
  'International Business',
  'Management',
  'OMBA',
  'Supply Chain',
  'Info Science',
  'Computer Science',
  'Engineering'
];

// Test bank file types
export const FILE_TYPES = ['test', 'notes', 'materials'] as const;

// Validation rules
export const VALIDATION_RULES = {
  REQUIRED_FIELDS: ['firstName', 'lastName'],
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  PHONE_PATTERN: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
  URL_PATTERN: /^https?:\/\/.+/,
};

// Format helpers
export const formatLabel = (value: string): string => {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
