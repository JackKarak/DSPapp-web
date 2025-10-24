/**
 * Analytics Hooks
 * Export all analytics-related hooks
 */

export { useAnalyticsData } from './useAnalyticsData';
export { useHealthMetrics } from './useHealthMetrics';
export { useMemberPerformance } from './useMemberPerformance';
export { useEventAnalytics } from './useEventAnalytics';
export { useCategoryBreakdown } from './useCategoryBreakdown';
export { useDiversityMetrics } from './useDiversityMetrics';
export { useOfficerAnalytics } from './useOfficerAnalytics';
export type { AnalyticsDashboardData, ComputedMetrics, ComparativeData } from './useOfficerAnalytics';
export * from './analyticsUtils';
export { analyticsReducer, initialState } from './analyticsReducer';
