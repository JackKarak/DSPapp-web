/**
 * Points Screen
 * 
 * Main shell that imports and composes all point tracking components
 * Clean, organized, and easy to maintain!
 */

import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Colors } from '../../../constants/colors';
import { usePointsData } from './_hooks/usePointsData';
import { HeaderSection } from './_components/HeaderSection';
import { PointCategories } from './_components/PointCategories';
import { Leaderboard } from './_components/Leaderboard';
import { styles } from './_styles/pointsStyles';

export default function PointsScreen() {
  const colors = Colors['light'];
  const {
    state,
    onRefresh,
    triggerConfetti,
    completionPercentage,
    totalPillars,
  } = usePointsData();

  // Loading state
  if (state.loading && !state.refreshing) {
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

  // Error state
  if (state.error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor={colors.background} 
        />
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={64} color={colors.icon} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {state.error}
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.icon }]}>
            Pull down to retry
          </Text>
        </View>
      </View>
    );
  }

  // Main content
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
            refreshing={state.refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Progress Overview */}
        <HeaderSection
          colors={colors}
          pillarsMet={state.pillarsMet}
          totalPillars={totalPillars}
          completionPercentage={completionPercentage}
        />

        {/* Point Categories */}
        <PointCategories
          pointsByCategory={state.pointsByCategory}
          colors={colors}
        />

        {/* Leaderboard */}
        <Leaderboard
          leaderboard={state.leaderboard}
          userRank={state.userRank}
          colors={colors}
        />
      </ScrollView>

      {/* Confetti when all pillars are complete! */}
      {triggerConfetti && (
        <ConfettiCannon 
          count={150} 
          origin={{ x: 200, y: -20 }} 
          fadeOut={true} 
        />
      )}
    </View>
  );
}
