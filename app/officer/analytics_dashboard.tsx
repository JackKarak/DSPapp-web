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
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { supabase } from '../../lib/supabase';

type UserStats = {
  total: number;
  by_pledge_class: Record<string, number>;
  by_majors: Record<string, number>;
  by_graduation_year: Record<string, number>;
};

type EventStats = {
  total: number;
  by_point_type: Record<string, number>;
  average_attendance: number;
  by_month: Record<string, number>;
  upcoming: number;
  attendance_trend: Array<{ month: string; count: number }>;
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

export default function OfficerAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [officerPosition, setOfficerPosition] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    by_pledge_class: {},
    by_majors: {},
    by_graduation_year: {},
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
    recentComments: Array<{ rating: number; comments: string; created_at: string; event_id: string }>;
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
      
      eventStatsTemp.upcoming = eventsData.filter(event => new Date(event.start_time) > now).length;
      
      // Process event data for analytics
      const monthlyData: Record<string, { events: number; attendance: number }> = {};
      eventsData.forEach(event => {
        eventStatsTemp.by_point_type[event.point_type] = (eventStatsTemp.by_point_type[event.point_type] || 0) + 1;
        const month = new Date(event.start_time).toLocaleString('default', { month: 'short', year: 'numeric' });
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
      
      // Fetch attendance for all events by officers with this position
      let attendanceByEvent: Record<string, number> = {};
      let attendeeUserIds: Set<string> = new Set();
      if (eventIds.length > 0) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('event_attendance')
          .select('event_id, user_id')
          .in('event_id', eventIds);
        
        if (attendanceError) throw attendanceError;
        
        attendanceData.forEach(record => {
          attendanceByEvent[record.event_id] = (attendanceByEvent[record.event_id] || 0) + 1;
          attendeeUserIds.add(record.user_id);
        });
      }
      
      eventStatsTemp.average_attendance = 
        Object.values(attendanceByEvent).reduce((sum, count) => sum + count, 0) / (Object.keys(attendanceByEvent).length || 1);
      
      // Calculate engagement rate (attendees vs total registered users)
      const { data: totalUsers } = await supabase
        .from('users')
        .select('user_id', { count: 'exact' });
      
      eventStatsTemp.engagement_rate = totalUsers ? (attendeeUserIds.size / totalUsers.length) * 100 : 0;
      
      // Calculate growth rate (comparing last 3 months vs previous 3 months)
      const currentQuarter = last6Months.slice(3).reduce((sum, month) => sum + month.count, 0);
      const previousQuarter = last6Months.slice(0, 3).reduce((sum, month) => sum + month.count, 0);
      eventStatsTemp.growth_rate = previousQuarter > 0 ? ((currentQuarter - previousQuarter) / previousQuarter) * 100 : 0;
      
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

      // Fetch user stats for attendees of events by officers with this position
      let attendeeStats: UserStats = {
        total: 0,
        by_pledge_class: {},
        by_majors: {},
        by_graduation_year: {},
      };
      if (attendeeUserIds.size > 0) {
        const { data: attendeeProfiles, error: attendeeError } = await supabase
          .from('users')
          .select('pledge_class, majors, graduation_year')
          .in('user_id', Array.from(attendeeUserIds));
        
        if (attendeeError) throw attendeeError;
        
        attendeeStats.total = attendeeProfiles.length;
        attendeeProfiles.forEach(user => {
          if (user.pledge_class) {
            attendeeStats.by_pledge_class[user.pledge_class] = (attendeeStats.by_pledge_class[user.pledge_class] || 0) + 1;
          }
          if (user.majors) {
            attendeeStats.by_majors[user.majors] = (attendeeStats.by_majors[user.majors] || 0) + 1;
          }
          if (user.graduation_year) {
            attendeeStats.by_graduation_year[user.graduation_year] = (attendeeStats.by_graduation_year[user.graduation_year] || 0) + 1;
          }
        });
      }
      setUserStats(attendeeStats);

      // Fetch event feedback for events by officers with this position
      let feedbackStatsData = {
        avgRating: 0,
        wouldAttendAgainPct: 0,
        wellOrganizedPct: 0,
        recentComments: [] as Array<{ rating: number; comments: string; created_at: string; event_id: string }>,
      };
      
      if (eventIds.length > 0) {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('event_feedback')
          .select('rating, would_attend_again, well_organized, additional_comments, created_at, event_id')
          .in('event_id', eventIds);
        
        if (feedbackError) {
          console.warn('Feedback fetch error:', feedbackError);
        } else if (feedbackData && feedbackData.length > 0) {
          feedbackStatsData.avgRating = feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackData.length;
          feedbackStatsData.wouldAttendAgainPct = (feedbackData.filter(f => f.would_attend_again).length / feedbackData.length) * 100;
          feedbackStatsData.wellOrganizedPct = (feedbackData.filter(f => f.well_organized).length / feedbackData.length) * 100;
          feedbackStatsData.recentComments = feedbackData
            .filter(f => f.additional_comments)
            .slice(-10)
            .map(f => ({
              rating: f.rating,
              comments: f.additional_comments,
              created_at: f.created_at,
              event_id: f.event_id
            }));
        }
      }
      
      setFeedbackStats(feedbackStatsData);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{feedbackStats.avgRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Rating ⭐</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{eventStats.average_attendance.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Avg Attendance</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{eventStats.engagement_rate.toFixed(1)}%</Text>
          <Text style={styles.statLabel}>Engagement</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{eventStats.total}</Text>
          <Text style={styles.statLabel}>Total Events</Text>
        </View>
      </View>

      {/* Attendance Trend Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📈 Attendance Over Time</Text>
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
        <Text style={styles.chartTitle}>👥 Attendee Demographics by Pledge Class</Text>
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

      {/* Engagement Metrics */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🎪 Member Engagement Metrics</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Engagement</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { 
                width: `${Math.min(eventStats.engagement_rate, 100)}%`, 
                backgroundColor: '#4285F4' 
              }]} />
            </View>
            <Text style={styles.progressText}>{eventStats.engagement_rate.toFixed(1)}%</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Satisfaction</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { 
                width: `${Math.min((feedbackStats.avgRating / 5) * 100, 100)}%`, 
                backgroundColor: '#34A853' 
              }]} />
            </View>
            <Text style={styles.progressText}>{((feedbackStats.avgRating / 5) * 100).toFixed(1)}%</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Retention</Text>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { 
                width: `${Math.min(feedbackStats.wouldAttendAgainPct, 100)}%`, 
                backgroundColor: '#FBBC04' 
              }]} />
            </View>
            <Text style={styles.progressText}>{feedbackStats.wouldAttendAgainPct.toFixed(1)}%</Text>
          </View>
        </View>
      </View>

      {/* Recent Comments */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>💬 Recent Feedback</Text>
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
                    {new Date(feedback.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.feedbackText}>"{feedback.comments}"</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>No recent feedback available.</Text>
        )}
      </View>

      {/* Performance Summary */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📋 Performance Summary</Text>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            🎯 <Text style={styles.summaryBold}>Event Performance:</Text>{' '}
            {feedbackStats.avgRating >= 4.0 ? 'Excellent' : feedbackStats.avgRating >= 3.0 ? 'Good' : 'Needs Improvement'} 
            ({feedbackStats.avgRating.toFixed(1)}/5.0 rating)
          </Text>
          <Text style={styles.summaryText}>
            📈 <Text style={styles.summaryBold}>Engagement Trend:</Text>{' '}
            {eventStats.growth_rate >= 10 ? 'Strong Growth' : eventStats.growth_rate >= 0 ? 'Stable' : 'Declining'} 
            ({eventStats.growth_rate.toFixed(1)}% change)
          </Text>
          <Text style={styles.summaryText}>
            🎉 <Text style={styles.summaryBold}>Member Reach:</Text>{' '}
            {eventStats.engagement_rate >= 50 ? 'High' : eventStats.engagement_rate >= 25 ? 'Medium' : 'Low'} engagement 
            ({eventStats.engagement_rate.toFixed(1)}% of members)
          </Text>
        </View>
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
  // Stats Container Styles
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  statBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4285F4',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
    textAlign: 'center',
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
    marginBottom: 16,
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
  // Summary Styles
  summaryContainer: {
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 22,
    marginBottom: 8,
  },
  summaryBold: {
    fontWeight: '600',
    color: '#202124',
  },
});
