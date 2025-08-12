import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  BarChart,
  LineChart,
  PieChart,
  ProgressChart
} from 'react-native-chart-kit';
import { supabase } from '../../lib/supabase';

type UserStats = {
  total: number;
  activeThisMonth: number;
  newThisMonth: number;
  by_pledge_class: Record<string, number>;
  by_major: Record<string, number>;
  by_graduation_year: Record<string, number>;
  engagementRate: number;
};

type EventStats = {
  total: number;
  thisMonth: number;
  thisWeek: number;
  by_point_type: Record<string, number>;
  average_attendance: number;
  attendance_trend: Array<{ date: string; count: number }>;
  by_month: Record<string, number>;
  upcoming: number;
  completion_rate: number;
};

type EngagementMetrics = {
  daily_active_users: Array<{ date: string; count: number }>;
  event_participation: Array<{ month: string; attendance: number; events: number }>;
  point_distribution: Array<{ type: string; total: number; average: number }>;
  retention_rate: number;
  growth_rate: number;
};

type RealtimeMetrics = {
  todayEvents: number;
  todayAttendance: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  topPerformers: Array<{ name: string; points: number }>;
};

const screenWidth = Dimensions.get('window').width;
const pieColors = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#9C27B0', '#FF9800', '#00BCD4', '#8BC34A'];

// Google Analytics-style chart configuration
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
    fontWeight: '400' as any,
  },
  propsForBackgroundLines: {
    strokeDasharray: '5,5',
    stroke: '#e0e0e0',
    strokeWidth: 1,
  },
};

