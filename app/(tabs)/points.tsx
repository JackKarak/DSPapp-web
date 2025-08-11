import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const POINT_REQUIREMENTS: Record<string, number> = {
  brotherhood: 10,
  professional: 5,
  service: 5,
  scholarship: 5,
  health: 3,
  fundraising: 3,
  dei: 3,
};

export default function PointsScreen() {
  const [pointsByCategory, setPointsByCategory] = useState<Record<string, number>>({});
  const [pillarsMet, setPillarsMet] = useState(0);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<Array<{
    name: string;
    totalPoints: number;
    rank: number;
  }>>([]);
  const [userRank, setUserRank] = useState<{
    name: string;
    totalPoints: number;
    rank: number;
  } | null>(null);

  useEffect(() => {
    const fetchPoints = async () => {
      setLoading(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('User fetch error:', userError);
          setLoading(false);
          return;
        }

        // Fetch attended events
        const { data: attended, error: attendedError } = await supabase
          .from('event_attendance')
          .select('event_id')
          .eq('user_id', user.id);

        // Fetch registered events
        const { data: registered, error: registeredError } = await supabase
          .from('event_registration')
          .select('event_id')
          .eq('user_id', user.id);

        if (attendedError || registeredError) {
          console.error('Fetch error:', attendedError || registeredError);
          setLoading(false);
          return;
        }

        const attendedEventIds = attended?.map((a) => a.event_id) || [];
        const registeredEventIds = registered?.map((r) => r.event_id) || [];
        const uniqueEventIds = [...new Set(attendedEventIds)];

        if (uniqueEventIds.length === 0) {
          // No events attended yet
          setPointsByCategory({});
          setPillarsMet(0);
          setLoading(false);
          return;
        }

        // Fetch event details for points calculation
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id, point_type, point_value')
          .in('id', uniqueEventIds);

        if (eventsError) {
          console.error('Events error:', eventsError);
          setLoading(false);
          return;
        }

        const categoryPoints: Record<string, number> = {};

        events?.forEach((event) => {
          const wasRegistered = registeredEventIds.includes(event.id);
          // Use actual point value from database, with bonus for registration
          const basePoints = event.point_value || 1;
          const pointsEarned = wasRegistered ? Math.round(basePoints * 1.5) : basePoints;
          const category = event.point_type;

          if (category) {
            categoryPoints[category] = (categoryPoints[category] || 0) + pointsEarned;
          }
        });

        const metCount = Object.entries(POINT_REQUIREMENTS).reduce((count, [cat, required]) => {
          return (categoryPoints[cat] || 0) >= required ? count + 1 : count;
        }, 0);

        setPointsByCategory(categoryPoints);
        setPillarsMet(metCount);
        
        // Trigger confetti if all pillars are met
        if (metCount >= Object.keys(POINT_REQUIREMENTS).length) {
          setTriggerConfetti(true);
        }

        // Fetch leaderboard data
        await fetchLeaderboard(user.id);

      } catch (error) {
        console.error('Error fetching points:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchLeaderboard = async (currentUserId: string) => {
      try {
        // Get all users with their profile information
        const { data: profiles, error: profilesError } = await supabase
          .from('users')
          .select('id, first_name, last_name');

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }

        // Get all event attendance
        const { data: allAttendance, error: attendanceError } = await supabase
          .from('event_attendance')
          .select('user_id, event_id');

        if (attendanceError) {
          console.error('Error fetching attendance:', attendanceError);
          return;
        }

        // Get all event registrations
        const { data: allRegistrations, error: registrationsError } = await supabase
          .from('event_registration')
          .select('user_id, event_id');

        if (registrationsError) {
          console.error('Error fetching registrations:', registrationsError);
          return;
        }

        // Get all events with point values
        const { data: allEvents, error: eventsError } = await supabase
          .from('events')
          .select('id, point_type, point_value');

        if (eventsError) {
          console.error('Error fetching events:', eventsError);
          return;
        }

        // Calculate points for each user
        const userPoints: Record<string, number> = {};
        
        profiles?.forEach((profile) => {
          const userId = profile.id;
          const userAttendance = allAttendance?.filter(a => a.user_id === userId) || [];
          const userRegistrations = allRegistrations?.filter(r => r.user_id === userId) || [];
          
          let totalPoints = 0;
          
          userAttendance.forEach((attendance) => {
            const event = allEvents?.find(e => e.id === attendance.event_id);
            if (event) {
              const wasRegistered = userRegistrations.some(r => r.event_id === event.id);
              const basePoints = event.point_value || 1;
              const pointsEarned = wasRegistered ? Math.round(basePoints * 1.5) : basePoints;
              totalPoints += pointsEarned;
            }
          });
          
          userPoints[userId] = totalPoints;
        });

        // Create leaderboard array with names
        const leaderboardData = profiles?.map(profile => ({
          id: profile.id,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
          totalPoints: userPoints[profile.id] || 0,
        })) || [];

        // Sort by total points (descending)
        leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);

        // Add rankings
        const rankedData = leaderboardData.map((user, index) => ({
          ...user,
          rank: index + 1,
        }));

        // Set top 5 for leaderboard
        setLeaderboard(rankedData.slice(0, 5));

        // Find current user's rank
        const currentUserData = rankedData.find(user => user.id === currentUserId);
        if (currentUserData) {
          setUserRank({
            name: currentUserData.name,
            totalPoints: currentUserData.totalPoints,
            rank: currentUserData.rank,
          });
        }

      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };

    fetchPoints();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.grayText}>Loading point data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Point Audit</Text>
      <Text style={styles.subtitle}>
        {pillarsMet} of {Object.keys(POINT_REQUIREMENTS).length} pillars met
      </Text>

      {/* Table Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>Category</Text>
        <Text style={styles.headerCell}>Earned</Text>
        <Text style={styles.headerCell}>Required</Text>
        <Text style={styles.headerCell}>Met</Text>
      </View>

      {/* Table Rows */}
      {Object.entries(POINT_REQUIREMENTS).map(([category, required]) => {
        const earned = pointsByCategory[category] || 0;
        const met = earned >= required;

        return (
          <View key={category} style={styles.row}>
            <Text style={styles.cell}>{category}</Text>
            <Text style={styles.cell}>{earned.toFixed(1)}</Text>
            <Text style={styles.cell}>{required}</Text>
            <View style={styles.iconCell}>
              {met ? (
                <FontAwesome name="check-circle" size={16} color="green" />
              ) : (
                <FontAwesome name="times-circle" size={16} color="red" />
              )}
            </View>
          </View>
        );
      })}

      {/* Leaderboard Section */}
      <View style={styles.leaderboardSection}>
        <Text style={styles.leaderboardTitle}>🏆 Leaderboard - Top 5</Text>
        
        {leaderboard.map((user, index) => (
          <View key={user.name} style={[
            styles.leaderboardRow,
            index === 0 && styles.firstPlace,
            index === 1 && styles.secondPlace,
            index === 2 && styles.thirdPlace
          ]}>
            <View style={styles.rankContainer}>
              <Text style={[styles.rankText, index < 3 && styles.topThreeRank]}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${user.rank}`}
              </Text>
            </View>
            <Text style={[styles.leaderboardName, index < 3 && styles.topThreeName]}>
              {user.name}
            </Text>
            <Text style={[styles.leaderboardPoints, index < 3 && styles.topThreePoints]}>
              {user.totalPoints} pts
            </Text>
          </View>
        ))}

        {/* Current User's Rank (if not in top 5) */}
        {userRank && userRank.rank > 5 && (
          <View style={styles.userRankSection}>
            <Text style={styles.userRankLabel}>Your Ranking:</Text>
            <View style={styles.userRankRow}>
              <View style={styles.rankContainer}>
                <Text style={styles.rankText}>#{userRank.rank}</Text>
              </View>
              <Text style={styles.leaderboardName}>{userRank.name}</Text>
              <Text style={styles.leaderboardPoints}>{userRank.totalPoints} pts</Text>
            </View>
          </View>
        )}
      </View>

      {triggerConfetti && <ConfettiCannon count={150} origin={{ x: 200, y: -20 }} fadeOut={true} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
  },
  iconCell: {
    width: 24,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grayText: {
    marginTop: 8,
    color: '#888',
  },
  
  // Leaderboard Styles
  leaderboardSection: {
    marginTop: 32,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  firstPlace: {
    backgroundColor: '#fff7e6',
    borderLeftWidth: 4,
    borderLeftColor: '#ffd700',
  },
  secondPlace: {
    backgroundColor: '#f6f6f6',
    borderLeftWidth: 4,
    borderLeftColor: '#c0c0c0',
  },
  thirdPlace: {
    backgroundColor: '#fff4e6',
    borderLeftWidth: 4,
    borderLeftColor: '#cd7f32',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  topThreeRank: {
    fontSize: 20,
    color: '#333',
  },
  leaderboardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    color: '#333',
  },
  topThreeName: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#000',
  },
  leaderboardPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    minWidth: 60,
    textAlign: 'right',
  },
  topThreePoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  userRankSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  userRankLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  userRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
});
