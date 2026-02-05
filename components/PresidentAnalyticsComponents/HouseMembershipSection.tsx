/**
 * HouseMembershipSection Component
 * 
 * Displays points distribution by house membership
 */

import React from 'react';
import { HouseMembershipPointsChart, AnalyticsSection } from '../AnalyticsComponents/index';

interface HouseMembershipSectionProps {
  data: Array<{ houseMembership: string; totalPoints: number; memberCount: number; avgPointsPerMember: number }>;
}

export const HouseMembershipSection: React.FC<HouseMembershipSectionProps> = ({ data }) => {
  return (
    <AnalyticsSection title="Points by House Membership">
      <HouseMembershipPointsChart data={data} />
    </AnalyticsSection>
  );
};
