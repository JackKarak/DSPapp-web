import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
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
};

const screenWidth = Dimensions.get('window').width;
const pieColors = ['#FF6384', '#36A2EB', '#FFCE56', '#00C49F', '#8A2BE2', '#FFA07A'];

export default function PresidentAnalytics() {
  const [loading, setLoading] = useState(true);
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
        // Fetch user statistics (all users)
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('pledge_class, major, graduation_year')
          .eq('approved', true);
        
        if (usersError) throw usersError;
        
        const userStats: UserStats = {
          total: usersData.length,
          by_pledge_class: {},
          by_major: {},
          by_graduation_year: {},
        };
        
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

        // Fetch all events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, point_value, point_type, start_time')
          .eq('status', 'approved');
        
        if (eventsError) throw eventsError;
        
        const eventIds = eventsData.map(e => e.id);
        const now = new Date();
        const eventStats: EventStats = {
          total: eventsData.length,
          by_point_type: {},
          average_attendance: 0,
          by_month: {},
          upcoming: 0,
        };
        
        eventStats.upcoming = eventsData.filter(event => new Date(event.start_time) > now).length;
        
        eventsData.forEach(event => {
          eventStats.by_point_type[event.point_type] = (eventStats.by_point_type[event.point_type] || 0) + 1;
          const month = new Date(event.start_time).toLocaleString('default', { month: 'long' });
          eventStats.by_month[month] = (eventStats.by_month[month] || 0) + 1;
        });
        
        // Fetch attendance for all events
        let attendanceByEvent: Record<string, number> = {};
        if (eventIds.length > 0) {
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('event_attendance')
            .select('event_id');
          
          if (attendanceError) throw attendanceError;
          
          attendanceData.forEach(record => {
            attendanceByEvent[record.event_id] = (attendanceByEvent[record.event_id] || 0) + 1;
          });
        }
        
        eventStats.average_attendance = 
          Object.values(attendanceByEvent).reduce((sum, count) => sum + count, 0) / (Object.keys(attendanceByEvent).length || 1);
        
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

        // Fetch event feedback for all events
        let feedbackStatsData = {
          avgRating: 0,
          wouldAttendAgainPct: 0,
          wellOrganizedPct: 0,
          recentComments: [] as Array<{ rating: number; comments: string; created_at: string; event_id: string }>,
        };
        
        if (eventIds.length > 0) {
          const { data: feedbackData, error: feedbackError } = await supabase
            .from('event_feedback')
            .select('rating, comments, would_attend_again, well_organized, created_at, event_id')
            .in('event_id', eventIds);
          
          if (feedbackError) throw feedbackError;
          
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>📊 Presidential Analytics</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#330066" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionHeader}>👥 Membership Stats</Text>
          
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Total Active Members</Text>
            <Text style={styles.metricValue}>{userStats.total} members</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Pledge Class Distribution</Text>
            {Object.keys(userStats.by_pledge_class).length > 0 ? (
              <PieChart
                data={Object.entries(userStats.by_pledge_class).map(([name, count], i) => ({
                  name,
                  population: count,
                  color: pieColors[i % pieColors.length],
                  legendFontColor: '#333',
                  legendFontSize: 13,
                }))}
                width={screenWidth - 32}
                height={200}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
              />
            ) : (
              <Text style={styles.noDataText}>No pledge class data available</Text>
            )}
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Top Majors</Text>
            {Object.entries(userStats.by_major)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([major, count]) => (
                <View key={major} style={styles.statRow}>
                  <Text style={styles.statLabel}>{major}</Text>
                  <Text style={styles.statValue}>{count} members</Text>
                </View>
              ))
            }
            {Object.keys(userStats.by_major).length === 0 && (
              <Text style={styles.noDataText}>No major data available</Text>
            )}
          </View>

          <Text style={styles.sectionHeader}>📅 Event Analytics</Text>

          <View style={styles.rowContainer}>
            <View style={[styles.metricCard, styles.halfCard]}>
              <Text style={styles.metricTitle}>Total Events</Text>
              <Text style={styles.metricValue}>{eventStats.total}</Text>
            </View>

            <View style={[styles.metricCard, styles.halfCard]}>
              <Text style={styles.metricTitle}>Upcoming</Text>
              <Text style={styles.metricValue}>{eventStats.upcoming}</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Event Type Distribution</Text>
            {pointDistribution.length > 0 ? (
              <PieChart
                data={pointDistribution}
                width={screenWidth - 32}
                height={200}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor="points"
                backgroundColor="transparent"
                paddingLeft="15"
              />
            ) : (
              <Text style={styles.noDataText}>No event data available</Text>
            )}
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Monthly Event Count</Text>
            {Object.entries(eventStats.by_month)
              .map(([month, count]) => (
                <View key={month} style={styles.statRow}>
                  <Text style={styles.statLabel}>{month}</Text>
                  <Text style={styles.statValue}>{count} events</Text>
                </View>
              ))
            }
            {Object.keys(eventStats.by_month).length === 0 && (
              <Text style={styles.noDataText}>No monthly data available</Text>
            )}
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Attendance</Text>
            <Text style={styles.metricValue}>
              Average {eventStats.average_attendance.toFixed(1)} members per event
            </Text>
          </View>

          <Text style={styles.sectionHeader}>⭐ Event Feedback</Text>
          
          <View style={styles.rowContainer}>
            <View style={[styles.metricCard, styles.halfCard]}>
              <Text style={styles.metricTitle}>Avg Rating</Text>
              <Text style={styles.metricValue}>{feedbackStats.avgRating.toFixed(2)} / 5</Text>
            </View>
            
            <View style={[styles.metricCard, styles.halfCard]}>
              <Text style={styles.metricTitle}>Would Attend Again</Text>
              <Text style={styles.metricValue}>{feedbackStats.wouldAttendAgainPct.toFixed(1)}%</Text>
            </View>
          </View>
          
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Well Organized</Text>
            <Text style={styles.metricValue}>{feedbackStats.wellOrganizedPct.toFixed(1)}%</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Recent Comments</Text>
            {feedbackStats.recentComments.length === 0 ? (
              <Text style={styles.noDataText}>No comments yet.</Text>
            ) : (
              feedbackStats.recentComments.map((fb, idx) => (
                <View key={idx} style={styles.commentRow}>
                  <Text style={styles.commentText}>
                    "{fb.comments}"
                  </Text>
                  <Text style={styles.commentMeta}>
                    Rating: {fb.rating ?? 'N/A'} • {new Date(fb.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ))
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
    padding: 16,
    paddingBottom: 100,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  metricCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    elevation: 2,
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
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0038A8',
    textAlign: 'center',
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
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
});
