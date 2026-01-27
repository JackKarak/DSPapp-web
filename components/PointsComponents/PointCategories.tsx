/**
 * PointCategories Component
 * 
 * Displays all point categories with their progress
 * Uses dynamic categories from the database
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { styles } from '../../styles/points/pointsStyles';
import { usePointThresholds } from '../../hooks/points/usePointThresholds';
import { CategoryCard } from './CategoryCard';

interface PointCategoriesProps {
  pointsByCategory: Record<string, number>;
  colors: any;
}

export const PointCategories: React.FC<PointCategoriesProps> = ({
  pointsByCategory,
  colors,
}) => {
  const { pointRequirements, loading } = usePointThresholds();

  if (loading) {
    return (
      <View style={styles.auditSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          📊 Point Categories
        </Text>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.auditSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        📊 Point Categories
      </Text>
      
      {Object.entries(pointRequirements).map(([category, config]) => {
        const earned = pointsByCategory[category] || 0;

        return (
          <CategoryCard
            key={category}
            category={category}
            config={config}
            earned={earned}
            colors={colors}
          />
        );
      })}
    </View>
  );
};
