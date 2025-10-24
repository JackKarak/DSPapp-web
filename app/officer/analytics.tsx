import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { formatDateInEST } from '../../lib/dateUtils';
import { useOfficerAnalytics } from '../../hooks/analytics';
import {
  HeaderSection,
  KPIRowSection,
  PerformanceComparison,
  FeedbackSection,
  EventsSection,
} from '../../components/AnalyticsComponents';

export default function OfficerAnalytics() {
  const { loading, refreshing, dashboardData, computedMetrics, comparativeData, error, onRefresh } = useOfficerAnalytics();

  const formatDate = (dateString: string) => {
    return formatDateInEST(dateString, { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error || !dashboardData || !computedMetrics) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Failed to load analytics'}</Text>
          <Text style={styles.errorSubtext}>Pull down to refresh</Text>
        </View>
      </ScrollView>
    );
  }

  const { event_stats, feedback_stats } = dashboardData;
  const { averageAttendance, engagementRate, growthRate, enrichedEvents } = computedMetrics;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <HeaderSection position={dashboardData.officer_position || 'Officer'} />

      <KPIRowSection
        avgRating={feedback_stats.avg_rating}
        avgAttendance={averageAttendance}
        engagementRate={engagementRate}
        totalEvents={event_stats.total}
        growthRate={growthRate}
      />

      {comparativeData && (
        <PerformanceComparison
          myAvgAttendance={averageAttendance}
          myAvgRating={feedback_stats.avg_rating}
          myEngagementRate={engagementRate}
          allOfficersAvgAttendance={comparativeData.allOfficersAvgAttendance}
          allOfficersAvgRating={comparativeData.allOfficersAvgRating}
          allOfficersEngagementRate={comparativeData.allOfficersEngagementRate}
        />
      )}

      <FeedbackSection
        recentComments={feedback_stats.recent_comments}
        formatDate={(date) => formatDateInEST(date, { month: 'short', day: 'numeric', year: 'numeric' })}
      />

      <EventsSection
        events={enrichedEvents}
        position={dashboardData.officer_position || 'Officer'}
        formatDate={formatDate}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#5f6368',
    fontWeight: '400',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#d93025',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#80868b',
    textAlign: 'center',
  },
});
