/**
 * HeaderSection Component
 * 
 * Displays the header with icon, title, subtitle, and progress overview
 */

import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from '../../../styles/points/pointsStyles';

interface HeaderSectionProps {
  colors: any;
  pillarsMet: number;
  totalPillars: number;
  completionPercentage: number;
}

export const HeaderSection: React.FC<HeaderSectionProps> = ({
  colors,
  pillarsMet,
  totalPillars,
  completionPercentage,
}) => {
  return (
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
  );
};
