import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { BarChart, LineChart, PieChart } from '../../components/IOSCharts';
import { formatDateInEST } from '../../lib/dateUtils';
import { supabase } from '../../lib/supabase';

type KPICardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  color?: string;
};

// Database response type matching the SQL function output
type AnalyticsDashboardData = {
  officer_position: string;
  total_regular_users: number;
  event_stats: {
    total: number;
    upcoming: number;
    by_point_type: Record<string, number>;
    by_month: Record<string, number>;
    attendance_trend: { month: string; count: number }[];
  };
  attendance_stats: {
    by_event: Record<string, number>;
    unique_attendees: number;
    total_attendances: number;
  };
  user_demographics: {
    total: number;
    by_pledge_class: Record<string, number>;
    by_majors: Record<string, number>;
    by_expected_graduation: Record<string, number>;
  };
  feedback_stats: {
    avg_rating: number;
    would_attend_again_pct: number;
    well_organized_pct: number;
    recent_comments: Array<{
      rating: number;
      comments: string;
      created_at: string;
      event_id: string;
    }>;
  };
  individual_events: Array<{
    id: string;
    title: string;
    start_time: string;
    location: string;
    point_value: number;
    point_type: string;
    creator_name: string;
    attendance_count: number;
  }>;
};

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

// Memoized KPI Card Component
const KPICard: React.FC<KPICardProps> = React.memo(({ title, value, subtitle, trend, color = '#4285F4' }) => {
  const trendColor = trend ? (trend >= 0 ? '#34A853' : '#EA4335') : '#80868b';
  const trendSymbol = trend ? (trend >= 0 ? '↑' : '↓') : '';
  
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.kpiSubtitle}>{subtitle}</Text>}
      {trend !== undefined && (
        <Text style={[styles.kpiTrend, { color: trendColor }]}>
          {trendSymbol} {Math.abs(trend).toFixed(1)}%
        </Text>
      )}
    </View>
  );
});

