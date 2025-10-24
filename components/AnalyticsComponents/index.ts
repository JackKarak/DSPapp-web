/**
 * Analytics Components
 * Reusable UI components for analytics display
 */

// Re-export all analytics card components
export {
  MetricCard,
  PerformanceRow,
  EventRow,
  DiversityCard,
  InsightCard,
  DiversityScoreCard,
  AnalyticsSection,
} from './AnalyticsCards';

// Re-export all analytics chart components
export {
  DiversityPieChart,
  DistributionBarChart,
  CategoryPointsChart,
} from './AnalyticsCharts';

// Re-export officer analytics components
export {
  KPICard,
  EngagementMetricCard,
  InsightItem,
  OfficerEventCard,
  FeedbackItem,
} from './OfficerAnalyticsCards';

export {
  HeaderSection,
  KPIRowSection,
  AttendanceTrendChart,
  DemographicsChart,
  EventTypeDistributionChart,
  EngagementMetricsSection,
  FeedbackSection,
  EventsSection,
} from './OfficerAnalyticsSections';

export { PerformanceComparison } from './PerformanceComparison';
