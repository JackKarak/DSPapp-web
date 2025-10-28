/**
 * FraternityHealth Component
 * 
 * Displays overview metrics for fraternity health
 */

import React from 'react';
import { View } from 'react-native';
import { MetricCard, AnalyticsSection } from '../../../../components/AnalyticsComponents/index';
import { styles } from '../_styles/analyticsStyles';

interface HealthMetrics {
  totalMembers: number;
  activeMembers: number;
  retentionRate: number;
  avgAttendanceRate: number;
  avgPoints: number;
}

interface FraternityHealthProps {
  healthMetrics: HealthMetrics;
  totalEvents: number;
}

export const FraternityHealth: React.FC<FraternityHealthProps> = ({
  healthMetrics,
  totalEvents,
}) => {
  return (
    <AnalyticsSection title="Fraternity Health">
      <View style={styles.metricsGrid}>
        <MetricCard 
          icon="people" 
          value={healthMetrics.totalMembers} 
          label="Total Members" 
        />
        <MetricCard 
          icon="checkmark-circle" 
          value={healthMetrics.activeMembers} 
          label="Active Members" 
        />
        <MetricCard 
          icon="trending-up" 
          value={`${healthMetrics.retentionRate.toFixed(1)}%`} 
          label="Retention Rate" 
        />
        <MetricCard 
          icon="calendar" 
          value={`${healthMetrics.avgAttendanceRate.toFixed(1)}%`} 
          label="Avg Attendance" 
        />
        <MetricCard 
          icon="trophy" 
          value={healthMetrics.avgPoints.toFixed(1)} 
          label="Avg Points" 
        />
        <MetricCard 
          icon="calendar-outline" 
          value={totalEvents} 
          label="Events Tracked" 
        />
      </View>
    </AnalyticsSection>
  );
};