export default function OfficerAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Memoized function to fetch analytics - SINGLE DATABASE CALL
  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      
      // Step 1: Get current user's officer position
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('No user');

      const { data: officerData, error: officerError } = await supabase
        .from('users')
        .select('officer_position')
        .eq('user_id', user.id)
        .single();

      if (officerError) throw new Error(`Failed to fetch officer data: ${officerError.message}`);
      if (!officerData?.officer_position) throw new Error('User is not assigned an officer position');

      // Step 2: SINGLE RPC CALL to get ALL analytics data
      const { data, error: rpcError } = await supabase.rpc('get_officer_analytics_dashboard', {
        p_officer_position: officerData.officer_position
      });

      if (rpcError) throw rpcError;
      if (!data) throw new Error('No data returned from analytics function');

      // Step 3: SINGLE state update with all data
      setDashboardData(data as AnalyticsDashboardData);
      
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      await fetchAnalytics();
      if (isMounted) setLoading(false);
    };
    loadData();
    return () => { isMounted = false; };
  }, [fetchAnalytics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }, [fetchAnalytics]);

  // Memoized computed values to avoid recalculation on every render
  const computedMetrics = useMemo(() => {
    if (!dashboardData) return null;

    const { event_stats, attendance_stats, feedback_stats, user_demographics, total_regular_users } = dashboardData;
    
    // Calculate average attendance per event
    const totalAttendances = attendance_stats.total_attendances;
    const eventCount = event_stats.total || 1;
    const averageAttendance = totalAttendances / eventCount;

    // Calculate engagement rate (capped at 100% to handle data anomalies)
    const engagementRate = total_regular_users > 0 
      ? Math.min(100, (attendance_stats.unique_attendees / total_regular_users) * 100)
      : 0;

    // Calculate growth rate from attendance trend (only if sufficient data)
    const trend = event_stats.attendance_trend || [];
    let growthRate = 0;
    if (trend.length >= 6) {
      const currentQuarter = trend.slice(3).reduce((sum, m) => sum + m.count, 0);
      const previousQuarter = trend.slice(0, 3).reduce((sum, m) => sum + m.count, 0);
      growthRate = previousQuarter > 0 
        ? ((currentQuarter - previousQuarter) / previousQuarter) * 100
        : currentQuarter > 0 ? 100 : 0;
    }

    // Format point distribution for pie chart
    const pointDistribution = Object.entries(event_stats.by_point_type || {}).map(([name, points], i) => ({
      name,
      points: points as number,
      color: pieColors[i % pieColors.length],
      legendFontColor: '#333',
      legendFontSize: 13,
    }));

    // Enrich individual events with attendance rate and pre-computed display values
    const enrichedEvents = dashboardData.individual_events.map(event => {
      const rate = total_regular_users > 0 
        ? Math.min(100, (event.attendance_count / total_regular_users) * 100)
        : 0;
      return {
        ...event,
        attendance_rate: rate,
        roundedRate: Math.round(rate),
        rateColor: rate >= 70 ? '#34a853' : rate >= 50 ? '#fbbc04' : '#ea4335'
      };
    });

    // Pre-compute recent comments slice
    const recentComments = feedback_stats.recent_comments.slice(0, 5);

    return {
      averageAttendance,
      engagementRate,
      growthRate,
      pointDistribution,
      enrichedEvents,
      recentComments
    };
  }, [dashboardData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading analytics dashboard...</Text>
      </View>
    );
  }

  if (error || !dashboardData || !computedMetrics) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.centered}>
          <Text style={styles.errorText}>❌ {error || 'Failed to load analytics'}</Text>
          <Text style={styles.errorSubtext}>Pull down to retry</Text>
        </View>
      </ScrollView>
    );
  }

  const { event_stats, feedback_stats, user_demographics } = dashboardData;
  const { averageAttendance, engagementRate, growthRate, pointDistribution, enrichedEvents, recentComments } = computedMetrics;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>📊 Officer Analytics Dashboard</Text>
        <Text style={styles.subtitle}>
          {dashboardData.officer_position?.replace('_', ' ').toUpperCase() || 'Officer'} Performance & Insights
        </Text>
        <Text style={styles.noteText}>
          📝 Note: Analytics exclude officers and admins to focus on regular member engagement
        </Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <KPICard
          title="Avg Rating"
          value={feedback_stats.avg_rating.toFixed(1)}
          subtitle="⭐ out of 5.0"
          color="#4285F4"
        />
        <KPICard
          title="Avg Attendance"
          value={averageAttendance.toFixed(0)}
          subtitle="members per event"
          trend={growthRate}
          color="#34A853"
        />
      </View>

      <View style={styles.kpiRow}>
        <KPICard
          title="Member Engagement"
          value={`${engagementRate.toFixed(1)}%`}
          subtitle="regular member participation"
          color="#FBBC04"
        />
        <KPICard
          title="Total Events"
          value={event_stats.total}
          subtitle="events created"
          color="#EA4335"
        />
      </View>

      {/* Attendance Trend Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📈 Event Creation Over Time</Text>
        {event_stats.attendance_trend.length > 0 && (
          <LineChart
            data={{
              labels: event_stats.attendance_trend.map((d: { month: string }) => d.month),
              datasets: [{
                data: event_stats.attendance_trend.map((d: { count: number }) => d.count),
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

      {/* Demographics Breakdown */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>👥 Regular Member Demographics by Pledge Class</Text>
        <Text style={styles.chartSubtitle}>Attendees of your events (excluding officers/admins)</Text>
        {Object.keys(user_demographics.by_pledge_class).length > 0 ? (
          <BarChart
            data={{
              labels: Object.keys(user_demographics.by_pledge_class).slice(0, 6),
              datasets: [{
                data: Object.values(user_demographics.by_pledge_class).slice(0, 6) as number[]
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

      {/* Event Type Distribution */}
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

      {/* Enhanced Engagement Metrics */}
      <View style={styles.chartCard}>
        <View style={styles.metricsHeader}>
          <Text style={styles.chartTitle}>📊 Regular Member Engagement Metrics</Text>
          <Text style={styles.metricsSubtitle}>Performance indicators from regular members only</Text>
        </View>
        
        <View style={styles.metricsGrid}>
          {/* Engagement Rate Card */}
          <View style={[styles.metricCard, { borderLeftColor: '#4285F4' }]}>
            <View style={styles.metricIconContainer}>
              <Text style={styles.metricIcon}>👥</Text>
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Member Engagement Rate</Text>
              <Text style={[styles.metricValue, { color: '#4285F4' }]}>
                {engagementRate.toFixed(1)}%
              </Text>
              <Text style={styles.metricDescription}>
                {engagementRate >= 30 ? 'Excellent member participation' : 
                 engagementRate >= 15 ? 'Good member involvement' : 'Needs improvement'}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: `${engagementRate}%`, 
                  backgroundColor: '#4285F4' 
                }]} />
              </View>
            </View>
          </View>

          {/* Satisfaction Score Card */}
          <View style={[styles.metricCard, { borderLeftColor: '#34A853' }]}>
            <View style={styles.metricIconContainer}>
              <Text style={styles.metricIcon}>⭐</Text>
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Member Satisfaction</Text>
              <Text style={[styles.metricValue, { color: '#34A853' }]}>
                {feedback_stats.avg_rating.toFixed(1)}/5.0
              </Text>
              <Text style={styles.metricDescription}>
                {feedback_stats.avg_rating >= 4.0 ? 'Outstanding quality' : 
                 feedback_stats.avg_rating >= 3.0 ? 'Good experience' : 'Room for improvement'}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: `${(feedback_stats.avg_rating / 5) * 100}%`, 
                  backgroundColor: '#34A853' 
                }]} />
              </View>
            </View>
          </View>

          {/* Retention Rate Card */}
          <View style={[styles.metricCard, { borderLeftColor: '#FBBC04' }]}>
            <View style={styles.metricIconContainer}>
              <Text style={styles.metricIcon}>🔄</Text>
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Member Retention Rate</Text>
              <Text style={[styles.metricValue, { color: '#FBBC04' }]}>
                {feedback_stats.would_attend_again_pct.toFixed(1)}%
              </Text>
              <Text style={styles.metricDescription}>
                {feedback_stats.would_attend_again_pct >= 80 ? 'Exceptional loyalty' : 
                 feedback_stats.would_attend_again_pct >= 60 ? 'Strong retention' : 'Engagement opportunity'}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: `${feedback_stats.would_attend_again_pct}%`, 
                  backgroundColor: '#FBBC04' 
                }]} />
              </View>
            </View>
          </View>

          {/* Organization Quality Card */}
          <View style={[styles.metricCard, { borderLeftColor: '#EA4335' }]}>
            <View style={styles.metricIconContainer}>
              <Text style={styles.metricIcon}>🎯</Text>
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Organization Quality</Text>
              <Text style={[styles.metricValue, { color: '#EA4335' }]}>
                {feedback_stats.well_organized_pct.toFixed(1)}%
              </Text>
              <Text style={styles.metricDescription}>
                {feedback_stats.well_organized_pct >= 85 ? 'Excellently organized' : 
                 feedback_stats.well_organized_pct >= 70 ? 'Well structured' : 'Organization needed'}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: `${feedback_stats.well_organized_pct}%`, 
                  backgroundColor: '#EA4335' 
                }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>💡 Quick Insights</Text>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Text style={styles.insightIcon}>
                {engagementRate >= 25 ? '🚀' : engagementRate >= 15 ? '📈' : '⚠️'}
              </Text>
              <Text style={styles.insightText}>
                {engagementRate >= 25 ? 'Your member engagement rate is above average!' : 
                 engagementRate >= 15 ? 'Solid member engagement with room to grow' : 
                 'Consider strategies to boost regular member participation'}
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightIcon}>
                {feedback_stats.avg_rating >= 4.0 ? '✨' : feedback_stats.avg_rating >= 3.0 ? '👍' : '🔧'}
              </Text>
              <Text style={styles.insightText}>
                {feedback_stats.avg_rating >= 4.0 ? 'Regular members love your events!' : 
                 feedback_stats.avg_rating >= 3.0 ? 'Good feedback from members overall' : 
                 'Focus on event quality improvements for members'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Comments */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>💬 Recent Member Feedback</Text>
        <Text style={styles.chartSubtitle}>Comments from regular members only</Text>
        {recentComments.length > 0 ? (
          <View style={styles.feedbackList}>
            {recentComments.map((feedback, index) => (
              <View key={index} style={styles.feedbackItem}>
                <View style={styles.feedbackHeader}>
                  <View style={styles.ratingContainer}>
                    {[...Array(5)].map((_, i) => (
                      <Text key={i} style={[styles.star, { color: i < feedback.rating ? '#FBBC04' : '#e0e0e0' }]}>★</Text>
                    ))}
                  </View>
                  <Text style={styles.feedbackDate}>
                    {formatDateInEST(feedback.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={styles.feedbackText}>&quot;{feedback.comments}&quot;</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noFeedbackContainer}>
            <Text style={styles.noFeedbackTitle}>🎯 No Member Feedback Yet</Text>
            <Text style={styles.noFeedbackText}>
              Your events haven&apos;t received feedback responses from regular members yet. Encourage attendees to share their thoughts to improve future events!
            </Text>
          </View>
        )}
      </View>

      {/* Individual Events Section */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📅 Individual Events by {dashboardData.officer_position?.replace('_', ' ').toUpperCase() || 'Officer'}</Text>
        <Text style={styles.chartSubtitle}>Detailed attendance data for each event</Text>
        {enrichedEvents.length > 0 ? (
          <View style={styles.eventsGrid}>
            {enrichedEvents.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsText}>{event.point_value} pts</Text>
                  </View>
                </View>
                <Text style={styles.eventDate}>
                  {formatDateInEST(event.start_time, { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </Text>
                <Text style={styles.eventLocation}>📍 {event.location}</Text>
                <Text style={styles.eventCreator}>👤 Created by: {event.creator_name}</Text>
                <View style={styles.attendanceInfo}>
                  <View style={styles.attendanceStats}>
                    <Text style={styles.attendanceLabel}>Attendance</Text>
                    <Text style={styles.attendanceCount}>{event.attendance_count} members</Text>
                    <Text style={styles.attendanceRate}>
                      {event.attendance_rate.toFixed(1)}% of eligible members
                    </Text>
                  </View>
                  <View style={styles.attendanceIndicator}>
                    <View 
                      style={[
                        styles.attendanceCircle, 
                        { 
                          backgroundColor: event.attendance_rate >= 70 ? '#34a853' : 
                                         event.attendance_rate >= 50 ? '#fbbc04' : '#ea4335'
                        }
                      ]}
                    >
                      <Text style={styles.attendancePercent}>
                        {Math.round(event.attendance_rate)}%
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.eventTypeBadge}>
                  <Text style={styles.eventTypeText}>{event.point_type}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noEventsContainer}>
            <Text style={styles.noEventsTitle}>📋 No Events Found</Text>
            <Text style={styles.noEventsText}>
              No events have been created by officers with this position yet.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#5f6368',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EA4335',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#80868b',
    textAlign: 'center',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaed',
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#202124',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#5f6368',
    textAlign: 'center',
    marginTop: 4,
  },
  noteText: {
    fontSize: 12,
    color: '#80868b',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // KPI Card Styles
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 6,
    borderLeftWidth: 4,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  kpiTitle: {
    fontSize: 14,
    color: '#5f6368',
    fontWeight: '500',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  kpiSubtitle: {
    fontSize: 12,
    color: '#80868b',
    marginBottom: 8,
  },
  kpiTrend: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Chart Styles
  chartCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#80868b',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  chart: {
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#80868b',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 24,
  },
  // Progress Bar Styles
  progressContainer: {
    paddingVertical: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    width: 80,
    fontSize: 14,
    color: '#5f6368',
    fontWeight: '500',
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f1f3f4',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    width: 50,
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '600',
    textAlign: 'right',
  },
  // Feedback Styles
  feedbackList: {
    marginTop: 8,
  },
  feedbackItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4285F4',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    marginRight: 2,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
  },
  feedbackText: {
    fontSize: 14,
    color: '#202124',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // No Feedback Styles
  noFeedbackContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noFeedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5f6368',
    marginBottom: 8,
    textAlign: 'center',
  },
  noFeedbackText: {
    fontSize: 14,
    color: '#80868b',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Enhanced Metrics Styles
  metricsHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  metricsSubtitle: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
    textAlign: 'center',
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  metricIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 18,
  },
  metricContent: {
    paddingRight: 40,
  },
  metricLabel: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 12,
    color: '#80868b',
    marginBottom: 12,
    lineHeight: 16,
  },
  insightsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e8eaed',
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
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
  },
  insightIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    fontSize: 13,
    color: '#5f6368',
    lineHeight: 18,
    flex: 1,
  },
  // Individual Events Styles
  eventsGrid: {
    gap: 16,
    marginTop: 16,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#4285F4',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202124',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  pointsBadge: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  eventDate: {
    fontSize: 14,
    color: '#5f6368',
    fontWeight: '500',
    marginBottom: 6,
  },
  eventLocation: {
    fontSize: 13,
    color: '#5f6368',
    marginBottom: 4,
  },
  eventCreator: {
    fontSize: 13,
    color: '#5f6368',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  attendanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  attendanceStats: {
    flex: 1,
  },
  attendanceLabel: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attendanceCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 2,
  },
  attendanceRate: {
    fontSize: 12,
    color: '#5f6368',
  },
  attendanceIndicator: {
    marginLeft: 16,
  },
  attendanceCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendancePercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f0fe',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4285F4',
    textTransform: 'capitalize',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  noEventsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5f6368',
    marginBottom: 8,
    textAlign: 'center',
  },
  noEventsText: {
    fontSize: 14,
    color: '#80868b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
