/**
 * TopPerformers Component
 * 
 * Displays list of top performing members
 */

import React, { useCallback } from 'react';
import { FlatList } from 'react-native';
import { PerformanceRow, AnalyticsSection } from '../../../../components/AnalyticsComponents/index';
import type { MemberPerformance } from '../../../../types/analytics';

interface TopPerformersProps {
  topPerformers: MemberPerformance[];
}

export const TopPerformers: React.FC<TopPerformersProps> = ({ topPerformers }) => {
  const renderPerformanceItem = useCallback(
    ({ item, index }: { item: MemberPerformance; index: number }) => (
      <PerformanceRow item={item} index={index} />
    ), 
    []
  );

  const keyExtractor = useCallback(
    (item: MemberPerformance) => item.userId || '', 
    []
  );

  return (
    <AnalyticsSection title="Top Performers">
      <FlatList
        data={topPerformers}
        renderItem={renderPerformanceItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
      />
    </AnalyticsSection>
  );
};
