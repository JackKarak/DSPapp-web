/**
 * CategoryCard Component
 * 
 * Displays a single point category with progress bar and status badge
 */

import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from '../../styles/points/pointsStyles';
import { getCategoryInfo } from '../../constants/points/pointRequirements';

interface CategoryCardProps {
  category: string;
  config: {
    required: number;
    name: string;
    description: string;
  };
  earned: number;
  colors: any;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  config,
  earned,
  colors,
}) => {
  const met = earned >= config.required;
  const progress = Math.min((earned / config.required) * 100, 100);
  const categoryInfo = getCategoryInfo(category, colors.primary);

  return (
    <View
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
};
