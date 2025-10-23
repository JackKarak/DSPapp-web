/**
 * DiversitySection Component
 * 
 * Displays diversity metrics, charts, and insights
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { 
  DiversityScoreCard,
  AnalyticsSection,
  DiversityPieChart,
  DistributionBarChart,
  InsightCard,
  DiversityCard 
} from '../../../../components/AnalyticsComponents/index';
import type { DiversityMetrics } from '../../../../types/analytics';
import { styles } from '../styles/analyticsStyles';

interface DiversitySectionProps {
  diversityMetrics: DiversityMetrics;
  loading: boolean;
}

export const DiversitySection: React.FC<DiversitySectionProps> = ({ 
  diversityMetrics, 
  loading 
}) => {
  return (
    <AnalyticsSection title="Diversity & Inclusion">
      {loading ? (
        <ActivityIndicator size="large" color="#4285F4" style={styles.loader} />
      ) : (
        <>
          <DiversityScoreCard score={diversityMetrics.diversityScore} />
          
          <View style={styles.insightsContainer}>
            {diversityMetrics.insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </View>
          
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
  );
};
