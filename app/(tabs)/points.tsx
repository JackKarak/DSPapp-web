import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

const POINT_REQUIREMENTS: Record<string, { required: number; name: string; description: string }> = {
  brotherhood: { 
    required: 20, 
    name: 'Brotherhood', 
    description: 'Build lasting bonds with your brothers' 
  },
  professional: { 
    required: 4, 
    name: 'Professional Development', 
    description: 'Advance your career and skills' 
  },
  service: { 
    required: 4, 
    name: 'Service', 
    description: 'Give back to the community' 
  },
  scholarship: { 
    required: 4, 
    name: 'Scholarship', 
    description: 'Excel academically and learn' 
  },
  health: { 
    required: 3, 
    name: 'Health & Wellness', 
    description: 'Maintain physical and mental well-being' 
  },
  fundraising: { 
    required: 3, 
    name: 'Fundraising', 
    description: 'Support chapter financial goals' 
  },
  dei: { 
    required: 3, 
    name: 'Diversity, Equity & Inclusion', 
    description: 'Promote understanding and inclusion' 
  },
};

export default function PointsScreen() {
  const colors = Colors['light'];
  
  const [pointsByCategory, setPointsByCategory] = useState<Record<string, number>>({});
  const [pillarsMet, setPillarsMet] = useState(0);
  const [previousPillarsMet, setPreviousPillarsMet] = useState(0);
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

  // Calculate confetti trigger - must be before early return to maintain hook order
  const totalPillars = Object.keys(POINT_REQUIREMENTS).length;
  const triggerConfetti = useMemo(() => {
    return previousPillarsMet < totalPillars && pillarsMet >= totalPillars;
  }, [previousPillarsMet, pillarsMet, totalPillars]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const fetchAllData = async () => {
    if (!refreshing) setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setLoading(false);
        return;
      }

      // Fetch ALL data in parallel - only once!
      const [attendanceResult, appealsResult, registrationsResult, eventsResult, profilesResult] = await Promise.all([
        supabase.from('event_attendance').select('*'),
        supabase.from('point_appeal').select('event_id, user_id').eq('status', 'approved'),
        supabase.from('event_registration').select('*'),
        supabase.from('events').select('id, point_type, point_value'),
        supabase.from('users').select('user_id, first_name, last_name, role, officer_position').eq('approved', true)
      ]);

      const { data: allAttendance } = attendanceResult;
      const { data: allApprovedAppeals } = appealsResult;
      let { data: allRegistrations } = registrationsResult;
      const { data: allEvents } = eventsResult;
      const { data: profiles } = profilesResult;

      // Fallback for registrations if primary table failed
      if (!allRegistrations) {
        const { data: registrations2 } = await supabase.from('event_register').select('*');
        allRegistrations = registrations2;
      }

      // Pre-index data into Maps for O(1) lookups instead of O(N) filters
      const attendanceByUser = new Map<string, Set<string>>();
      const appealsByUser = new Map<string, Set<string>>();
      const registrationsByUser = new Map<string, Set<string>>();
      const eventsMap = new Map<string, any>();

      allAttendance?.forEach(a => {
        if (!attendanceByUser.has(a.user_id)) {
          attendanceByUser.set(a.user_id, new Set());
        }
        attendanceByUser.get(a.user_id)!.add(a.event_id);
      });

      allApprovedAppeals?.forEach(a => {
        if (!appealsByUser.has(a.user_id)) {
          appealsByUser.set(a.user_id, new Set());
        }
        appealsByUser.get(a.user_id)!.add(a.event_id);
      });

      allRegistrations?.forEach(r => {
        if (!registrationsByUser.has(r.user_id)) {
          registrationsByUser.set(r.user_id, new Set());
        }
        registrationsByUser.get(r.user_id)!.add(r.event_id);
      });

      allEvents?.forEach(e => {
        eventsMap.set(e.id, e);
      });

      // Calculate current user's points
      const userAttendedIds = attendanceByUser.get(user.id) || new Set();
      const userAppealIds = appealsByUser.get(user.id) || new Set();
      const userRegisteredIds = registrationsByUser.get(user.id) || new Set();
      
      const allUserEventIds = new Set([...userAttendedIds, ...userAppealIds]);

      const categoryPoints: Record<string, number> = {};

      allUserEventIds.forEach(eventId => {
        const event = eventsMap.get(eventId);
        if (event?.point_type) {
          const wasRegistered = userRegisteredIds.has(eventId);
          const pointsEarned = wasRegistered ? 1.5 : 1;
          categoryPoints[event.point_type] = (categoryPoints[event.point_type] || 0) + pointsEarned;
        }
      });

      const metCount = Object.entries(POINT_REQUIREMENTS).reduce((count, [cat, config]) => {
        return (categoryPoints[cat] || 0) >= config.required ? count + 1 : count;
      }, 0);

      setPointsByCategory(categoryPoints);
      setPreviousPillarsMet(pillarsMet);
      setPillarsMet(metCount);

      // Try to use database aggregation for leaderboard (10x faster!)
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: dbPoints, error: rpcError } = await supabase.rpc('calculate_user_points', {
        user_ids: userIds
      });

      let leaderboardData;

      if (!rpcError && dbPoints) {
        // ✅ SUCCESS! Using database aggregation
        console.log('✅ Using database aggregation for leaderboard calculation');
        
        // Map database points to profiles
        const pointsMap = dbPoints.reduce((acc: any, item: any) => {
          acc[item.user_id] = item.total_points;
          return acc;
        }, {});

        leaderboardData = profiles?.map(profile => ({
          id: profile.user_id,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
          totalPoints: pointsMap[profile.user_id] || 0,
        })) || [];
      } else {
        // ⚠️ FALLBACK: Database aggregation not available, use client-side
        console.log('⚠️ Using client-side leaderboard calculation (fallback)');
        
        const userPointsMap = new Map<string, number>();

        profiles?.forEach(profile => {
          const userId = profile.user_id;
          const userAttended = attendanceByUser.get(userId) || new Set();
          const userAppeals = appealsByUser.get(userId) || new Set();
          const userRegistrations = registrationsByUser.get(userId) || new Set();
          
          const allUserEvents = new Set([...userAttended, ...userAppeals]);
          let totalPoints = 0;

          allUserEvents.forEach(eventId => {
            const event = eventsMap.get(eventId);
            if (event) {
              const wasRegistered = userRegistrations.has(eventId);
              totalPoints += wasRegistered ? 1.5 : 1;
            }
          });

          userPointsMap.set(userId, totalPoints);
        });

        leaderboardData = profiles?.map(profile => ({
          id: profile.user_id,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
          totalPoints: userPointsMap.get(profile.user_id) || 0,
        })) || [];
      }

      // Sort and rank leaderboard
      leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);

      const rankedData = leaderboardData.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));

      setLeaderboard(rankedData.slice(0, 5));

      const currentUserData = rankedData.find(u => u.id === user.id);
      if (currentUserData) {
        setUserRank({
          name: currentUserData.name,
          totalPoints: currentUserData.totalPoints,
          rank: currentUserData.rank,
        });
      }

    } catch (error) {
      // Error loading data
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor={colors.background} 
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.icon }]}>
            Loading your points...
          </Text>
        </View>
      </View>
    );
  }

  const completionPercentage = (pillarsMet / totalPillars) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={colors.background} 
      />
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={[styles.headerSection, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.headerContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="assessment" size={32} color="#FFF" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Point Tracker</Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              Track your progress across all fraternity pillars
            </Text>
            
            {/* Progress Overview */}
            <View style={[styles.progressOverview, { backgroundColor: colors.background }]}>
              <View style={styles.progressStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.primary }]}>
                    {pillarsMet}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.icon }]}>
                    Completed
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {totalPillars}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.icon }]}>
                    Total Pillars
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.accent }]}>
                    {Math.round(completionPercentage)}%
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.icon }]}>
                    Complete
                  </Text>
                </View>
              </View>
              
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.borderColor }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${completionPercentage}%`,
                        backgroundColor: colors.primary
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.text }]}>
                  {completionPercentage === 100 ? '🎉 All Pillars Complete!' : `${Math.round(completionPercentage)}% Complete`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Point Categories Section */}
        <View style={styles.auditSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📊 Point Categories
          </Text>
          
          {Object.entries(POINT_REQUIREMENTS).map(([category, config]) => {
            const earned = pointsByCategory[category] || 0;
            const met = earned >= config.required;
            const progress = Math.min((earned / config.required) * 100, 100);

            // Category icons and colors
            const getCategoryInfo = (cat: string) => {
              switch (cat) {
                case 'brotherhood':
                  return { icon: 'people', color: colors.primary };
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
                style={[
                  styles.categoryCard,
                  { backgroundColor: colors.cardBackground },
                  met && [styles.categoryCardCompleted, { borderColor: colors.primary }]
                ]}
              >
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryIconContainer, { backgroundColor: categoryInfo.color }]}>
                    <MaterialIcons name={categoryInfo.icon as any} size={24} color="white" />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryTitle, { color: colors.text }]}>
                      {config.name}
                    </Text>
                    <Text style={[styles.categorySubtitle, { color: colors.icon }]}>
                      {earned.toFixed(1)} / {config.required} points
                    </Text>
                    <Text style={[styles.categoryDescription, { color: colors.icon }]}>
                      {config.description}
                    </Text>
                  </View>
                  <View style={styles.statusContainer}>
                    {met ? (
                      <View style={[styles.completedBadge, { backgroundColor: colors.primary }]}>
                        <MaterialIcons name="check-circle" size={16} color="white" />
                        <Text style={styles.badgeText}>Complete</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.badgeText}>
                          {(config.required - earned).toFixed(1)} left
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarTrack, { backgroundColor: colors.borderColor }]}>
                    <View
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${progress}%`,
                          backgroundColor: met ? colors.primary : categoryInfo.color
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressPercentage, { color: colors.text }]}>
                    {Math.round(progress)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Leaderboard Section */}
        <View style={[styles.leaderboardSection, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.leaderboardHeader}>
            <MaterialIcons name="leaderboard" size={24} color={colors.primary} />
            <Text style={[styles.leaderboardTitle, { color: colors.text }]}>
              Top Performers
            </Text>
          </View>
          
          {leaderboard.map((user, index) => (
            <View
              key={user.name}
              style={[
                styles.leaderboardRow,
                { backgroundColor: colors.background },
                index === 0 && styles.firstPlace,
                index === 1 && styles.secondPlace,
                index === 2 && styles.thirdPlace
              ]}
            >
              <View style={styles.rankContainer}>
                <Text style={[
                  styles.rankText, 
                  { color: colors.text },
                  index < 3 && styles.topThreeRank
                ]}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${user.rank}`}
                </Text>
              </View>
              <Text 
                style={[
                  styles.leaderboardName, 
                  { color: colors.text },
                  index < 3 && styles.topThreeName
                ]} 
                numberOfLines={1} 
                ellipsizeMode="tail"
              >
                {user.name}
              </Text>
              <View style={styles.pointsContainer}>
                <Text style={[
                  styles.leaderboardPoints, 
                  { color: index < 3 ? colors.primary : colors.text },
                  index < 3 && styles.topThreePoints
                ]}>
                  {user.totalPoints.toFixed(1)}
                </Text>
                <Text style={[styles.pointsLabel, { color: colors.icon }]}>pts</Text>
              </View>
            </View>
          ))}

          {/* Current User's Rank (if not in top 5) */}
          {userRank && userRank.rank > 5 && (
            <View style={styles.userRankSection}>
              <Text style={[styles.userRankLabel, { color: colors.icon }]}>
                Your Ranking:
              </Text>
              <View style={[
                styles.userRankRow,
                { 
                  backgroundColor: colors.background,
                  borderColor: colors.primary 
                }
              ]}>
                <View style={styles.rankContainer}>
                  <Text style={[styles.userRankText, { color: colors.primary }]}>
                    #{userRank.rank}
                  </Text>
                </View>
                <Text 
                  style={[styles.userRankName, { color: colors.primary }]} 
                  numberOfLines={1} 
                  ellipsizeMode="tail"
                >
                  {userRank.name}
                </Text>
                <View style={styles.pointsContainer}>
                  <Text style={[styles.userRankPoints, { color: colors.primary }]}>
                    {userRank.totalPoints.toFixed(1)}
                  </Text>
                  <Text style={[styles.pointsLabel, { color: colors.icon }]}>pts</Text>
                </View>
              </View>
            </View>
          )}
        </View>

      {triggerConfetti && <ConfettiCannon count={150} origin={{ x: 200, y: -20 }} fadeOut={true} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Loading styles
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Header Section
  headerSection: {
    marginHorizontal: 20,
    marginTop: Platform.OS === 'ios' ? 10 : 20,
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  
  // Progress Overview
  progressOverview: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Audit Section
  auditSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Category Cards
  categoryCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  categoryCardCompleted: {
    borderWidth: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  
  // Progress Bar
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 40,
  },
  
  // Leaderboard Section
  leaderboardSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  leaderboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  firstPlace: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  secondPlace: {
    borderLeftWidth: 4,
    borderLeftColor: '#C0C0C0',
  },
  thirdPlace: {
    borderLeftWidth: 4,
    borderLeftColor: '#CD7F32',
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  topThreeRank: {
    fontSize: 20,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  topThreeName: {
    fontWeight: 'bold',
    fontSize: 17,
  },
  pointsContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  leaderboardPoints: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  topThreePoints: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pointsLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  
  // User Rank Section
  userRankSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  userRankLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  userRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  userRankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userRankName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  userRankPoints: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
