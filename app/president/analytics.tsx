import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useAnalyticsData, useHealthMetrics, useMemberPerformance, useEventAnalytics, useCategoryBreakdown, useDiversityMetrics } from '../../hooks/analytics';
import { MetricCard, PerformanceRow, EventRow, DiversityCard, InsightCard, DiversityScoreCard, AnalyticsSection, DiversityPieChart, DistributionBarChart, CategoryPointsChart } from '../../components/AnalyticsComponents/index';
import type { MemberPerformance, EventAnalytics } from '../../types/analytics';

function PresidentAnalyticsOptimized() {
  const { state, handleRefresh, handleLoadMoreEvents } = useAnalyticsData();
  const healthMetrics = useHealthMetrics(state.members, state.attendance, state.events);
  const topPerformers = useMemberPerformance(state.members, state.attendance, state.events, 10);
  const eventAnalytics = useEventAnalytics(state.events, state.attendance, state.members);
  const categoryBreakdown = useCategoryBreakdown(state.events, state.attendance, state.members);
  const diversityMetrics = useDiversityMetrics(state.members);

  const renderPerformanceItem = useCallback(({ item, index }: { item: MemberPerformance; index: number }) => <PerformanceRow item={item} index={index} />, []);
  const renderEventItem = useCallback(({ item }: { item: EventAnalytics }) => <EventRow item={item} />, []);
  const keyExtractor = useCallback((item: { userId?: string; id?: string }) => item.userId || item.id || '', []);

  if (state.loading && state.members.length === 0) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#4285F4" style={styles.loader} /></View>;
  }

  if (state.error && state.members.length === 0) {
    return <View style={[styles.container, styles.errorContainer]}><Ionicons name="alert-circle" size={64} color="#EA4335" /><Text style={styles.errorText}>{state.error}</Text></View>;
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={handleRefresh} colors={['#4285F4']} tintColor="#4285F4" />}>
      <AnalyticsSection title="Fraternity Health">
        <View style={styles.metricsGrid}>
          <MetricCard icon="people" value={healthMetrics.totalMembers} label="Total Members" />
          <MetricCard icon="checkmark-circle" value={healthMetrics.activeMembers} label="Active Members" />
          <MetricCard icon="trending-up" value={`${healthMetrics.retentionRate.toFixed(1)}%`} label="Retention Rate" />
          <MetricCard icon="calendar" value={`${healthMetrics.avgAttendanceRate.toFixed(1)}%`} label="Avg Attendance" />
          <MetricCard icon="trophy" value={healthMetrics.avgPoints.toFixed(1)} label="Avg Points" />
          <MetricCard icon="calendar-outline" value={state.events.length} label="Events Tracked" />
        </View>
      </AnalyticsSection>
      <AnalyticsSection title="Points by Category"><CategoryPointsChart data={categoryBreakdown} /></AnalyticsSection>
      <AnalyticsSection title="Top Performers"><FlatList data={topPerformers} renderItem={renderPerformanceItem} keyExtractor={keyExtractor} scrollEnabled={false} initialNumToRender={10} /></AnalyticsSection>
      <AnalyticsSection title="Recent Events"><FlatList data={eventAnalytics} renderItem={renderEventItem} keyExtractor={keyExtractor} scrollEnabled={false} onEndReached={handleLoadMoreEvents} onEndReachedThreshold={0.5} ListFooterComponent={state.eventsPagination.hasMore ? <ActivityIndicator size="small" color="#4285F4" style={styles.loader} /> : null} initialNumToRender={5} maxToRenderPerBatch={5} windowSize={3} /></AnalyticsSection>
      <AnalyticsSection title="Diversity & Inclusion">
        {state.loading ? <ActivityIndicator size="large" color="#4285F4" style={styles.loader} /> : (
          <>
            <DiversityScoreCard score={diversityMetrics.diversityScore} />
            <View style={styles.insightsContainer}>{diversityMetrics.insights.map((insight, index) => <InsightCard key={index} insight={insight} />)}</View>
            <View style={styles.chartsSection}>
              <Text style={styles.chartsSectionTitle}>Visual Analytics</Text>
              <DiversityPieChart data={diversityMetrics.genderDistribution} title="Gender Distribution" />
              <DiversityPieChart data={diversityMetrics.raceDistribution} title="Race/Ethnicity Distribution" />
              <DistributionBarChart data={diversityMetrics.majorDistribution} title="Top Majors" />
              <DistributionBarChart data={diversityMetrics.pledgeClassDistribution} title="Pledge Class Distribution" />
              <DiversityPieChart data={diversityMetrics.livingTypeDistribution} title="Living Situation" />
            </View>
            <View style={styles.diversityGrid}>
              <DiversityCard title="Gender" data={diversityMetrics.genderDistribution} icon="male-female" maxItems={5} />
              <DiversityCard title="Pronouns" data={diversityMetrics.pronounDistribution} icon="person" maxItems={5} />
              <DiversityCard title="Race/Ethnicity" data={diversityMetrics.raceDistribution} icon="globe" maxItems={5} />
              <DiversityCard title="Sexual Orientation" data={diversityMetrics.sexualOrientationDistribution} icon="heart" maxItems={5} />
              <DiversityCard title="Top Majors" data={diversityMetrics.majorDistribution} icon="school" maxItems={8} />
              <DiversityCard title="Living Situation" data={diversityMetrics.livingTypeDistribution} icon="home" maxItems={5} />
              <DiversityCard title="House Membership" data={diversityMetrics.houseMembershipDistribution} icon="business" maxItems={5} />
              <DiversityCard title="Graduation Year" data={diversityMetrics.graduationYearDistribution} icon="calendar" maxItems={6} />
              <DiversityCard title="Pledge Classes" data={diversityMetrics.pledgeClassDistribution} icon="ribbon" maxItems={8} />
            </View>
          </>
        )}
      </AnalyticsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  insightsContainer: { marginBottom: 16 },
  chartsSection: { marginTop: 16, marginBottom: 16 },
  chartsSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#330066', marginBottom: 16, textAlign: 'center' },
  diversityGrid: { marginTop: 16 },
  errorContainer: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 16, color: '#EA4335', textAlign: 'center', marginTop: 16 },
  loader: { marginVertical: 16 },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F7B910',
  },
  insightText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreSubLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    marginBottom: 12,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  eventTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  // Category Chart Styles
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryLegend: {
    marginTop: 16,
    width: '100%',
  },
  categoryLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  categoryLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4285F4',
    marginRight: 8,
  },
  categoryLegendText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
});

// Export with error boundary
export default memo(function AnalyticsWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <PresidentAnalyticsOptimized />
    </ErrorBoundary>
  );
});
