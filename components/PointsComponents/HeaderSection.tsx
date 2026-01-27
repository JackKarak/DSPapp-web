/**
 * HeaderSection Component
 * 
 * Displays the header with icon, title, subtitle, and progress overview
 */

import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from '../../styles/points/pointsStyles';

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
    <View style={styles.headerSection}>
      {/* Hero Section with Gradient-like Background */}
      <View style={[styles.heroBackground, { backgroundColor: '#330066' }]}>
        <View style={styles.headerContent}>
          <View style={[styles.iconContainer, { backgroundColor: '#F7B910' }]}>
            <MaterialIcons name="stars" size={32} color="#330066" />
          </View>
          <Text style={[styles.title, { color: '#FFFFFF' }]}>Point Tracker</Text>
          <Text style={[styles.subtitle, { color: '#F7B910' }]}>
            Your Professional Development Journey
          </Text>
        </View>
      </View>
      
      {/* Stats Cards */}
      <View style={[styles.statsContainer, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#F0F9FF' }]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#330066' }]}>
              <MaterialIcons name="check-circle" size={20} color="#F7B910" />
            </View>
            <Text style={[styles.statNumber, { color: '#330066' }]}>
              {pillarsMet}
            </Text>
            <Text style={[styles.statLabel, { color: '#666' }]}>
              Met
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#F7B910' }]}>
              <MaterialIcons name="flag" size={20} color="#330066" />
            </View>
            <Text style={[styles.statNumber, { color: '#330066' }]}>
              {totalPillars}
            </Text>
            <Text style={[styles.statLabel, { color: '#666' }]}>
              Total
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#10B981' }]}>
              <MaterialIcons name="trending-up" size={20} color="#FFF" />
            </View>
            <Text style={[styles.statNumber, { color: '#330066' }]}>
              {Math.round(completionPercentage)}%
            </Text>
            <Text style={[styles.statLabel, { color: '#666' }]}>
              Progress
            </Text>
          </View>
        </View>
        
        {/* Enhanced Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { backgroundColor: '#E5E7EB' }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${completionPercentage}%`,
                    backgroundColor: '#F7B910'
                  }
                ]} 
              />
            </View>
          </View>
          {completionPercentage === 100 && (
            <View style={styles.completionBadge}>
              <Text style={styles.completionText}>🎉 All Complete!</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