export default function PresidentAnalytics() {
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    activeThisMonth: 0,
    newThisMonth: 0,
    by_pledge_class: {},
    by_major: {},
    by_graduation_year: {},
    engagementRate: 0,
  });
  
  const [eventStats, setEventStats] = useState<EventStats>({
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
    by_point_type: {},
    average_attendance: 0,
    attendance_trend: [],
    by_month: {},
    upcoming: 0,
    completion_rate: 0,
  });
  
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics>({
    daily_active_users: [],
    event_participation: [],
    point_distribution: [],
    retention_rate: 0,
    growth_rate: 0,
  });
  
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics>({
    todayEvents: 0,
    todayAttendance: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
    topPerformers: [],
  });
  
  // Remove unused variables - keeping only the comprehensive analytics state

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

        // Comprehensive User Analytics
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('user_id, pledge_class, major, graduation_year, activated_at')
          .eq('approved', true);
        
        if (usersError) throw usersError;

        // Calculate user engagement metrics
        const totalUsers = usersData.length;
        // Since last_login doesn't exist, we'll use newThisMonth as a proxy for activeThisMonth
        // In the future, you could track this with event attendance data
        const newThisMonth = usersData.filter(user => 
          user.activated_at && new Date(user.activated_at) >= startOfMonth
        ).length;
        const activeThisMonth = newThisMonth; // Fallback since last_login doesn't exist

        const userStats: UserStats = {
          total: totalUsers,
          activeThisMonth,
          newThisMonth,
          by_pledge_class: {},
          by_major: {},
          by_graduation_year: {},
          engagementRate: totalUsers > 0 ? (activeThisMonth / totalUsers) * 100 : 0,
        };
        
        // Aggregate user demographics
        usersData.forEach(user => {
          if (user.pledge_class) {
            userStats.by_pledge_class[user.pledge_class] = (userStats.by_pledge_class[user.pledge_class] || 0) + 1;
          }
          if (user.major) {
            userStats.by_major[user.major] = (userStats.by_major[user.major] || 0) + 1;
          }
          if (user.graduation_year) {
            userStats.by_graduation_year[user.graduation_year] = (userStats.by_graduation_year[user.graduation_year] || 0) + 1;
          }
        });
        setUserStats(userStats);

        // Comprehensive Event Analytics
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, point_value, point_type, start_time, end_time, status')
          .eq('status', 'approved');
        
        if (eventsError) throw eventsError;

        const eventIds = eventsData.map(e => e.id);
        const eventsThisMonth = eventsData.filter(event => 
          new Date(event.start_time) >= startOfMonth
        ).length;
        const eventsThisWeek = eventsData.filter(event => 
          new Date(event.start_time) >= startOfWeek
        ).length;

        // Generate attendance trend data for the last 30 days
        const attendanceTrend: Array<{ date: string; count: number }> = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          attendanceTrend.push({
            date: date.toISOString().split('T')[0],
            count: 0 // Will be filled from attendance data
          });
        }

        const eventStats: EventStats = {
          total: eventsData.length,
          thisMonth: eventsThisMonth,
          thisWeek: eventsThisWeek,
          by_point_type: {},
          average_attendance: 0,
          attendance_trend: attendanceTrend,
          by_month: {},
          upcoming: eventsData.filter(event => new Date(event.start_time) > now).length,
          completion_rate: 0,
        };
        
        // Process event data
        eventsData.forEach(event => {
          eventStats.by_point_type[event.point_type] = (eventStats.by_point_type[event.point_type] || 0) + 1;
          const month = new Date(event.start_time).toLocaleString('default', { month: 'long' });
          eventStats.by_month[month] = (eventStats.by_month[month] || 0) + 1;
        });
        
        // Fetch detailed attendance data
        let totalAttendance = 0;
        let completedEvents = 0;
        if (eventIds.length > 0) {
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('event_attendance')
            .select('event_id, user_id, attended_at')
            .in('event_id', eventIds);
          
          if (!attendanceError && attendanceData) {
            totalAttendance = attendanceData.length;
            
            // Fill attendance trend data using attended_at
            attendanceData.forEach(record => {
              if (record.attended_at) {
                const attendanceDate = new Date(record.attended_at).toISOString().split('T')[0];
                const trendPoint = eventStats.attendance_trend.find(point => point.date === attendanceDate);
                if (trendPoint) {
                  trendPoint.count++;
                }
              }
            });

            // Calculate completion rate (events with at least 1 attendee)
            const eventsWithAttendance = new Set(attendanceData.map(a => a.event_id));
            completedEvents = eventsWithAttendance.size;
            eventStats.completion_rate = eventsData.length > 0 ? (completedEvents / eventsData.length) * 100 : 0;
          }
        }
        
        eventStats.average_attendance = completedEvents > 0 ? totalAttendance / completedEvents : 0;
        setEventStats(eventStats);

        // Calculate engagement metrics
        const engagementMetrics: EngagementMetrics = {
          daily_active_users: [], // Would need login tracking
          event_participation: [],
          point_distribution: Object.entries(eventStats.by_point_type).map(([type, count]) => ({
            type,
            total: count,
            average: count / (eventStats.total || 1)
          })),
          retention_rate: totalUsers > 0 ? (activeThisMonth / totalUsers) * 100 : 0,
          growth_rate: totalUsers > 0 ? (newThisMonth / totalUsers) * 100 : 0,
        };
        setEngagementMetrics(engagementMetrics);

        // Fetch top performers and realtime metrics
        const { data: userPointsData } = await supabase
          .from('user_points')
          .select(`
            user_id,
            total_points,
            users!inner(first_name, last_name)
          `)
          .order('total_points', { ascending: false })
          .limit(5);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayEvents = eventsData.filter(event => 
          new Date(event.start_time).toDateString() === todayStart.toDateString()
        ).length;

        const realtimeMetrics: RealtimeMetrics = {
          todayEvents,
          todayAttendance: 0, // Would need today's attendance data
          weeklyGrowth: eventsThisWeek > 0 ? ((eventsThisWeek - eventsThisMonth/4) / (eventsThisMonth/4 || 1)) * 100 : 0,
          monthlyGrowth: engagementMetrics.growth_rate,
          topPerformers: userPointsData?.map(user => ({
            name: `${(user as any).users.first_name} ${(user as any).users.last_name}`,
            points: user.total_points
          })) || [],
        };
        setRealtimeMetrics(realtimeMetrics);

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [selectedTimeRange]);

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header with Key Metrics */}
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>📊 Analytics Dashboard</Text>
        <Text style={styles.subtitle}>Comprehensive insights for your fraternity</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{userStats.total}</Text>
                <Text style={styles.metricLabel}>Total Members</Text>
                <Text style={styles.metricChange}>
                  +{userStats.newThisMonth} this month
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{eventStats.total}</Text>
                <Text style={styles.metricLabel}>Total Events</Text>
                <Text style={styles.metricChange}>
                  {eventStats.thisMonth} this month
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {isNaN(userStats.engagementRate) ? '0.0' : userStats.engagementRate.toFixed(1)}%
                </Text>
                <Text style={styles.metricLabel}>Engagement Rate</Text>
                <Text style={styles.metricChange}>
                  {userStats.activeThisMonth || 0} active users
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {isNaN(eventStats.completion_rate) ? '0.0' : eventStats.completion_rate.toFixed(1)}%
                </Text>
                <Text style={styles.metricLabel}>Event Completion</Text>
                <Text style={styles.metricChange}>
                  {eventStats.upcoming || 0} upcoming
                </Text>
              </View>
            </View>

            {/* Attendance Trends */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>📈 Attendance Trends (30 Days)</Text>
              <View style={styles.chartContainer}>
                {eventStats.attendance_trend.length > 0 ? (
                  <LineChart
                    data={{
                      labels: eventStats.attendance_trend.slice(-7).map(item => 
                        new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })
                      ),
                      datasets: [{
                        data: eventStats.attendance_trend.slice(-7).map(item => Math.max(0, item.count || 0)),
                        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                        strokeWidth: 3
                      }]
                    }}
                    width={Dimensions.get('window').width - 40}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: { borderRadius: 16 },
                      propsForDots: {
                        r: '6',
                        strokeWidth: '2',
                        stroke: '#2563eb'
                      }
                    }}
                    style={styles.chart}
                  />
                ) : (
                  <Text style={styles.noDataText}>No attendance data available</Text>
                )}
              </View>
            </View>

            {/* Event Performance */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>🎯 Event Performance by Type</Text>
              <View style={styles.chartContainer}>
                {Object.keys(eventStats.by_point_type).length > 0 ? (
                  <BarChart
                    data={{
                      labels: Object.keys(eventStats.by_point_type).slice(0, 5),
                      datasets: [{
                        data: Object.values(eventStats.by_point_type).slice(0, 5).map(val => Math.max(1, val || 0))
                      }]
                    }}
                    width={Dimensions.get('window').width - 40}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: { borderRadius: 16 }
                    }}
                    style={styles.chart}
                  />
                ) : (
                  <Text style={styles.noDataText}>No event type data available</Text>
                )}
              </View>
            </View>

            {/* Member Demographics */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>👥 Member Demographics</Text>
              <View style={styles.chartContainer}>
                {Object.keys(userStats.by_pledge_class).length > 0 ? (
                  <PieChart
                    data={Object.entries(userStats.by_pledge_class).map(([name, count], i) => ({
                      name,
                      population: Math.max(1, count || 0),
                      color: pieColors[i % pieColors.length],
                      legendFontColor: '#333',
                      legendFontSize: 13,
                    }))}
                    width={Dimensions.get('window').width - 40}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    style={styles.chart}
                  />
                ) : (
                  <Text style={styles.noDataText}>No pledge class data available</Text>
                )}
              </View>
            </View>

            {/* Engagement Progress */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>⚡ Engagement Metrics</Text>
              <View style={styles.chartContainer}>
                <ProgressChart
                  data={{
                    labels: ['Retention', 'Growth', 'Completion'],
                    data: [
                      Math.min(1, Math.max(0, (engagementMetrics.retention_rate || 0) / 100)),
                      Math.min(1, Math.max(0, (engagementMetrics.growth_rate || 0) / 100)),
                      Math.min(1, Math.max(0, (eventStats.completion_rate || 0) / 100))
                    ]
                  }}
                  width={Dimensions.get('window').width - 40}
                  height={220}
                  strokeWidth={16}
                  radius={32}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    color: (opacity = 1, index?: number) => {
                      const colors = ['#ef4444', '#f59e0b', '#10b981'];
                      return (index !== undefined && colors[index]) ? colors[index] : `rgba(37, 99, 235, ${opacity})`;
                    },
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  style={styles.chart}
                />
              </View>
            </View>

            {/* Monthly Event Distribution */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>📅 Events by Month</Text>
              <View style={styles.chartContainer}>
                {Object.keys(eventStats.by_month).length > 0 ? (
                  <BarChart
                    data={{
                      labels: Object.keys(eventStats.by_month).slice(0, 6),
                      datasets: [{
                        data: Object.values(eventStats.by_month).slice(0, 6).map(val => Math.max(1, val || 0))
                      }]
                    }}
                    width={Dimensions.get('window').width - 40}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: { borderRadius: 16 }
                    }}
                    style={styles.chart}
                  />
                ) : (
                  <Text style={styles.noDataText}>No monthly event data available</Text>
                )}
              </View>
            </View>

            {/* Top Performers */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>🏆 Top Performers</Text>
              <View style={styles.topPerformersContainer}>
                {realtimeMetrics.topPerformers.map((performer, index) => (
                  <View key={index} style={styles.performerCard}>
                    <View style={styles.performerRank}>
                      <Text style={styles.rankNumber}>#{index + 1}</Text>
                    </View>
                    <View style={styles.performerInfo}>
                      <Text style={styles.performerName}>{performer.name}</Text>
                      <Text style={styles.performerPoints}>{performer.points} points</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Real-time Metrics */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>🔴 Real-time Metrics</Text>
              <View style={styles.realtimeGrid}>
                <View style={styles.realtimeCard}>
                  <Text style={styles.realtimeValue}>{realtimeMetrics.todayEvents}</Text>
                  <Text style={styles.realtimeLabel}>Today's Events</Text>
                </View>
                <View style={styles.realtimeCard}>
                  <Text style={styles.realtimeValue}>
                    {realtimeMetrics.weeklyGrowth > 0 ? '+' : ''}{isNaN(realtimeMetrics.weeklyGrowth) ? '0.0' : realtimeMetrics.weeklyGrowth.toFixed(1)}%
                  </Text>
                  <Text style={styles.realtimeLabel}>Weekly Growth</Text>
                </View>
                <View style={styles.realtimeCard}>
                  <Text style={styles.realtimeValue}>
                    {isNaN(realtimeMetrics.monthlyGrowth) ? '0.0' : realtimeMetrics.monthlyGrowth.toFixed(1)}%
                  </Text>
                  <Text style={styles.realtimeLabel}>Monthly Growth</Text>
                </View>
                <View style={styles.realtimeCard}>
                  <Text style={styles.realtimeValue}>
                    {Math.round(eventStats.average_attendance || 0)}
                  </Text>
                  <Text style={styles.realtimeLabel}>Avg Attendance</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  headerSection: {
    backgroundColor: '#ffffff',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
  },
  metricChange: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  chartSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  topPerformersContainer: {
    marginTop: 16,
  },
  performerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  performerRank: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  performerPoints: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  realtimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  realtimeCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  realtimeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 6,
  },
  realtimeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330066',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0038A8',
    marginTop: 24,
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0038A8',
    marginLeft: 8,
  },
  commentRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  commentMeta: {
    fontSize: 12,
    color: '#666',
  },
  noDataText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
});
