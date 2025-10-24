/**
 * Officer Analytics Section Components
 * Larger section components for officer analytics dashboard
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart, LineChart, PieChart } from '../IOSCharts';
import { KPICard, EngagementMetricCard, InsightItem, OfficerEventCard, FeedbackItem } from './OfficerAnalyticsCards';

const screenWidth = Dimensions.get('window').width;
const pieColors = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#9C27B0', '#FF9800', '#00BCD4', '#8BC34A'];

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  propsForLabels: {
    fontSize: 12,
    fontWeight: '500' as any,
  },
};

// ============================================================================
// HEADER SECTION
// ============================================================================

type HeaderSectionProps = {
  position: string;
};

export const HeaderSection: React.FC<HeaderSectionProps> = ({ position }) => (
  <View style={styles.headerContainer}>
    <Text style={styles.title}>Analytics Dashboard</Text>
    <Text style={styles.subtitle}>
      {position.replace('_', ' ')}
    </Text>
  </View>
);

// ============================================================================
// KPI ROW SECTION
// ============================================================================

type KPIRowSectionProps = {
  avgRating: number;
  avgAttendance: number;
  engagementRate: number;
  totalEvents: number;
  growthRate: number;
};

export const KPIRowSection: React.FC<KPIRowSectionProps> = ({
  avgRating,
  avgAttendance,
  engagementRate,
  totalEvents,
  growthRate
}) => (
  <>
    <View style={styles.kpiRow}>
      <KPICard
        title="Average Rating"
        value={avgRating.toFixed(1)}
        subtitle="out of 5.0"
        color="#1a73e8"
      />
      <KPICard
        title="Avg Attendance"
        value={avgAttendance.toFixed(0)}
        subtitle="members per event"
        trend={growthRate}
        color="#34a853"
      />
    </View>
    <View style={styles.kpiRow}>
      <KPICard
        title="Engagement"
        value={`${engagementRate.toFixed(1)}%`}
        subtitle="member participation"
        color="#fbbc04"
      />
      <KPICard
        title="Total Events"
        value={totalEvents}
        subtitle="created"
        color="#ea4335"
      />
    </View>
  </>
);

// ============================================================================
// ATTENDANCE TREND CHART
// ============================================================================

type AttendanceTrendProps = {
  attendanceTrend: { month: string; count: number }[];
};

export const AttendanceTrendChart: React.FC<AttendanceTrendProps> = ({ attendanceTrend }) => (
  <View style={styles.chartCard}>
    <Text style={styles.chartTitle}>Event Activity</Text>
    {attendanceTrend.length > 0 && (
      <LineChart
        data={{
          labels: attendanceTrend.map((d) => d.month),
          datasets: [{
            data: attendanceTrend.map((d) => d.count),
            color: () => '#4285F4',
          }]
        }}
        width={screenWidth - 48}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
        bezier
      />
    )}
  </View>
);

// ============================================================================
// DEMOGRAPHICS CHART
// ============================================================================

type DemographicsChartProps = {
  byPledgeClass: Record<string, number>;
};

export const DemographicsChart: React.FC<DemographicsChartProps> = ({ byPledgeClass }) => (
  <View style={styles.chartCard}>
    <Text style={styles.chartTitle}>👥 Regular Member Demographics by Pledge Class</Text>
    <Text style={styles.chartSubtitle}>Attendees of your events (excluding officers/admins)</Text>
    {Object.keys(byPledgeClass).length > 0 ? (
      <BarChart
        data={{
          labels: Object.keys(byPledgeClass).slice(0, 6),
          datasets: [{
            data: Object.values(byPledgeClass).slice(0, 6) as number[]
          }]
        }}
        width={screenWidth - 48}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
        yAxisLabel=""
        yAxisSuffix=""
        showBarTops={false}
        withInnerLines={false}
        fromZero={true}
      />
    ) : (
      <Text style={styles.noDataText}>No members found in the system yet.</Text>
    )}
  </View>
);

// ============================================================================
// EVENT TYPE DISTRIBUTION CHART
// ============================================================================

type EventTypeDistributionProps = {
  byPointType: Record<string, number>;
};

export const EventTypeDistributionChart: React.FC<EventTypeDistributionProps> = ({ byPointType }) => {
  const pointDistribution = Object.entries(byPointType || {}).map(([name, points], i) => ({
    name,
    points: points as number,
    color: pieColors[i % pieColors.length],
    legendFontColor: '#333',
    legendFontSize: 13,
  }));

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>🎯 Event Type Distribution</Text>
      {pointDistribution.length > 0 ? (
        <PieChart
          data={pointDistribution}
          width={screenWidth - 48}
          height={220}
          chartConfig={chartConfig}
          accessor="points"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 10]}
          absolute
        />
      ) : (
        <Text style={styles.noDataText}>No events have been created yet.</Text>
      )}
    </View>
  );
};

// ============================================================================
// ENGAGEMENT METRICS SECTION
// ============================================================================

type EngagementMetricsSectionProps = {
  engagementRate: number;
  avgRating: number;
  wouldAttendAgainPct: number;
  wellOrganizedPct: number;
};

export const EngagementMetricsSection: React.FC<EngagementMetricsSectionProps> = ({
  engagementRate,
  avgRating,
  wouldAttendAgainPct,
  wellOrganizedPct
}) => {
  const getEngagementDescription = (rate: number) => 
    rate >= 30 ? 'Excellent member participation' : 
    rate >= 15 ? 'Good member involvement' : 'Needs improvement';

  const getSatisfactionDescription = (rating: number) =>
    rating >= 4.0 ? 'Outstanding quality' : 
    rating >= 3.0 ? 'Good experience' : 'Room for improvement';

  const getRetentionDescription = (pct: number) =>
    pct >= 80 ? 'Exceptional loyalty' : 
    pct >= 60 ? 'Strong retention' : 'Engagement opportunity';

  const getOrganizationDescription = (pct: number) =>
    pct >= 85 ? 'Excellently organized' : 
    pct >= 70 ? 'Well structured' : 'Organization needed';

  const getEngagementInsight = (rate: number) =>
    rate >= 25 ? { icon: '🚀', text: 'Your member engagement rate is above average!' } :
    rate >= 15 ? { icon: '📈', text: 'Solid member engagement with room to grow' } :
    { icon: '⚠️', text: 'Consider strategies to boost regular member participation' };

  const getSatisfactionInsight = (rating: number) =>
    rating >= 4.0 ? { icon: '✨', text: 'Regular members love your events!' } :
    rating >= 3.0 ? { icon: '👍', text: 'Good feedback from members overall' } :
    { icon: '🔧', text: 'Focus on event quality improvements for members' };

  return (
    <View style={styles.chartCard}>
      <View style={styles.metricsHeader}>
        <Text style={styles.chartTitle}>📊 Regular Member Engagement Metrics</Text>
        <Text style={styles.metricsSubtitle}>Performance indicators from regular members only</Text>
      </View>
      
      <View style={styles.metricsGrid}>
        <EngagementMetricCard
          icon="👥"
          label="Member Engagement Rate"
          value={`${engagementRate.toFixed(1)}%`}
          description={getEngagementDescription(engagementRate)}
          percentage={engagementRate}
          color="#4285F4"
        />
        <EngagementMetricCard
          icon="⭐"
          label="Member Satisfaction"
          value={`${avgRating.toFixed(1)}/5.0`}
          description={getSatisfactionDescription(avgRating)}
          percentage={(avgRating / 5) * 100}
          color="#34A853"
        />
        <EngagementMetricCard
          icon="🔄"
          label="Member Retention Rate"
          value={`${wouldAttendAgainPct.toFixed(1)}%`}
          description={getRetentionDescription(wouldAttendAgainPct)}
          percentage={wouldAttendAgainPct}
          color="#FBBC04"
        />
        <EngagementMetricCard
          icon="🎯"
          label="Organization Quality"
          value={`${wellOrganizedPct.toFixed(1)}%`}
          description={getOrganizationDescription(wellOrganizedPct)}
          percentage={wellOrganizedPct}
          color="#EA4335"
        />
      </View>

      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>💡 Quick Insights</Text>
        <View style={styles.insightsList}>
          <InsightItem {...getEngagementInsight(engagementRate)} />
          <InsightItem {...getSatisfactionInsight(avgRating)} />
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// FEEDBACK SECTION
// ============================================================================

type FeedbackSectionProps = {
  recentComments: Array<{
    rating: number;
    comments: string;
    created_at: string;
  }>;
  formatDate: (date: string) => string;
};

export const FeedbackSection: React.FC<FeedbackSectionProps> = ({ recentComments, formatDate }) => (
  <View style={styles.chartCard}>
    <Text style={styles.chartTitle}>Recent Feedback</Text>
    {recentComments.length > 0 ? (
      <View style={styles.feedbackList}>
        {recentComments.slice(0, 3).map((feedback, index) => (
          <FeedbackItem
            key={index}
            rating={feedback.rating}
            comments={feedback.comments}
            date={formatDate(feedback.created_at)}
          />
        ))}
      </View>
    ) : (
      <View style={styles.noFeedbackContainer}>
        <Text style={styles.noFeedbackTitle}>No Feedback Yet</Text>
        <Text style={styles.noFeedbackText}>
          Encourage attendees to share their thoughts after events.
        </Text>
      </View>
    )}
  </View>
);

// ============================================================================
// EVENTS SECTION
// ============================================================================

type EventsSectionProps = {
  events: Array<{
    id: string;
    title: string;
    start_time: string;
    location: string;
    point_value: number;
    point_type: string;
    creator_name: string;
    attendance_count: number;
    attendance_rate?: number;
  }>;
  position: string;
  formatDate: (date: string) => string;
};

export const EventsSection: React.FC<EventsSectionProps> = ({ events, position, formatDate }) => (
  <View style={styles.chartCard}>
    <Text style={styles.chartTitle}>Your Events</Text>
    {events.length > 0 ? (
      <View style={styles.eventsGrid}>
        {events.map((event) => (
          <OfficerEventCard
            key={event.id}
            title={event.title}
            date={formatDate(event.start_time)}
            location={event.location}
            creator={event.creator_name}
            pointValue={event.point_value}
            pointType={event.point_type}
            attendanceCount={event.attendance_count}
            attendanceRate={event.attendance_rate || 0}
          />
        ))}
      </View>
    ) : (
      <View style={styles.noEventsContainer}>
        <Text style={styles.noEventsTitle}>No Events</Text>
        <Text style={styles.noEventsText}>
          No events have been created yet.
        </Text>
      </View>
    )}
  </View>
);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#202124',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#80868b',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 13,
    color: '#80868b',
    textAlign: 'center',
    padding: 20,
  },
  metricsHeader: {
    marginBottom: 20,
  },
  metricsSubtitle: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
  },
  metricsGrid: {
    gap: 12,
  },
  insightsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
  },
  insightsList: {
    gap: 12,
  },
  feedbackList: {
    marginTop: 4,
  },
  noFeedbackContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noFeedbackTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5f6368',
    marginBottom: 6,
    textAlign: 'center',
  },
  noFeedbackText: {
    fontSize: 13,
    color: '#80868b',
    textAlign: 'center',
    lineHeight: 18,
  },
  eventsGrid: {
    gap: 12,
    marginTop: 8,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  noEventsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5f6368',
    marginBottom: 6,
    textAlign: 'center',
  },
  noEventsText: {
    fontSize: 13,
    color: '#80868b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
