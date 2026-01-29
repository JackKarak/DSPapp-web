/**
 * Operations Screen Constants
 * Officer positions, emoji options, and color options for point categories
 */

export const OFFICER_POSITIONS = [
  'president',
  'svp',
  'chancellor',
  'vp_service',
  'vp_scholarship',
  'vp_alumni',
  'historian',
  'social',
  'vp_marketing',
  'vp_operations',
  'vp_finance',
  'fundraising',
  'vp_professional',
  'brotherhood',
  'risk',
  'h&w',
  'vp_dei',
  'vp_branding',
] as const;

export const OFFICER_POSITION_ORDER: Record<string, number> = {
  'president': 1,
  'chancellor': 2,
  'svp': 3,
  'vp_service': 4,
  'vp_scholarship': 5,
  'vp_alumni': 6,
  'vp_marketing': 7,
  'vp_operations': 8,
  'vp_finance': 9,
  'vp_professional': 10,
  'vp_dei': 11,
  'vp_branding': 12,
  'historian': 13,
  'social': 14,
  'fundraising': 15,
  'brotherhood': 16,
  'risk': 17,
  'h&w': 18,
};

export const EMOJI_OPTIONS = [
  '⭐', '🤝', '💼', '🤲', '📚', '💪', '💰', '🌈', '🎯', '🏆', '📊', '🎓', '🌟', '💡', '🔥'
];

export const COLOR_OPTIONS = [
  '#8B4513', '#1E90FF', '#32CD32', '#FFD700', '#FF69B4', 
  '#9370DB', '#20B2AA', '#FF6347', '#4B0082', '#00CED1'
];

export type OfficerPosition = typeof OFFICER_POSITIONS[number];
