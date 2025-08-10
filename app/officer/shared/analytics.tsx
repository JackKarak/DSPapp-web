import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { supabase } from '../../../lib/supabase';

type Event = {
  id: string;
  point_value: number;
  rating: number | null;
  point_type: string;
  title: string;
  start_time: string;
};

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

export default function OfficerAnalytics() {
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
  const [officerId, setOfficerId] = useState<string | null>(null);
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
    const fetchOfficerIdAndAnalytics = async () => {
      setLoading(true);
      try {
        // Get current officer's user ID
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('No user');
        setOfficerId(user.id);

        // Fetch only this officer's events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, point_value, point_type, start_time')
          .eq('status', 'approved')
          .eq('created_by', user.id);
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
        // Fetch attendance for only this officer's events
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

        // Fetch user stats for only attendees of this officer's events
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

        // Fetch event feedback for only this officer's events
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
    fetchOfficerIdAndAnalytics();
  }, []);



  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>📊 Chapter Analytics</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#330066" />
      ) : (
        <>
          <Text style={styles.sectionHeader}>👥 Membership Stats</Text>
          
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Total Active Members</Text>
            <Text style={styles.metricValue}>{userStats.total} members</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Pledge Class Distribution</Text>
            <PieChart
              data={Object.entries(userStats.by_pledge_class).map(([name, count], i) => ({
                name,
                points: count,
                color: pieColors[i % pieColors.length],
                legendFontColor: '#333',
                legendFontSize: 13,
              }))}
              width={screenWidth - 32}
              height={200}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor="points"
              backgroundColor="transparent"
              paddingLeft="15"
            />
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
            <PieChart
              data={pointDistribution}
              width={screenWidth - 32}
              height={200}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor="points"
              backgroundColor="transparent"
              paddingLeft="15"
            />
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
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Attendance</Text>
            <Text style={styles.metricValue}>
              Average {eventStats.average_attendance.toFixed(1)} members per event
            </Text>
          </View>

          <Text style={styles.sectionHeader}>⭐ Event Feedback</Text>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Average Event Rating</Text>
            <Text style={styles.metricValue}>{feedbackStats.avgRating.toFixed(2)} / 5</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Would Attend Again</Text>
            <Text style={styles.metricValue}>{feedbackStats.wouldAttendAgainPct.toFixed(1)}%</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Well Organized</Text>
            <Text style={styles.metricValue}>{feedbackStats.wellOrganizedPct.toFixed(1)}%</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Recent Comments</Text>
            {feedbackStats.recentComments.length === 0 ? (
              <Text style={styles.statLabel}>No comments yet.</Text>
            ) : (
              feedbackStats.recentComments.map((fb, idx) => (
                <View key={idx} style={styles.statRow}>
                  <Text style={styles.statLabel}>
                    {fb.comments}
                    <Text style={{ color: '#888', fontSize: 12 }}> (Rating: {fb.rating ?? 'N/A'})</Text>
                  </Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>{new Date(fb.created_at).toLocaleDateString()}</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const pieColors = ['#FF6384', '#36A2EB', '#FFCE56', '#00C49F', '#8A2BE2', '#FFA07A'];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330066',
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
    paddingVertical: 4,
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
  }
});

