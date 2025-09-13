import React, { useEffect, useState } from 'react';
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
import { supabase } from '../../lib/supabase';

// Helper functions to format dates in EST timezone consistently
const formatDateInEST = (dateString: string, options: Intl.DateTimeFormatOptions) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    ...options
  });
};

const getDateInEST = (dateString: string) => {
  const date = new Date(dateString + (dateString.includes('T') ? '' : 'T00:00:00'));
  const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return estDate;
};

type KPICardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  color?: string;
};

type UserStats = {
  total: number;
  by_pledge_class: Record<string, number>;
  by_majors: Record<string, number>;
  by_expected_graduation: Record<string, number>;
};

type EventStats = {
  total: number;
  by_point_type: Record<string, number>;
  average_attendance: number;
  by_month: Record<string, number>;
  upcoming: number;
  attendance_trend: { month: string; count: number }[];
  engagement_rate: number;
  growth_rate: number;
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

// KPI Card Component
const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, trend, color = '#4285F4' }) => {
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
};

export default function OfficerAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [officerPosition, setOfficerPosition] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    by_pledge_class: {},
    by_majors: {},
    by_expected_graduation: {},
  });
  const [eventStats, setEventStats] = useState<EventStats>({
    total: 0,
    by_point_type: {},
    average_attendance: 0,
    by_month: {},
    upcoming: 0,
    attendance_trend: [],
    engagement_rate: 0,
    growth_rate: 0,
  });
  const [pointDistribution, setPointDistribution] = useState<
    { name: string; points: number; color: string; legendFontColor: string; legendFontSize: number }[]
  >([]);
  const [feedbackStats, setFeedbackStats] = useState<{
    avgRating: number;
    wouldAttendAgainPct: number;
    wellOrganizedPct: number;
    recentComments: { rating: number; comments: string; created_at: string; event_id: string }[];
  }>({
    avgRating: 0,
    wouldAttendAgainPct: 0,
    wellOrganizedPct: 0,
    recentComments: [],
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Get current officer's position
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('No user');

      // Get the officer's position from users table
      const { data: officerData, error: officerError } = await supabase
        .from('users')
        .select('officer_position')
        .eq('user_id', user.id)
        .single();
      
      if (officerError || !officerData?.officer_position) {
        console.error('Role check error:', officerError);
        throw new Error('Officer position not found');
      }
      
      setOfficerPosition(officerData.officer_position);

      // Get all officers with the same position
      const { data: officersWithSamePosition, error: officersError } = await supabase
        .from('users')
        .select('user_id')
        .eq('officer_position', officerData.officer_position)
        .neq('officer_position', null);
      
      if (officersError) throw officersError;
      
      const officerIds = officersWithSamePosition.map(o => o.user_id);

      // Fetch events created by all officers with this position
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, point_value, point_type, start_time')
        .eq('status', 'approved')
        .in('created_by', officerIds);
      
      if (eventsError) throw eventsError;
      
      const eventIds = eventsData.map(e => e.id);
      const now = new Date();
      const eventStatsTemp: EventStats = {
        total: eventsData.length,
        by_point_type: {},
        average_attendance: 0,
        by_month: {},
        upcoming: 0,
        attendance_trend: [],
        engagement_rate: 0,
        growth_rate: 0,
      };
      
      eventStatsTemp.upcoming = eventsData.filter(event => getDateInEST(event.start_time) > now).length;
      
      // Process event data for analytics
      const monthlyData: Record<string, { events: number; attendance: number }> = {};
      eventsData.forEach(event => {
        eventStatsTemp.by_point_type[event.point_type] = (eventStatsTemp.by_point_type[event.point_type] || 0) + 1;
        const month = formatDateInEST(event.start_time, { month: 'short', year: 'numeric' });
        eventStatsTemp.by_month[month] = (eventStatsTemp.by_month[month] || 0) + 1;
        
        if (!monthlyData[month]) {
          monthlyData[month] = { events: 0, attendance: 0 };
        }
        monthlyData[month].events += 1;
      });
      
      // Create attendance trend data (last 6 months)
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        last6Months.push({
          month: date.toLocaleString('default', { month: 'short' }),
          count: monthlyData[monthKey]?.events || 0
        });
      }
      eventStatsTemp.attendance_trend = last6Months;
      
      // Initialize attendance tracking variables
      let attendanceByEvent: Record<string, number> = {};
      let attendeeUserIds: Set<string> = new Set();
      
      // First, get all non-officer, non-admin users for filtering
      const { data: regularUsers, error: regularUsersError } = await supabase
        .from('users')
        .select('user_id')
        .is('officer_position', null)
        .neq('role', 'admin');
      
      if (regularUsersError) throw regularUsersError;
      
      const regularUserIds = new Set(regularUsers?.map(u => u.user_id) || []);
      
      // Fetch attendance for events by officers with this position, excluding officers/admins
      if (eventIds.length > 0) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('event_attendance')
          .select('event_id, user_id')
          .in('event_id', eventIds);
        
        if (attendanceError) throw attendanceError;
        
        // Filter attendance data to only include regular members (non-officers/non-admins)
        const filteredAttendance = attendanceData?.filter(record => 
          regularUserIds.has(record.user_id)
        ) || [];
        
        filteredAttendance.forEach(record => {
          attendanceByEvent[record.event_id] = (attendanceByEvent[record.event_id] || 0) + 1;
          attendeeUserIds.add(record.user_id);
        });
      }
      
      eventStatsTemp.average_attendance = 
        Object.values(attendanceByEvent).reduce((sum, count) => sum + count, 0) / (Object.keys(attendanceByEvent).length || 1);
      
      // Calculate engagement rate (unique attendees vs total registered regular members)
      eventStatsTemp.engagement_rate = (regularUsers && regularUsers.length > 0) ? 
        (attendeeUserIds.size / regularUsers.length) * 100 : 0;
      
      // Calculate growth rate (comparing last 3 months vs previous 3 months)
      const currentQuarter = last6Months.slice(3).reduce((sum, month) => sum + month.count, 0);
      const previousQuarter = last6Months.slice(0, 3).reduce((sum, month) => sum + month.count, 0);
      
      // Fixed growth rate calculation with proper edge case handling
      if (previousQuarter > 0) {
        eventStatsTemp.growth_rate = ((currentQuarter - previousQuarter) / previousQuarter) * 100;
      } else if (currentQuarter > 0) {
        // If previous quarter was 0 but current has events, that's 100% growth
        eventStatsTemp.growth_rate = 100;
      } else {
        // Both quarters are 0, no growth
        eventStatsTemp.growth_rate = 0;
      }
      
      setEventStats(eventStatsTemp);
      
      // Format point type distribution for pie chart
      const formattedData = Object.entries(eventStatsTemp.by_point_type).map(([name, points], i) => ({
        name,
        points: points as number,
        color: pieColors[i % pieColors.length],
        legendFontColor: '#333',
        legendFontSize: 13,
      }));
      setPointDistribution(formattedData);

      // Fetch user stats for regular member attendees only (excluding officers/admins)
      let attendeeStats: UserStats = {
        total: 0,
        by_pledge_class: {},
        by_majors: {},
        by_expected_graduation: {},
      };
      if (attendeeUserIds.size > 0) {
        const { data: attendeeProfiles, error: attendeeError } = await supabase
          .from('users')
          .select('pledge_class, majors, expected_graduation')
          .in('user_id', Array.from(attendeeUserIds))
          .is('officer_position', null)
          .neq('role', 'admin');
        
        if (attendeeError) {
          console.error('Attendee profiles error:', attendeeError);
          throw attendeeError;
        }
        
        attendeeStats.total = attendeeProfiles.length;
        attendeeProfiles.forEach(user => {
          if (user.pledge_class) {
            attendeeStats.by_pledge_class[user.pledge_class] = (attendeeStats.by_pledge_class[user.pledge_class] || 0) + 1;
          }
          if (user.majors) {
            attendeeStats.by_majors[user.majors] = (attendeeStats.by_majors[user.majors] || 0) + 1;
          }
          if (user.expected_graduation) {
            attendeeStats.by_expected_graduation[user.expected_graduation] = (attendeeStats.by_expected_graduation[user.expected_graduation] || 0) + 1;
          }
        });
      }
      setUserStats(attendeeStats);

      // Fetch event feedback for events by officers with this position (from regular members only)
      let feedbackStatsData = {
        avgRating: 0,
        wouldAttendAgainPct: 0,
        wellOrganizedPct: 0,
        recentComments: [] as { rating: number; comments: string; created_at: string; event_id: string }[],
      };
      
      if (eventIds.length > 0) {
        // Get feedback from regular members only
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('event_feedback')
          .select('id, user_id, event_id, rating, comments, would_attend_again, well_organized, created_at')
          .in('event_id', eventIds)
          .in('user_id', Array.from(regularUserIds));
        
        if (feedbackError) {
          console.error('Feedback fetch error:', feedbackError);
        } else if (feedbackData && feedbackData.length > 0) {
          // Calculate average rating with proper validation
          const validRatings = feedbackData.filter(f => f.rating && f.rating > 0);
          feedbackStatsData.avgRating = validRatings.length > 0 ? 
            validRatings.reduce((sum, f) => sum + f.rating, 0) / validRatings.length : 0;
          
          // Calculate percentages with proper validation
          const totalResponses = feedbackData.length;
          feedbackStatsData.wouldAttendAgainPct = totalResponses > 0 ? 
            (feedbackData.filter(f => f.would_attend_again === true).length / totalResponses) * 100 : 0;
          feedbackStatsData.wellOrganizedPct = totalResponses > 0 ? 
            (feedbackData.filter(f => f.well_organized === true).length / totalResponses) * 100 : 0;
          feedbackStatsData.recentComments = feedbackData
            .filter(f => f.comments)
            .slice(-10)
            .map(f => ({
              rating: f.rating,
              comments: f.comments,
              created_at: f.created_at || '',
              event_id: f.event_id
            }));
        }
      }
      
      setFeedbackStats(feedbackStatsData);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      // Set loading to false even on error so UI doesn't stay in loading state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading analytics dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>📊 Officer Analytics Dashboard</Text>
        <Text style={styles.subtitle}>
          {officerPosition?.replace('_', ' ').toUpperCase() || 'Officer'} Performance & Insights
        </Text>
        <Text style={styles.noteText}>
          📝 Note: Analytics exclude officers and admins to focus on regular member engagement
        </Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <KPICard
          title="Avg Rating"
          value={feedbackStats.avgRating.toFixed(1)}
          subtitle="⭐ out of 5.0"
          color="#4285F4"
        />
        <KPICard
          title="Avg Attendance"
          value={eventStats.average_attendance.toFixed(0)}
          subtitle="members per event"
          trend={eventStats.growth_rate}
          color="#34A853"
        />
      </View>

      <View style={styles.kpiRow}>
        <KPICard
          title="Member Engagement"
          value={`${eventStats.engagement_rate.toFixed(1)}%`}
          subtitle="regular member participation"
          color="#FBBC04"
        />
        <KPICard
          title="Total Events"
          value={eventStats.total}
          subtitle="events created"
          color="#EA4335"
        />
      </View>

      {/* Attendance Trend Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📈 Event Creation Over Time</Text>
        {eventStats.attendance_trend.length > 0 && (
          <LineChart
            data={{
              labels: eventStats.attendance_trend.map(d => d.month),
              datasets: [{
                data: eventStats.attendance_trend.map(d => d.count),
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
        {Object.keys(userStats.by_pledge_class).length > 0 ? (
          <BarChart
            data={{
              labels: Object.keys(userStats.by_pledge_class).slice(0, 6),
              datasets: [{
                data: Object.values(userStats.by_pledge_class).slice(0, 6)
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
          <Text style={styles.noDataText}>No demographic data available yet.</Text>
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
          <Text style={styles.noDataText}>No event data available yet.</Text>
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
                {eventStats.engagement_rate.toFixed(1)}%
              </Text>
              <Text style={styles.metricDescription}>
                {eventStats.engagement_rate >= 30 ? 'Excellent member participation' : 
                 eventStats.engagement_rate >= 15 ? 'Good member involvement' : 'Needs improvement'}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: `${Math.min(eventStats.engagement_rate, 100)}%`, 
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
                {feedbackStats.avgRating.toFixed(1)}/5.0
              </Text>
              <Text style={styles.metricDescription}>
                {feedbackStats.avgRating >= 4.0 ? 'Outstanding quality' : 
                 feedbackStats.avgRating >= 3.0 ? 'Good experience' : 'Room for improvement'}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: `${Math.min((feedbackStats.avgRating / 5) * 100, 100)}%`, 
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
                {feedbackStats.wouldAttendAgainPct.toFixed(1)}%
              </Text>
              <Text style={styles.metricDescription}>
                {feedbackStats.wouldAttendAgainPct >= 80 ? 'Exceptional loyalty' : 
                 feedbackStats.wouldAttendAgainPct >= 60 ? 'Strong retention' : 'Engagement opportunity'}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: `${Math.min(feedbackStats.wouldAttendAgainPct, 100)}%`, 
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
                {feedbackStats.wellOrganizedPct.toFixed(1)}%
              </Text>
              <Text style={styles.metricDescription}>
                {feedbackStats.wellOrganizedPct >= 85 ? 'Excellently organized' : 
                 feedbackStats.wellOrganizedPct >= 70 ? 'Well structured' : 'Organization needed'}
              </Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { 
                  width: `${Math.min(feedbackStats.wellOrganizedPct, 100)}%`, 
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
                {eventStats.engagement_rate >= 25 ? '🚀' : eventStats.engagement_rate >= 15 ? '📈' : '⚠️'}
              </Text>
              <Text style={styles.insightText}>
                {eventStats.engagement_rate >= 25 ? 'Your member engagement rate is above average!' : 
                 eventStats.engagement_rate >= 15 ? 'Solid member engagement with room to grow' : 
                 'Consider strategies to boost regular member participation'}
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightIcon}>
                {feedbackStats.avgRating >= 4.0 ? '✨' : feedbackStats.avgRating >= 3.0 ? '👍' : '🔧'}
              </Text>
              <Text style={styles.insightText}>
                {feedbackStats.avgRating >= 4.0 ? 'Regular members love your events!' : 
                 feedbackStats.avgRating >= 3.0 ? 'Good feedback from members overall' : 
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
        {feedbackStats.recentComments.length > 0 ? (
          <View style={styles.feedbackList}>
            {feedbackStats.recentComments.slice(0, 5).map((feedback, index) => (
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
});
