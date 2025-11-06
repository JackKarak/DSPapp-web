/**
 * CategoryBreakdown Component
 * 
 * Displays points distribution across categories
 */

import React from 'react';
import { CategoryPointsChart, AnalyticsSection } from '../AnalyticsComponents/index';
import type { CategoryPointsBreakdown } from '../../types/analytics';

interface CategoryBreakdownProps {
  categoryBreakdown: CategoryPointsBreakdown[];
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ categoryBreakdown }) => {
  return (
    <AnalyticsSection title="Points by Category">
      <CategoryPointsChart data={categoryBreakdown} />
    </AnalyticsSection>
  );
};
