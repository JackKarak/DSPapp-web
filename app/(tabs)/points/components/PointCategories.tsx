/**
 * PointCategories Component
 * 
 * Displays all point categories with their progress
 */

import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/pointsStyles';
import { POINT_REQUIREMENTS } from '../constants/pointRequirements';
import { CategoryCard } from './CategoryCard';

interface PointCategoriesProps {
  pointsByCategory: Record<string, number>;
  colors: any;
}

export const PointCategories: React.FC<PointCategoriesProps> = ({
  pointsByCategory,
  colors,
}) => {
  return (
    <View style={styles.auditSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        📊 Point Categories
      </Text>
      
      {Object.entries(POINT_REQUIREMENTS).map(([category, config]) => {
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
