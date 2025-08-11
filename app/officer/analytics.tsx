import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { BarChart, LineChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { supabase } from '../../lib/supabase';

type UserStats = {
  total: number;
  by_pledge_class: Record<string, number>;
  by_major: Record<string, number>;
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
  const [officerPosition, setOfficerPosition] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    by_pledge_class: {},
    by_major: {},
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

  useEffect(() => {
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
        const eventStats: EventStats = {
          total: eventsData.length,
          by_point_type: {},
          average_attendance: 0,
          by_month: {},
          upcoming: 0,
          attendance_trend: [],
          engagement_rate: 0,
          growth_rate: 0,
        };
        
        eventStats.upcoming = eventsData.filter(event => new Date(event.start_time) > now).length;
        
        // Process event data for analytics
        const monthlyData: Record<string, { events: number; attendance: number }> = {};
        eventsData.forEach(event => {
          eventStats.by_point_type[event.point_type] = (eventStats.by_point_type[event.point_type] || 0) + 1;
          const month = new Date(event.start_time).toLocaleString('default', { month: 'short', year: 'numeric' });
          eventStats.by_month[month] = (eventStats.by_month[month] || 0) + 1;
          
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
        eventStats.attendance_trend = last6Months;
        
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
        
        eventStats.average_attendance = 
          Object.values(attendanceByEvent).reduce((sum, count) => sum + count, 0) / (Object.keys(attendanceByEvent).length || 1);
        
        // Calculate engagement rate (attendees vs total registered users)
        const { data: totalUsers } = await supabase
          .from('users')
          .select('user_id', { count: 'exact' });
        
        eventStats.engagement_rate = totalUsers ? (attendeeUserIds.size / totalUsers.length) * 100 : 0;
        
        // Calculate growth rate (comparing last 3 months vs previous 3 months)
        const currentQuarter = last6Months.slice(3).reduce((sum, month) => sum + month.count, 0);
        const previousQuarter = last6Months.slice(0, 3).reduce((sum, month) => sum + month.count, 0);
        eventStats.growth_rate = previousQuarter > 0 ? ((currentQuarter - previousQuarter) / previousQuarter) * 100 : 0;
        
        setEventStats(eventStats);
        
        // Format point type distribution for pie chart
        const formattedData = Object.entries(eventStats.by_point_type).map(([name, points], i) => ({
          name,
          points,
          color: pieColors[i % pieColors.length],
          legendFontColor: '#333',
          legendFontSize: 13,
        }));
        setPointDistribution(formattedData);

        // Fetch user stats for attendees of events by officers with this position
        let attendeeStats: UserStats = {
          total: 0,
          by_pledge_class: {},
          by_major: {},
          by_graduation_year: {},
        };
        if (attendeeUserIds.size > 0) {
          const { data: attendeeProfiles, error: attendeeError } = await supabase
            .from('users')
            .select('pledge_class, major, graduation_year')
            .in('user_id', Array.from(attendeeUserIds));
          
          if (attendeeError) throw attendeeError;
          
          attendeeStats.total = attendeeProfiles.length;
          attendeeProfiles.forEach(user => {
            if (user.pledge_class) {
              attendeeStats.by_pledge_class[user.pledge_class] = (attendeeStats.by_pledge_class[user.pledge_class] || 0) + 1;
            }
            if (user.major) {
              attendeeStats.by_major[user.major] = (attendeeStats.by_major[user.major] || 0) + 1;
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
          console.log('🔍 Officer Analytics - Fetching feedback for event IDs:', eventIds);
          const { data: feedbackData, error: feedbackError } = await supabase
            .from('event_feedback')
            .select('rating, comments, would_attend_again, well_organized, created_at, event_id')
            .in('event_id', eventIds);
          
          console.log('📊 Officer Analytics - Feedback query result:', { feedbackData, feedbackError });
          
          if (feedbackError) {
            console.error('❌ Officer Analytics - Feedback query error:', feedbackError);
            throw feedbackError;
          }
          
          const ratings = feedbackData.map(fb => fb.rating).filter(r => typeof r === 'number');
          feedbackStatsData.avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;
          
          const wouldAttendCount = feedbackData.filter(fb => fb.would_attend_again === true).length;
          feedbackStatsData.wouldAttendAgainPct = feedbackData.length ? (wouldAttendCount / feedbackData.length) * 100 : 0;
          
          const wellOrgCount = feedbackData.filter(fb => fb.well_organized === true).length;
          feedbackStatsData.wellOrganizedPct = feedbackData.length ? (wellOrgCount / feedbackData.length) * 100 : 0;
          
          feedbackStatsData.recentComments = feedbackData
            .filter(fb => fb.comments && fb.comments.trim() !== '')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map(fb => ({
              rating: fb.rating,
              comments: fb.comments,
              created_at: fb.created_at,
              event_id: fb.event_id,
            }));
        }
        setFeedbackStats(feedbackStatsData);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        // Provide more specific error handling
        if (error instanceof Error) {
          if (error.message.includes('Officer position not found')) {
            console.log('User may not be an officer or officer_position is null');
          }
          if (error.message.includes('column') && error.message.includes('does not exist')) {
            console.log('Database schema issue - check column names');
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{officerPosition?.replace('_', ' ').toUpperCase()}</Text>
        <Text style={styles.subtitle}>Analytics Dashboard</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Events Created</Text>
              <Text style={styles.metricValue}>{eventStats.total}</Text>
              <Text style={styles.metricChange}>
                {eventStats.growth_rate >= 0 ? '📈' : '📉'} {Math.abs(eventStats.growth_rate).toFixed(1)}%
              </Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Avg Attendance</Text>
              <Text style={styles.metricValue}>{eventStats.average_attendance.toFixed(0)}</Text>
              <Text style={styles.metricSubtext}>per event</Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Engagement Rate</Text>
              <Text style={styles.metricValue}>{eventStats.engagement_rate.toFixed(1)}%</Text>
              <Text style={styles.metricSubtext}>of total members</Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Event Rating</Text>
              <Text style={styles.metricValue}>{feedbackStats.avgRating.toFixed(1)}</Text>
              <Text style={styles.metricSubtext}>⭐ average</Text>
            </View>
          </View>

          {/* Event Trends Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>📈 Event Trends (Last 6 Months)</Text>
            {eventStats.attendance_trend.length > 0 && eventStats.attendance_trend.some(d => d.count > 0) ? (
              <LineChart
                data={{
                  labels: eventStats.attendance_trend.map(d => d.month),
                  datasets: [{
                    data: eventStats.attendance_trend.map(d => d.count),
                    color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
                    strokeWidth: 3
                  }]
                }}
                width={screenWidth - 48}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withDots={true}
                withShadow={false}
                withInnerLines={false}
              />
            ) : (
              <Text style={styles.noDataText}>No trend data available</Text>
            )}
          </View>

          {/* Event Type Distribution */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>🎯 Event Type Breakdown</Text>
            {pointDistribution.length > 0 ? (
              <View style={styles.pieContainer}>
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
              </View>
            ) : (
              <Text style={styles.noDataText}>No event data available</Text>
            )}
          </View>

          {/* Engagement Progress */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>🎪 Member Engagement Metrics</Text>
            <ProgressChart
              data={{
                labels: ['Engagement', 'Satisfaction', 'Retention'],
                data: [
                  Math.min(eventStats.engagement_rate / 100, 1),
                  Math.min(feedbackStats.avgRating / 5, 1),
                  Math.min(feedbackStats.wouldAttendAgainPct / 100, 1)
                ]
              }}
              width={screenWidth - 48}
              height={220}
              strokeWidth={16}
              radius={32}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1, index = 0) => {
                  const colors = ['#4285F4', '#34A853', '#FBBC04'];
                  return colors[index] || `rgba(66, 133, 244, ${opacity})`;
                }
              }}
              hideLegend={false}
            />
            <View style={styles.progressLabels}>
              <View style={styles.progressLabel}>
                <View style={[styles.colorDot, { backgroundColor: '#4285F4' }]} />
                <Text style={styles.progressText}>Engagement: {eventStats.engagement_rate.toFixed(1)}%</Text>
              </View>
              <View style={styles.progressLabel}>
                <View style={[styles.colorDot, { backgroundColor: '#34A853' }]} />
                <Text style={styles.progressText}>Satisfaction: {((feedbackStats.avgRating / 5) * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.progressLabel}>
                <View style={[styles.colorDot, { backgroundColor: '#FBBC04' }]} />
                <Text style={styles.progressText}>Retention: {feedbackStats.wouldAttendAgainPct.toFixed(1)}%</Text>
              </View>
            </View>
          </View>

          {/* Attendee Demographics */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>👥 Attendee Demographics</Text>
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
                showBarTops={false}
                withInnerLines={false}
                fromZero={true}
                yAxisLabel=""
                yAxisSuffix=""
              />
            ) : (
              <Text style={styles.noDataText}>No demographic data available</Text>
            )}
          </View>

          {/* Top Majors List */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>🎓 Top Majors</Text>
            <View style={styles.majorsList}>
              {Object.entries(userStats.by_major)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([major, count], index) => (
                  <View key={major} style={styles.majorRow}>
                    <View style={styles.majorRank}>
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.majorInfo}>
                      <Text style={styles.majorName}>{major}</Text>
                      <Text style={styles.majorCount}>{count} attendees</Text>
                    </View>
                    <View style={styles.majorBar}>
                      <View 
                        style={[
                          styles.majorBarFill, 
                          { 
                            width: `${(count / Math.max(...Object.values(userStats.by_major))) * 100}%`,
                            backgroundColor: pieColors[index % pieColors.length]
                          }
                        ]} 
                      />
                    </View>
                  </View>
                ))
              }
            </View>
            {Object.keys(userStats.by_major).length === 0 && (
              <Text style={styles.noDataText}>No major data available</Text>
            )}
          </View>

          {/* Feedback Insights */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>💬 Recent Feedback</Text>
            {feedbackStats.recentComments.length === 0 ? (
              <Text style={styles.noDataText}>No feedback yet.</Text>
            ) : (
              <View style={styles.feedbackList}>
                {feedbackStats.recentComments.slice(0, 3).map((fb, idx) => (
                  <View key={idx} style={styles.feedbackItem}>
                    <View style={styles.feedbackHeader}>
                      <View style={styles.ratingContainer}>
                        {[...Array(5)].map((_, i) => (
                          <Text key={i} style={[styles.star, { opacity: i < fb.rating ? 1 : 0.3 }]}>⭐</Text>
                        ))}
                      </View>
                      <Text style={styles.feedbackDate}>
                        {new Date(fb.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.feedbackText}>"{fb.comments}"</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  header: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#5f6368',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: (screenWidth - 44) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  metricLabel: {
    fontSize: 14,
    color: '#5f6368',
    fontWeight: '500',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 14,
    color: '#34a853',
    fontWeight: '500',
  },
  metricSubtext: {
    fontSize: 12,
    color: '#80868b',
    fontWeight: '400',
  },
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e8eaed',
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
  pieContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  progressLabels: {
    marginTop: 16,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#5f6368',
    fontWeight: '500',
  },
  majorsList: {
    marginTop: 8,
  },
  majorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  majorRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  majorInfo: {
    flex: 1,
    marginRight: 16,
  },
  majorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 2,
  },
  majorCount: {
    fontSize: 14,
    color: '#5f6368',
  },
  majorBar: {
    width: 80,
    height: 8,
    backgroundColor: '#f1f3f4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  majorBarFill: {
    height: '100%',
    borderRadius: 4,
  },
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
  noDataText: {
    fontSize: 14,
    color: '#80868b',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 24,
  },
});
