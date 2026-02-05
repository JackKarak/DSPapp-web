/**
 * useDiversityMetrics Hook
 * Calculates diversity metrics and insights
 */

import { useMemo } from 'react';
import type { Member, DiversityMetrics } from '../../types/analytics';

export function useDiversityMetrics(members: Member[]): DiversityMetrics {
  return useMemo(() => {
    const total = members.length;
    
    // Helper function to create distribution with percentage
    const createDistribution = (
      field: keyof Member, 
      parseMultiple = false
    ): { label: string; count: number; percentage: number }[] => {
      const counts = new Map<string, number>();
      
      members.forEach((m) => {
        const value = m[field];
        if (value) {
          if (parseMultiple && typeof value === 'string') {
            // Handle comma-separated values (majors, minors)
            const values = value.split(',').map(v => v.trim()).filter(v => v);
            values.forEach(v => {
              counts.set(v, (counts.get(v) || 0) + 1);
            });
          } else {
            const stringValue = String(value);
            counts.set(stringValue, (counts.get(stringValue) || 0) + 1);
          }
        } else {
          counts.set('Not Specified', (counts.get('Not Specified') || 0) + 1);
        }
      });
      
      return Array.from(counts.entries())
        .map(([label, count]) => ({
          label,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);
    };

    // Calculate distributions
    const genderDistribution = createDistribution('gender');
    const pronounDistribution = createDistribution('pronouns');
    const raceDistribution = createDistribution('race');
    const sexualOrientationDistribution = createDistribution('sexual_orientation');
    const majorDistribution = createDistribution('majors', true).slice(0, 10); // Top 10
    const livingTypeDistribution = createDistribution('living_type');
    const houseMembershipDistribution = createDistribution('house_membership');
    const pledgeClassDistribution = createDistribution('pledge_class');
    
    // Graduation year distribution
    const graduationYearDistribution = createDistribution('expected_graduation')
      .sort((a, b) => parseInt(a.label) - parseInt(b.label));

    // Calculate diversity score (Simpson's Diversity Index)
    const calculateDiversityIndex = (distribution: { count: number }[]): number => {
      if (total === 0) return 0;
      const sum = distribution.reduce((acc, item) => {
        const p = item.count / total;
        return acc + (p * p);
      }, 0);
      return (1 - sum) * 100; // Convert to 0-100 scale
    };

    const genderDiversity = calculateDiversityIndex(genderDistribution);
    const raceDiversity = calculateDiversityIndex(raceDistribution);
    const orientationDiversity = calculateDiversityIndex(sexualOrientationDistribution);
    const majorDiversity = calculateDiversityIndex(majorDistribution);
    
    // Overall diversity score (weighted average)
    const diversityScore = (
      genderDiversity * 0.25 + 
      raceDiversity * 0.35 + 
      orientationDiversity * 0.2 + 
      majorDiversity * 0.2
    );

    // Generate insights
    const insights: string[] = [];
    
    // Gender insights
    const genderTop = genderDistribution[0];
    if (genderTop && genderTop.percentage > 70) {
      insights.push(
        `${genderTop.label} makes up ${genderTop.percentage.toFixed(0)}% of membership - consider diversifying recruitment`
      );
    }
    
    // Race insights
    const raceTop = raceDistribution[0];
    if (raceTop && raceTop.percentage > 60) {
      insights.push(
        `${raceTop.label} represents ${raceTop.percentage.toFixed(0)}% of members - explore outreach to underrepresented groups`
      );
    }
    
    // Major insights
    const majorTop = majorDistribution[0];
    if (majorTop && majorTop.percentage > 40) {
      insights.push(`${majorTop.label} is the most common major at ${majorTop.percentage.toFixed(0)}%`);
    }
    
    // Living type insights
    const livingTop = livingTypeDistribution[0];
    if (livingTop) {
      insights.push(`${livingTop.percentage.toFixed(0)}% of members are ${livingTop.label}`);
    }
    
    // Graduation year insights
    const currentYear = new Date().getFullYear();
    const graduating = members.filter(
      m => m.expectedGraduation === currentYear || m.expectedGraduation === currentYear + 1
    );
    if (graduating.length > 0) {
      insights.push(`${graduating.length} members graduating in next year - plan succession`);
    }
    
    // Diversity score insight
    if (diversityScore > 70) {
      insights.push('🌟 Excellent diversity across multiple dimensions');
    } else if (diversityScore > 50) {
      insights.push('✓ Good diversity - continue inclusive recruitment');
    } else if (diversityScore > 30) {
      insights.push('⚠️ Moderate diversity - consider DEI initiatives');
    } else {
      insights.push('⚠️ Low diversity - prioritize inclusive recruitment strategies');
    }

    return {
      genderDistribution,
      pronounDistribution,
      raceDistribution,
      sexualOrientationDistribution,
      majorDistribution,
      livingTypeDistribution,
      houseMembershipDistribution,
      graduationYearDistribution,
      pledgeClassDistribution,
      diversityScore,
      insights,
    };
  }, [members]);
}
