import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Colors } from '../../constants/colors';

const POINT_REQUIREMENTS: Record<string, number> = {
  brotherhood: 20,
  professional: 4,
  service: 4,
  scholarship: 4,
  health: 3,
  fundraising: 3,
  dei: 3,
};

export default function PointsScreen() {
  const [pointsByCategory, setPointsByCategory] = useState<Record<string, number>>({});
  const [pillarsMet, setPillarsMet] = useState(0);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{
    name: string;
    totalPoints: number;
    rank: number;
  }[]>([]);
  const [userRank, setUserRank] = useState<{
    name: string;
    totalPoints: number;
    rank: number;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🚀 Starting initial data load...');
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('❌ User fetch error:', userError);
          return;
        }
        
        console.log('👤 Current user ID:', user.id);
        
        // Load all data
        await fetchPoints();
        await fetchLeaderboard(user.id);
      } catch (error) {
        console.error('❌ Error in initial data load:', error);
      }
    };

    loadData();
  }, []);

  const onRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    
    try {
      // Get current user for leaderboard refresh
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ User fetch error during refresh:', userError);
        setRefreshing(false);
        return;
      }
      
      // Clear current data to force fresh fetch
      setLeaderboard([]);
      setUserRank(null);
      setPointsByCategory({});
      
      // Refresh all data
      await fetchPoints();
      await fetchLeaderboard(user.id);
      
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('❌ Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchPoints = async () => {
    if (!refreshing) setLoading(true);

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
        // Still fetch leaderboard even if user has no points
        await fetchLeaderboard(user.id);
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
        // Fixed point system: 1 point for attendance + 0.5 points for registration
        const pointsEarned = wasRegistered ? 1.5 : 1;
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
      console.log('🔍 Starting comprehensive leaderboard debug...');
      console.log('👤 Current user ID:', currentUserId);
      
      // Get all users with their profile information
      const { data: profiles, error: profilesError } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, role, officer_position')
        .eq('approved', true); // Only get approved users

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        console.error('❌ Profile error details:', JSON.stringify(profilesError));
        return;
      }

      console.log(`👥 Found ${profiles?.length || 0} approved users`);
      console.log('👥 Sample users:', profiles?.slice(0, 3).map(u => ({ 
        id: u.user_id, 
        name: `${u.first_name} ${u.last_name}`, 
        role: u.role 
      })));

      // Get all event attendance - Force refresh data
      const { data: allAttendance, error: attendanceError } = await supabase
        .from('event_attendance')
        .select('*');

      console.log(`📅 Total attendance records: ${allAttendance?.length || 0}`);
      console.log('📅 Sample attendance:', allAttendance?.slice(0, 5));
      
      // DEBUG: Check if RLS is filtering data
      console.log('🔐 RLS DEBUG: Checking if we can see other users\' attendance...');
      const { data: allAttendanceNoRLS, error: attendanceErrorNoRLS } = await supabase
        .rpc('get_all_attendance_admin');
      
      if (attendanceErrorNoRLS) {
        console.log('⚠️ RLS bypass function not available - this confirms RLS is likely the issue');
        console.log('🔐 We can only see attendance records we have permission to see');
      } else {
        console.log(`🔐 Admin function shows ${allAttendanceNoRLS?.length || 0} total attendance records`);
        console.log(`📊 Visible to user: ${allAttendance?.length || 0}, Total in DB: ${allAttendanceNoRLS?.length || 0}`);
      }
      
      // Debug: Show unique user IDs in attendance vs users table
      const attendanceUserIds = [...new Set(allAttendance?.map(a => a.user_id))];
      const profileUserIds = profiles?.map(p => p.user_id) || [];
      console.log('🔍 Unique user IDs in attendance table (visible to current user):', attendanceUserIds);
      console.log('🔍 User IDs in profiles table:', profileUserIds);
      console.log('🔍 Current user ID:', currentUserId);
      
      // Check for mismatches
      const missingInProfiles = attendanceUserIds.filter(id => !profileUserIds.includes(id));
      const missingInAttendance = profileUserIds.filter(id => !attendanceUserIds.includes(id));
      console.log('⚠️ User IDs in attendance but not in profiles:', missingInProfiles);
      console.log('⚠️ User IDs in profiles but not in attendance:', missingInAttendance);
      console.log('🔐 RLS ISSUE: If you only see your own user ID in attendance, RLS is blocking other users\' data');

      if (attendanceError) {
        console.error('❌ Error fetching attendance:', attendanceError);
        console.error('❌ Attendance error details:', JSON.stringify(attendanceError));
        return;
      }

      // Get all event registrations - try both table names
      let allRegistrations;
      const { data: registrations1, error: registrationsError1 } = await supabase
        .from('event_registration')
        .select('*');

      if (registrationsError1) {
        console.log('⚠️ event_registration table failed, trying event_register...');
        const { data: registrations2, error: registrationsError2 } = await supabase
          .from('event_register')
          .select('*');
        
        if (registrationsError2) {
          console.error('❌ Both registration tables failed:', registrationsError1, registrationsError2);
          return;
        } else {
          allRegistrations = registrations2;
          console.log(`📝 Using event_register table - ${allRegistrations?.length || 0} records`);
        }
      } else {
        allRegistrations = registrations1;
        console.log(`📝 Using event_registration table - ${allRegistrations?.length || 0} records`);
      }

      console.log('📝 Sample registrations:', allRegistrations?.slice(0, 5));

      // Get all events with point values
      const { data: allEvents, error: eventsError } = await supabase
        .from('events')
        .select('*');

      console.log(`🎯 Total events: ${allEvents?.length || 0}`);
      console.log('🎯 Sample events:', allEvents?.slice(0, 3).map(e => ({ 
        id: e.id, 
        title: e.title, 
        point_type: e.point_type, 
        point_value: e.point_value 
      })));

      if (eventsError) {
        console.error('❌ Error fetching events:', eventsError);
        console.error('❌ Events error details:', JSON.stringify(eventsError));
        return;
      }

      // Calculate points for each user
      const userPoints: Record<string, number> = {};
      let processedUsers = 0;
      
      console.log('\n🧮 Starting point calculation for each user...');
      
      profiles?.forEach((profile, index) => {
        const userId = profile.user_id;
        const userAttendance = allAttendance?.filter(a => a.user_id === userId) || [];
        const userRegistrations = allRegistrations?.filter(r => r.user_id === userId) || [];
        
        console.log(`\n👤 Processing user ${index + 1}/${profiles.length}: ${profile.first_name} ${profile.last_name} (${userId})`);
        console.log(`   📅 Attendance records: ${userAttendance.length}`);
        console.log(`   📝 Registration records: ${userRegistrations.length}`);
        
        // Debug: Show the actual user_id values to check for mismatches
        if (userAttendance.length > 0) {
          console.log(`   📅 User's attendance user_ids:`, userAttendance.map(a => a.user_id));
        }
        if (userRegistrations.length > 0) {
          console.log(`   📝 User's registration user_ids:`, userRegistrations.map(r => r.user_id));
        }
        
        // Check if this is the current user
        const isCurrentUser = userId === currentUserId;
        console.log(`   👤 Is current user: ${isCurrentUser}`);
        
        let totalPoints = 0;
        
        userAttendance.forEach((attendance, attIndex) => {
          const event = allEvents?.find(e => e.id === attendance.event_id);
          console.log(`   📅 Attendance ${attIndex + 1}: event_id=${attendance.event_id}, event found=${!!event}`);
          
          if (event) {
            const wasRegistered = userRegistrations.some(r => r.event_id === event.id);
            // Fixed point system: 1 point for attendance + 0.5 points for registration
            const pointsEarned = wasRegistered ? 1.5 : 1;
            totalPoints += pointsEarned;
            
            console.log(`     🎯 Event: ${event.title || 'Untitled'}, registered=${wasRegistered}, points=${pointsEarned}`);
          } else {
            console.log(`     ❌ Event ${attendance.event_id} not found in events table!`);
            // Debug: Show what event IDs are available
            console.log(`     🔍 Available event IDs:`, allEvents?.slice(0, 5).map(e => e.id));
          }
        });
        
        console.log(`   📊 ${profile.first_name} ${profile.last_name}: ${totalPoints} total points`);
        userPoints[userId] = totalPoints;
        
        if (totalPoints > 0) {
          processedUsers++;
        }
        
        // Special logging for users with no points to debug why
        if (totalPoints === 0 && userAttendance.length === 0) {
          console.log(`   ⚠️ ${profile.first_name} ${profile.last_name} has NO attendance records`);
          // Check if their user_id appears in ANY attendance records
          const hasAnyAttendance = allAttendance?.some(a => a.user_id === userId);
          console.log(`   🔍 User ID ${userId} found in ANY attendance: ${hasAnyAttendance}`);
          
          // Show what user_ids DO exist in attendance
          const uniqueUserIds = [...new Set(allAttendance?.map(a => a.user_id))];
          console.log(`   🔍 Unique user IDs in attendance table:`, uniqueUserIds.slice(0, 10));
        }
      });

      console.log(`\n📈 Users with points: ${processedUsers}`);
      console.log('📈 All user points:', Object.entries(userPoints).map(([id, points]) => {
        const user = profiles?.find(p => p.user_id === id);
        return { name: user ? `${user.first_name} ${user.last_name}` : 'Unknown', points };
      }));

      // Create leaderboard array with names
      const leaderboardData = profiles?.map(profile => ({
        id: profile.user_id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
        totalPoints: userPoints[profile.user_id] || 0,
      })) || [];

      console.log('📋 Leaderboard data before sorting:', leaderboardData.slice(0, 5));

      // Sort by total points (descending)
      leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);

      console.log('📋 Leaderboard data after sorting:', leaderboardData.slice(0, 5));

      // Add rankings
      const rankedData = leaderboardData.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));

      console.log('📋 Ranked leaderboard data:', rankedData.slice(0, 5));

      // Set top 5 for leaderboard
      const top5 = rankedData.slice(0, 5);
      console.log('🏆 Final top 5 being set to state:', top5);
      setLeaderboard(top5);

      // Find current user's rank
      const currentUserData = rankedData.find(user => user.id === currentUserId);
      console.log('👤 Current user data:', currentUserData);
      
      if (currentUserData) {
        setUserRank({
          name: currentUserData.name,
          totalPoints: currentUserData.totalPoints,
          rank: currentUserData.rank,
        });
        console.log('👤 Current user rank set:', currentUserData.rank);
      }

    } catch (error) {
      console.error('💥 Error fetching leaderboard:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.grayText}>Loading your points...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerContent}>
          <MaterialIcons name="assessment" size={28} color={Colors.primary} />
          <Text style={styles.title}>Point Tracker</Text>
          <Text style={styles.subtitle}>
            {pillarsMet} of {Object.keys(POINT_REQUIREMENTS).length} pillars completed
          </Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(pillarsMet / Object.keys(POINT_REQUIREMENTS).length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round((pillarsMet / Object.keys(POINT_REQUIREMENTS).length) * 100)}% Complete
            </Text>
          </View>
        </View>
      </View>

      {/* Point Audit Cards */}
      <View style={styles.auditSection}>
        <Text style={styles.sectionTitle}>📊 Point Categories</Text>
        {Object.entries(POINT_REQUIREMENTS).map(([category, required]) => {
          const earned = pointsByCategory[category] || 0;
          const met = earned >= required;
          const progress = Math.min((earned / required) * 100, 100);

          // Category icons and colors (simplified)
          const getCategoryInfo = (cat: string) => {
            switch (cat) {
              case 'brotherhood':
                return { icon: 'people', color: Colors.primary };
              case 'professional':
                return { icon: 'business-center', color: '#4A90E2' };
              case 'service':
                return { icon: 'volunteer-activism', color: '#50C878' };
              case 'scholarship':
                return { icon: 'school', color: '#8E44AD' };
              case 'health':
                return { icon: 'fitness-center', color: '#E67E22' };
              case 'fundraising':
                return { icon: 'attach-money', color: '#F39C12' };
              case 'dei':
                return { icon: 'groups', color: '#E74C3C' };
              default:
                return { icon: 'category', color: '#95A5A6' };
            }
          };

          const categoryInfo = getCategoryInfo(category);

          return (
            <View
              key={category}
              style={[styles.categoryCard, met && styles.categoryCardCompleted]}
            >
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIconContainer, { backgroundColor: categoryInfo.color }]}>
                  <MaterialIcons name={categoryInfo.icon as any} size={24} color="white" />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryTitle}>
                    {category === 'dei' ? 'DEI' : 
                     category === 'h&w' ? 'Health & Wellness' : 
                     category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  <Text style={styles.categorySubtitle}>
                    {earned.toFixed(1)} / {required} points
                  </Text>
                </View>
                <View style={styles.statusContainer}>
                  {met ? (
                    <View style={styles.completedBadge}>
                      <MaterialIcons name="check-circle" size={16} color="white" />
                      <Text style={styles.badgeText}>Complete</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <MaterialIcons name="schedule" size={14} color="white" />
                      <Text style={styles.badgeText}>
                        {(required - earned).toFixed(1)} left
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${progress}%`,
                        backgroundColor: met ? Colors.primary : categoryInfo.color
                      }
                    ]}
                  />
                </View>
                <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Leaderboard Section */}
      <View style={styles.leaderboardSection}>
        <View style={styles.leaderboardHeader}>
          <MaterialIcons name="leaderboard" size={24} color={Colors.primary} />
          <Text style={styles.leaderboardTitle}>Top Performers</Text>
        </View>
        
        {leaderboard.map((user, index) => (
          <View
            key={user.name}
            style={[
              styles.leaderboardRow,
              index === 0 && styles.firstPlace,
              index === 1 && styles.secondPlace,
              index === 2 && styles.thirdPlace
            ]}
          >
            <View style={styles.rankContainer}>
              <Text style={[styles.rankText, index < 3 && styles.topThreeRank]}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${user.rank}`}
              </Text>
            </View>
            <Text style={[styles.leaderboardName, index < 3 && styles.topThreeName]} 
                  numberOfLines={1} 
                  ellipsizeMode="tail">
              {user.name}
            </Text>
            <View style={styles.pointsContainer}>
              <Text style={[styles.leaderboardPoints, index < 3 && styles.topThreePoints]}>
                {user.totalPoints.toFixed(1)}
              </Text>
              <Text style={styles.pointsLabel}>pts</Text>
            </View>
          </View>
        ))}

        {/* Current User's Rank (if not in top 5) */}
        {userRank && userRank.rank > 5 && (
          <View style={styles.userRankSection}>
            <Text style={styles.userRankLabel}>Your Ranking:</Text>
            <View style={styles.userRankRow}>
              <View style={styles.rankContainer}>
                <Text style={styles.userRankText}>#{userRank.rank}</Text>
              </View>
              <Text style={styles.userRankName} 
                    numberOfLines={1} 
                    ellipsizeMode="tail">
                {userRank.name}
              </Text>
              <View style={styles.pointsContainer}>
                <Text style={styles.userRankPoints}>{userRank.totalPoints.toFixed(1)}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
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
    backgroundColor: '#f8f9fa',
  },
  
  // Header Section
  headerSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  
  // Audit Section
  auditSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 16,
  },
  
  // Category Cards
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryCardCompleted: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#718096',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Progress Bar
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
    minWidth: 35,
  },
  
  // Leaderboard Section
  leaderboardSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginLeft: 8,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F7FAFC',
  },
  firstPlace: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  secondPlace: {
    backgroundColor: '#F0F4F8',
    borderLeftWidth: 4,
    borderLeftColor: '#C0C0C0',
  },
  thirdPlace: {
    backgroundColor: '#FFFAF0',
    borderLeftWidth: 4,
    borderLeftColor: '#CD7F32',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  topThreeRank: {
    fontSize: 18,
    fontWeight: '700',
  },
  leaderboardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
    color: '#2D3748',
  },
  topThreeName: {
    fontWeight: '600',
    fontSize: 16,
  },
  pointsContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  leaderboardPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  topThreePoints: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  pointsLabel: {
    fontSize: 10,
    color: '#718096',
    fontWeight: '500',
  },
  
  // User Rank Section
  userRankSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  userRankLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 8,
    textAlign: 'center',
  },
  userRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EBF4FF',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  userRankText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  userRankName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
    color: Colors.primary,
  },
  userRankPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  
  // Loading styles
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  grayText: {
    marginTop: 12,
    color: '#718096',
    fontSize: 16,
    fontWeight: '500',
  },
});
