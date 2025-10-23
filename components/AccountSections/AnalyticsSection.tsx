/**
 * AnalyticsSection Component
 * 
 * Displays user analytics including stats, rankings, achievements, and progress
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Analytics } from '../../types/hooks';
import { ACHIEVEMENTS, TIER_CONFIG } from '../../constants/accountConstants';
import { Colors } from '../../constants/colors';

interface AnalyticsSectionProps {
  analytics: Analytics;
  onAchievementPress?: () => void;
}

// StatCard Component (inline)
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// AchievementBadge Component (inline)
interface AchievementBadgeProps {
  title: string;
  description: string;
  icon: string;
  tier: string;
  earned: boolean;
  size?: 'small' | 'medium' | 'large';
  tierConfig: {
    name: string;
    color: string;
    order: number;
  };
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  title,
  description,
  icon,
  tier,
  earned,
  size = 'medium',
  tierConfig,
}) => (
  <View style={[styles.achievementBadge, { borderColor: tierConfig.color }]}>
    <View style={[styles.achievementIconContainer, { backgroundColor: tierConfig.color }]}>
      <Text style={styles.achievementIcon}>{icon}</Text>
    </View>
    <Text style={styles.achievementTitle}>{title}</Text>
    <Text style={styles.achievementDescription} numberOfLines={2}>{description}</Text>
    <View style={[styles.achievementTierBadge, { backgroundColor: tierConfig.color }]}>
      <Text style={styles.achievementTierText}>{tierConfig.name}</Text>
    </View>
  </View>
);

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({ 
  analytics, 
  onAchievementPress 
}) => {
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);

  // Get earned achievements with their details
  const earnedAchievements = analytics.achievements.map(key => ({
    key,
    ...ACHIEVEMENTS[key as keyof typeof ACHIEVEMENTS]
  })).filter(Boolean);

  // Sort achievements by tier order (Rose Gold > Gold > Silver > Bronze)
  const sortedAchievements = earnedAchievements.sort((a, b) => {
    const tierA = TIER_CONFIG[a.tier as keyof typeof TIER_CONFIG]?.order || 0;
    const tierB = TIER_CONFIG[b.tier as keyof typeof TIER_CONFIG]?.order || 0;
    return tierB - tierA;
  });

  // Group achievements by tier
  const achievementsByTier = sortedAchievements.reduce((acc, achievement) => {
    const tier = achievement.tier || 'bronze';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(achievement);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      {/* Stats Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
      >
        <StatCard
          title="Total Points"
          value={analytics.totalPoints.toFixed(1)}
          icon="🏆"
          color={Colors.primary}
        />
        <StatCard
          title="Current Streak"
          value={analytics.currentStreak}
          subtitle={`Longest: ${analytics.longestStreak}`}
          icon="🔥"
          color="#FF6B35"
        />
        <StatCard
          title="This Month"
          value={analytics.eventsThisMonth}
          subtitle="events"
          icon="📅"
          color="#4CAF50"
        />
        <StatCard
          title="This Semester"
          value={analytics.eventsThisSemester}
          subtitle="events"
          icon="📚"
          color="#9C27B0"
        />
        <StatCard
          title="Attendance Rate"
          value={`${analytics.attendanceRate.toFixed(0)}%`}
          icon="✅"
          color="#2196F3"
        />
      </ScrollView>

      {/* Rankings */}
      <View style={styles.rankingsContainer}>
        <Text style={styles.sectionTitle}>Rankings</Text>
        
        <View style={styles.rankingRow}>
          <View style={styles.rankingItem}>
            <Text style={styles.rankingLabel}>Pledge Class</Text>
            <Text style={styles.rankingValue}>
              {analytics.rankInPledgeClass} / {analytics.totalInPledgeClass}
            </Text>
          </View>
          
          <View style={styles.rankingItem}>
            <Text style={styles.rankingLabel}>Fraternity</Text>
            <Text style={styles.rankingValue}>
              {analytics.rankInFraternity} / {analytics.totalInFraternity}
            </Text>
          </View>
        </View>
      </View>

      {/* Achievements */}
      <View style={styles.achievementsContainer}>
        <View style={styles.achievementsHeader}>
          <Text style={styles.sectionTitle}>
            Achievements ({earnedAchievements.length})
          </Text>
          {onAchievementPress && (
            <TouchableOpacity onPress={onAchievementPress}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {earnedAchievements.length === 0 ? (
          <View style={styles.noAchievementsContainer}>
            <Text style={styles.noAchievementsIcon}>🎯</Text>
            <Text style={styles.noAchievementsText}>
              No achievements yet. Keep attending events to unlock badges!
            </Text>
          </View>
        ) : (
          <>
            {/* Show preview (top 3) */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.achievementsScroll}
            >
              {sortedAchievements.slice(0, achievementsExpanded ? undefined : 3).map((achievement, index) => {
                const tier = achievement.tier as keyof typeof TIER_CONFIG;
                const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
                return (
                  <AchievementBadge
                    key={achievement.key}
                    title={achievement.title}
                    description={achievement.description}
                    icon={achievement.icon}
                    tier={tier}
                    earned={true}
                    size="medium"
                    tierConfig={tierConfig}
                  />
                );
              })}
            </ScrollView>

            {/* Expand/Collapse Button */}
            {sortedAchievements.length > 3 && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setAchievementsExpanded(!achievementsExpanded)}
              >
                <Text style={styles.expandButtonText}>
                  {achievementsExpanded 
                    ? 'Show Less' 
                    : `Show All (${sortedAchievements.length - 3} more)`
                  }
                </Text>
              </TouchableOpacity>
            )}

            {/* Achievement Summary by Tier */}
            <View style={styles.tierSummary}>
              {Object.entries(achievementsByTier).map(([tier, achievements]) => {
                const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];
                if (!tierConfig) return null;
                
                return (
                  <View key={tier} style={styles.tierSummaryItem}>
                    <View style={[styles.tierDot, { backgroundColor: tierConfig.color }]} />
                    <Text style={styles.tierSummaryText}>
                      {tierConfig.name}: {achievements.length}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* Monthly Progress Chart */}
      {analytics.monthlyProgress && analytics.monthlyProgress.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Monthly Progress</Text>
          <View style={styles.barChart}>
            {analytics.monthlyProgress.map((item, index) => {
              const maxPoints = Math.max(...analytics.monthlyProgress.map(m => m.points || 0), 1);
              const heightPercentage = ((item.points || 0) / maxPoints) * 100;
              
              return (
                <View key={index} style={styles.barColumn}>
                  <View style={styles.barContainer}>
                    <View 
                      style={[
                        styles.bar, 
                        { height: `${Math.max(heightPercentage, 5)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.barValue}>{item.points || 0}</Text>
                  <Text style={styles.barLabel}>{item.month}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statsScroll: {
    marginHorizontal: -8,
    marginBottom: 16,
  },
  statCard: {
    width: 140,
    padding: 16,
    marginHorizontal: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#999',
  },
  rankingsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  rankingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rankingItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  rankingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  rankingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  achievementsContainer: {
    marginBottom: 20,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  achievementsScroll: {
    marginHorizontal: -8,
  },
  achievementBadge: {
    width: 160,
    padding: 16,
    marginHorizontal: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIcon: {
    fontSize: 32,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 6,
  },
  achievementDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    minHeight: 32,
  },
  achievementTierBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  achievementTierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  noAchievementsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noAchievementsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noAchievementsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  expandButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  expandButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  tierSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  tierSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  tierSummaryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  chartContainer: {
    marginTop: 8,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingHorizontal: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  barContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 8,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
});
