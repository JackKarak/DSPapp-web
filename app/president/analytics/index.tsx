/**
 * President Analytics Screen
 * 
 * Displays comprehensive fraternity analytics including:
 * - Health metrics (members, retention, attendance, points)
 * - Category breakdown (points by event category)
 * - Top performers (member rankings)
 * - Recent events (event analytics)
 * - Diversity metrics (demographics and inclusion)
 */

import React, { memo } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { 
  useAnalyticsData, 
  useHealthMetrics, 
  useMemberPerformance, 
  useEventAnalytics, 
  useCategoryBreakdown, 
  useDiversityMetrics 
} from '../../../hooks/analytics';
import { FraternityHealth } from './components/FraternityHealth';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { TopPerformers } from './components/TopPerformers';
import { RecentEvents } from './components/RecentEvents';
import { DiversitySection } from './components/DiversitySection';
import { styles } from './styles/analyticsStyles';

function PresidentAnalyticsOptimized() {
  const { state, handleRefresh, handleLoadMoreEvents } = useAnalyticsData();
  const healthMetrics = useHealthMetrics(state.members, state.attendance, state.events);
  const topPerformers = useMemberPerformance(state.members, state.attendance, state.events, 10);
  const eventAnalytics = useEventAnalytics(state.events, state.attendance, state.members);
  const categoryBreakdown = useCategoryBreakdown(state.events, state.attendance, state.members);
  const diversityMetrics = useDiversityMetrics(state.members);

  // Loading state - show spinner for initial load
  if (state.loading && state.members.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" style={styles.loader} />
      </View>
    );
  }

  // Error state - show error message if initial load fails
  if (state.error && state.members.length === 0) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Ionicons name="alert-circle" size={64} color="#EA4335" />
        <Text style={styles.errorText}>{state.error}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl 
          refreshing={state.refreshing} 
          onRefresh={handleRefresh} 
          colors={['#4285F4']} 
          tintColor="#4285F4" 
        />
      }
    >
      <FraternityHealth 
        healthMetrics={healthMetrics} 
        totalEvents={state.events.length} 
      />
      
      <CategoryBreakdown categoryBreakdown={categoryBreakdown} />
      
      <TopPerformers topPerformers={topPerformers} />
      
      <RecentEvents 
        eventAnalytics={eventAnalytics}
        hasMore={state.eventsPagination.hasMore}
        onLoadMore={handleLoadMoreEvents}
      />
      
      <DiversitySection 
        diversityMetrics={diversityMetrics}
        loading={state.loading}
      />
    </ScrollView>
  );
}

// Export with error boundary
export default memo(function AnalyticsWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <PresidentAnalyticsOptimized />
    </ErrorBoundary>
  );
});
