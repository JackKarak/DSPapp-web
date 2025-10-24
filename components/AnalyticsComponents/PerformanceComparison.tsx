/**
 * Performance Comparison Component
 * Shows how officer's events compare to other officers
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type PerformanceComparisonProps = {
  myAvgAttendance: number;
  myAvgRating: number;
  myEngagementRate: number;
  allOfficersAvgAttendance: number;
  allOfficersAvgRating: number;
  allOfficersEngagementRate: number;
};

export const PerformanceComparison: React.FC<PerformanceComparisonProps> = ({
  myAvgAttendance,
  myAvgRating,
  myEngagementRate,
  allOfficersAvgAttendance,
  allOfficersAvgRating,
  allOfficersEngagementRate,
}) => {
  const calculateDifference = (myValue: number, avgValue: number) => {
    if (avgValue === 0) return 0;
    return ((myValue - avgValue) / avgValue) * 100;
  };

  const attendanceDiff = calculateDifference(myAvgAttendance, allOfficersAvgAttendance);
  const ratingDiff = calculateDifference(myAvgRating, allOfficersAvgRating);
  const engagementDiff = calculateDifference(myEngagementRate, allOfficersEngagementRate);

  const getStatusColor = (diff: number) => {
    if (diff > 0) return '#34a853';
    if (diff < 0) return '#d93025';
    return '#5f6368';
  };

  const getStatusIcon = (diff: number) => {
    if (diff > 5) return '↑';
    if (diff < -5) return '↓';
    return '=';
  };

  const ComparisonRow = ({ 
    label, 
    myValue, 
    avgValue, 
    diff, 
    suffix = '' 
  }: { 
    label: string; 
    myValue: number; 
    avgValue: number; 
    diff: number; 
    suffix?: string;
  }) => (
    <View style={styles.comparisonRow}>
      <View style={styles.labelSection}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valuesSection}>
        <View style={styles.valueColumn}>
          <Text style={styles.valueLabel}>You</Text>
          <Text style={styles.myValue}>{myValue.toFixed(1)}{suffix}</Text>
        </View>
        <View style={styles.valueColumn}>
          <Text style={styles.valueLabel}>Average</Text>
          <Text style={styles.avgValue}>{avgValue.toFixed(1)}{suffix}</Text>
        </View>
        <View style={[styles.diffColumn, { backgroundColor: getStatusColor(diff) + '15' }]}>
          <Text style={[styles.diffIcon, { color: getStatusColor(diff) }]}>
            {getStatusIcon(diff)}
          </Text>
          <Text style={[styles.diffValue, { color: getStatusColor(diff) }]}>
            {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance vs Other Officers</Text>
      
      <View style={styles.comparisons}>
        <ComparisonRow
          label="Attendance"
          myValue={myAvgAttendance}
          avgValue={allOfficersAvgAttendance}
          diff={attendanceDiff}
        />
        <ComparisonRow
          label="Rating"
          myValue={myAvgRating}
          avgValue={allOfficersAvgRating}
          diff={ratingDiff}
          suffix="/5"
        />
        <ComparisonRow
          label="Engagement"
          myValue={myEngagementRate}
          avgValue={allOfficersEngagementRate}
          diff={engagementDiff}
          suffix="%"
        />
      </View>

      <View style={styles.summarySection}>
        {attendanceDiff > 10 && ratingDiff > 5 ? (
          <Text style={styles.summaryText}>
            Your events are performing above average across all metrics.
          </Text>
        ) : attendanceDiff < -10 || ratingDiff < -5 ? (
          <Text style={styles.summaryText}>
            Consider reviewing event planning strategies to improve performance.
          </Text>
        ) : (
          <Text style={styles.summaryText}>
            Your events are performing at or near the officer average.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  comparisons: {
    gap: 16,
  },
  comparisonRow: {
    flexDirection: 'column',
    gap: 8,
  },
  labelSection: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5f6368',
    letterSpacing: 0.1,
  },
  valuesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  valueColumn: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 10,
    color: '#80868b',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  myValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  avgValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5f6368',
  },
  diffColumn: {
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    minWidth: 60,
  },
  diffIcon: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  diffValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  summarySection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryText: {
    fontSize: 12,
    color: '#5f6368',
    textAlign: 'center',
    lineHeight: 18,
  },
});
