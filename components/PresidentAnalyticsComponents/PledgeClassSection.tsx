/**
 * PledgeClassSection Component
 * 
 * Displays average points by pledge class
 */

import React from 'react';
import { PledgeClassPointsChart, AnalyticsSection } from '../AnalyticsComponents/index';

interface PledgeClassSectionProps {
  data: Array<{ pledgeClass: string; totalPoints: number; memberCount: number; avgPointsPerMember: number }>;
}

export const PledgeClassSection: React.FC<PledgeClassSectionProps> = ({ data }) => {
  return (
    <AnalyticsSection title="Average Points by Pledge Class">
      <PledgeClassPointsChart data={data} />
    </AnalyticsSection>
  );
};
