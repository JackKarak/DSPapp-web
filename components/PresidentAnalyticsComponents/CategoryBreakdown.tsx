/**
 * CategoryBreakdown Component
 * 
 * Displays points distribution across categories
 */

import React from 'react';
import { CategoryPointsChart, AveragePointsPerMemberChart, AnalyticsSection } from '../AnalyticsComponents/index';
import type { CategoryPointsBreakdown } from '../../types/analytics';

interface CategoryBreakdownProps {
  categoryBreakdown: CategoryPointsBreakdown[];
  totalMembers: number;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ categoryBreakdown, totalMembers }) => {
  return (
    <AnalyticsSection title="Points by Category">
      <CategoryPointsChart data={categoryBreakdown} />
      <AveragePointsPerMemberChart data={categoryBreakdown} totalMembers={totalMembers} />
    </AnalyticsSection>
  );
};
