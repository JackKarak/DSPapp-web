/**
 * Officer Analytics Card Components
 * Specialized cards for officer analytics dashboard
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ============================================================================
// KPI CARD
// ============================================================================

type KPICardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  color?: string;
};

export const KPICard: React.FC<KPICardProps> = React.memo(({ 
  title, 
  value, 
  subtitle, 
  trend, 
  color = '#4285F4' 
}) => {
  const trendColor = trend ? (trend >= 0 ? '#34A853' : '#EA4335') : '#80868b';
  const trendSymbol = trend ? (trend >= 0 ? '↑' : '↓') : '';
  
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.kpiSubtitle}>{subtitle}</Text>}
      {trend !== undefined && (
        <Text style={[styles.kpiTrend, { color: trendColor }]}>
          {trendSymbol} {Math.abs(trend).toFixed(1)}%
        </Text>
      )}
    </View>
  );
});
KPICard.displayName = 'KPICard';

// ============================================================================
// ENGAGEMENT METRIC CARD
// ============================================================================

type EngagementMetricProps = {
  icon: string;
  label: string;
  value: string;
  description: string;
  percentage: number;
  color: string;
};

export const EngagementMetricCard: React.FC<EngagementMetricProps> = React.memo(({
  icon,
  label,
  value,
  description,
  percentage,
  color
}) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <View style={styles.metricIconContainer}>
      <Text style={styles.metricIcon}>{icon}</Text>
    </View>
    <View style={styles.metricContent}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricDescription}>{description}</Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  </View>
));
EngagementMetricCard.displayName = 'EngagementMetricCard';

// ============================================================================
// INSIGHT ITEM
// ============================================================================

type InsightItemProps = {
  icon: string;
  text: string;
};

export const InsightItem: React.FC<InsightItemProps> = React.memo(({ icon, text }) => (
  <View style={styles.insightItem}>
    <Text style={styles.insightIcon}>{icon}</Text>
    <Text style={styles.insightText}>{text}</Text>
  </View>
));
InsightItem.displayName = 'InsightItem';

// ============================================================================
// EVENT CARD
// ============================================================================

type EventCardProps = {
  title: string;
  date: string;
  location: string;
  creator: string;
  pointValue: number;
  pointType: string;
  attendanceCount: number;
  attendanceRate: number;
};

export const OfficerEventCard: React.FC<EventCardProps> = React.memo(({
  title,
  date,
  location,
  creator,
  pointValue,
  pointType,
  attendanceCount,
  attendanceRate
}) => {
  const rateColor = attendanceRate >= 70 ? '#34a853' : attendanceRate >= 50 ? '#fbbc04' : '#ea4335';

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{pointValue}</Text>
        </View>
      </View>
      <Text style={styles.eventDate}>{date}</Text>
      <Text style={styles.eventLocation}>{location}</Text>
      <View style={styles.attendanceInfo}>
        <View style={styles.attendanceStats}>
          <Text style={styles.attendanceCount}>{attendanceCount} attended</Text>
          <Text style={styles.attendanceRate}>
            {attendanceRate.toFixed(0)}% participation
          </Text>
        </View>
        <View style={[styles.attendanceIndicator, { backgroundColor: rateColor }]}>
          <Text style={styles.attendancePercent}>{Math.round(attendanceRate)}%</Text>
        </View>
      </View>
      <View style={styles.eventTypeBadge}>
        <Text style={styles.eventTypeText}>{pointType}</Text>
      </View>
    </View>
  );
});
OfficerEventCard.displayName = 'OfficerEventCard';

// ============================================================================
// FEEDBACK ITEM
// ============================================================================

type FeedbackItemProps = {
  rating: number;
  comments: string;
  date: string;
};

export const FeedbackItem: React.FC<FeedbackItemProps> = React.memo(({
  rating,
  comments,
  date
}) => (
  <View style={styles.feedbackItem}>
    <View style={styles.feedbackHeader}>
      <View style={styles.ratingContainer}>
        {[...Array(5)].map((_, i) => (
          <Text key={i} style={[styles.star, { color: i < rating ? '#FBBC04' : '#e0e0e0' }]}>★</Text>
        ))}
      </View>
      <Text style={styles.feedbackDate}>{date}</Text>
    </View>
    <Text style={styles.feedbackText}>&quot;{comments}&quot;</Text>
  </View>
));
FeedbackItem.displayName = 'FeedbackItem';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  kpiCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    flex: 1,
    marginHorizontal: 6,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiTitle: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiSubtitle: {
    fontSize: 11,
    color: '#80868b',
    marginBottom: 6,
  },
  kpiTrend: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  metricIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 18,
  },
  metricContent: {
    paddingRight: 40,
  },
  metricLabel: {
    fontSize: 12,
    color: '#5f6368',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 12,
    color: '#80868b',
    marginBottom: 12,
    lineHeight: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f1f3f4',
    borderRadius: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
  },
  insightIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    fontSize: 13,
    color: '#5f6368',
    lineHeight: 18,
    flex: 1,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#1a73e8',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
    flex: 1,
    marginRight: 12,
    lineHeight: 20,
  },
  pointsBadge: {
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a73e8',
  },
  eventDate: {
    fontSize: 13,
    color: '#5f6368',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 13,
    color: '#5f6368',
    marginBottom: 12,
  },
  attendanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  attendanceStats: {
    flex: 1,
  },
  attendanceCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 2,
  },
  attendanceRate: {
    fontSize: 12,
    color: '#5f6368',
  },
  attendanceIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  attendancePercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  eventTypeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#5f6368',
    textTransform: 'capitalize',
  },
  feedbackItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1a73e8',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 14,
    marginRight: 2,
  },
  feedbackDate: {
    fontSize: 11,
    color: '#5f6368',
    fontWeight: '400',
  },
  feedbackText: {
    fontSize: 13,
    color: '#202124',
    lineHeight: 19,
  },
});
