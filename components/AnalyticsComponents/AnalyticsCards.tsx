/**
 * Reusable Analytics Components
 * Small, focused components for analytics display
 */

import React, { memo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MemberPerformance, EventAnalytics } from '../../types/analytics';
import { formatTime } from '../../hooks/analytics';

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
}

export const MetricCard = memo<MetricCardProps>(({ label, value, icon, loading = false }) => (
  <View style={styles.metricCard}>
    <Ionicons name={icon} size={32} color="#4285F4" />
    <Text style={styles.metricTitle}>{label}</Text>
    {loading ? (
      <ActivityIndicator size="small" color="#4285F4" />
    ) : (
      <Text style={styles.metricValue}>{value}</Text>
    )}
  </View>
));
MetricCard.displayName = 'MetricCard';

// ============================================================================
// PERFORMANCE ROW
// ============================================================================

interface PerformanceRowProps {
  item: MemberPerformance;
  index: number;
}

export const PerformanceRow = memo<PerformanceRowProps>(({ item, index }) => (
  <View style={styles.performanceRow}>
    <Text style={styles.rank}>#{index + 1}</Text>
    <View style={styles.performanceDetails}>
      <Text style={styles.memberName}>{item.name}</Text>
      <Text style={styles.memberMeta}>
        {item.pledgeClass} • {item.eventsAttended} events • {item.attendanceRate.toFixed(1)}%
      </Text>
    </View>
    <Text style={styles.points}>{item.points} pts</Text>
  </View>
));
PerformanceRow.displayName = 'PerformanceRow';

// ============================================================================
// EVENT ROW
// ============================================================================

interface EventRowProps {
  item: EventAnalytics;
}

export const EventRow = memo<EventRowProps>(({ item }) => (
  <View style={styles.eventRow}>
    <View style={styles.eventHeader}>
      <Text style={styles.eventTitle}>{item.title}</Text>
      <Text style={styles.eventDate}>{new Date(item.date).toLocaleDateString()}</Text>
    </View>
    <Text style={styles.eventTime}>
      <Ionicons name="time" size={14} color="#666" /> {formatTime(item.startTime)} - {formatTime(item.endTime)}
    </Text>
    <View style={styles.eventStats}>
      <Text style={styles.eventStat}>
        <Ionicons name="people" size={14} /> {item.attendanceCount} ({item.attendanceRate.toFixed(1)}%)
      </Text>
      <Text style={styles.eventStat}>
        <Ionicons name="trophy" size={14} /> {item.pointValue} {item.pointType}
      </Text>
    </View>
  </View>
));
EventRow.displayName = 'EventRow';

// ============================================================================
// DIVERSITY CARD
// ============================================================================

interface DiversityCardProps {
  title: string;
  data: { label: string; count: number; percentage: number }[];
  icon: keyof typeof Ionicons.glyphMap;
  maxItems?: number;
}

export const DiversityCard = memo<DiversityCardProps>(({ 
  title, 
  data, 
  icon, 
  maxItems = 5 
}) => (
  <View style={styles.diversityCard}>
    <View style={styles.diversityHeader}>
      <Ionicons name={icon} size={24} color="#4285F4" />
      <Text style={styles.diversityTitle}>{title}</Text>
    </View>
    {data.slice(0, maxItems).map((item, index) => (
      <View key={index} style={styles.diversityRow}>
        <Text style={styles.diversityLabel}>{item.label}</Text>
        <View style={styles.diversityStats}>
          <Text style={styles.diversityCount}>{item.count}</Text>
          <Text style={styles.diversityPercentage}>({item.percentage.toFixed(1)}%)</Text>
        </View>
      </View>
    ))}
    {data.length > maxItems && (
      <Text style={styles.moreItems}>+{data.length - maxItems} more</Text>
    )}
  </View>
));
DiversityCard.displayName = 'DiversityCard';

// ============================================================================
// INSIGHT CARD
// ============================================================================

interface InsightCardProps {
  insight: string;
}

export const InsightCard = memo<InsightCardProps>(({ insight }) => (
  <View style={styles.insightCard}>
    <Ionicons name="bulb" size={20} color="#F7B910" />
    <Text style={styles.insightText}>{insight}</Text>
  </View>
));
InsightCard.displayName = 'InsightCard';

// ============================================================================
// DIVERSITY SCORE CARD
// ============================================================================

interface DiversityScoreCardProps {
  score: number;
}

export const DiversityScoreCard = memo<DiversityScoreCardProps>(({ score }) => {
  const getScoreColor = (s: number) => {
    if (s >= 70) return '#34A853';
    if (s >= 50) return '#F7B910';
    if (s >= 30) return '#FF9800';
    return '#EA4335';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 70) return 'Excellent';
    if (s >= 50) return 'Good';
    if (s >= 30) return 'Moderate';
    return 'Needs Improvement';
  };

  return (
    <View style={styles.scoreCard}>
      <Text style={styles.scoreLabel}>Diversity Index</Text>
      <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
        {score.toFixed(0)}
      </Text>
      <Text style={styles.scoreSubLabel}>{getScoreLabel(score)}</Text>
      <View style={styles.scoreBar}>
        <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: getScoreColor(score) }]} />
      </View>
    </View>
  );
});
DiversityScoreCard.displayName = 'DiversityScoreCard';

// ============================================================================
// ANALYTICS SECTION
// ============================================================================

interface AnalyticsSectionProps {
  title: string;
  children: React.ReactNode;
  error?: string | null;
}

export const AnalyticsSection = memo<AnalyticsSectionProps>(({ title, children, error }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {error ? (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={24} color="#EA4335" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    ) : (
      children
    )}
  </View>
));
AnalyticsSection.displayName = 'AnalyticsSection';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
    margin: 6,
    minWidth: 150,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 8,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 12,
    minWidth: 40,
  },
  performanceDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  memberMeta: {
    fontSize: 13,
    color: '#666',
  },
  points: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34A853',
  },
  eventRow: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  eventDate: {
    fontSize: 13,
    color: '#666',
  },
  eventTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  eventStats: {
    flexDirection: 'row',
    gap: 16,
  },
  eventStat: {
    fontSize: 13,
    color: '#666',
  },
  diversityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  diversityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  diversityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  diversityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  diversityLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  diversityStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diversityCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  diversityPercentage: {
    fontSize: 13,
    color: '#666',
  },
  moreItems: {
    fontSize: 13,
    color: '#4285F4',
    marginTop: 8,
    fontStyle: 'italic',
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F7B910',
    alignItems: 'center',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    lineHeight: 20,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 4,
  },
  scoreSubLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  scoreBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EA4335',
    marginLeft: 12,
  },
});
