/**
 * Analytics Constants
 * Shared chart configurations and colors for all analytics components
 * Uses DSP brand colors (Purple and Gold theme)
 */

// DSP Brand Color Palette for Charts
export const DSP_CHART_COLORS = {
  // Primary DSP Colors
  purple: '#8B5CF6',      // DSP Purple (Primary)
  gold: '#D4AF37',        // DSP Gold
  
  // Purple Shades (for variety in charts)
  darkPurple: '#6D28D9',
  mediumPurple: '#7C3AED',
  lightPurple: '#A78BFA',
  deepPurple: '#5B21B6',
  
  // Gold Shades (for variety in charts)
  lightGold: '#FCD34D',
  amber: '#F59E0B',
  yellowGold: '#EAB308',
  bronze: '#92400E',
  
  // Status Colors (using DSP theme)
  success: '#34A853',     // Green for positive metrics
  warning: '#FBBC04',     // Yellow for warnings
  error: '#EA4335',       // Red for errors/negative
  neutral: '#80868b',     // Gray for neutral
};

// Chart color arrays for different chart types
export const CHART_COLOR_ARRAYS = {
  // For pie charts and multi-category visualizations (10 colors)
  pie: [
    DSP_CHART_COLORS.purple,      // Primary
    DSP_CHART_COLORS.gold,        // Secondary
    DSP_CHART_COLORS.darkPurple,
    DSP_CHART_COLORS.lightGold,
    DSP_CHART_COLORS.lightPurple,
    DSP_CHART_COLORS.amber,
    DSP_CHART_COLORS.mediumPurple,
    DSP_CHART_COLORS.yellowGold,
    DSP_CHART_COLORS.deepPurple,
    DSP_CHART_COLORS.bronze,
  ],
  
  // For bar charts (simpler palette)
  bar: [
    DSP_CHART_COLORS.purple,
    DSP_CHART_COLORS.gold,
    DSP_CHART_COLORS.darkPurple,
    DSP_CHART_COLORS.amber,
  ],
};

// Standard chart configuration for react-native-chart-kit
export const CHART_CONFIG = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`, // DSP Purple
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  propsForLabels: {
    fontSize: 12,
    fontWeight: '500' as any,
  },
};

// Alternative chart config for IOSCharts (darker labels)
export const IOS_CHART_CONFIG = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`, // DSP Purple
  strokeWidth: 2,
  barPercentage: 0.7,
  decimalPlaces: 0,
  propsForLabels: {
    fontSize: 11,
    fill: '#4B5563', // Dark gray for readability
  },
};

// KPI Card colors (for different metric types)
export const KPI_COLORS = {
  rating: DSP_CHART_COLORS.purple,
  attendance: DSP_CHART_COLORS.success,
  engagement: DSP_CHART_COLORS.gold,
  events: DSP_CHART_COLORS.error,
  default: DSP_CHART_COLORS.purple,
};

// Helper function to get trend color
export const getTrendColor = (value: number): string => {
  if (value >= 0) return DSP_CHART_COLORS.success;
  return DSP_CHART_COLORS.error;
};

// Helper function to get attendance rate color
export const getAttendanceRateColor = (rate: number): string => {
  if (rate >= 70) return DSP_CHART_COLORS.success;
  if (rate >= 50) return DSP_CHART_COLORS.warning;
  return DSP_CHART_COLORS.error;
};

// Helper function to get diversity score color
export const getDiversityScoreColor = (score: number): string => {
  if (score >= 70) return DSP_CHART_COLORS.success;
  if (score >= 50) return DSP_CHART_COLORS.warning;
  return DSP_CHART_COLORS.error;
};
