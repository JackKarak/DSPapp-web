/**
 * Leaderboard Component
 * 
 * Displays the top performers and user's rank
 */

import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from '../../../../styles/points/pointsStyles';

interface LeaderboardUser {
  name: string;
  totalPoints: number;
  rank: number;
}

interface LeaderboardProps {
  leaderboard: LeaderboardUser[];
  userRank: LeaderboardUser | null;
  colors: any;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  leaderboard,
  userRank,
  colors,
}) => {
  return (
    <View style={[styles.leaderboardSection, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.leaderboardHeader}>
        <MaterialIcons name="leaderboard" size={24} color={colors.primary} />
        <Text style={[styles.leaderboardTitle, { color: colors.text }]}>
          Top Performers
        </Text>
      </View>
      
      {leaderboard.map((user, index) => (
        <View
          key={user.name + user.rank}
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
  );
};
