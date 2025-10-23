/**
 * RecentEvents Component
 * 
 * Displays recent event analytics with pagination
 */

import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { EventRow, AnalyticsSection } from '../../../../components/AnalyticsComponents/index';
import type { EventAnalytics } from '../../../../types/analytics';
import { styles } from '../styles/analyticsStyles';

interface RecentEventsProps {
  eventAnalytics: EventAnalytics[];
  hasMore: boolean;
  onLoadMore: () => void;
}

export const RecentEvents: React.FC<RecentEventsProps> = ({ 
  eventAnalytics, 
  hasMore,
  onLoadMore 
}) => {
  const renderEventItem = useCallback(
    ({ item }: { item: EventAnalytics }) => <EventRow item={item} />, 
    []
  );

  const keyExtractor = useCallback(
    (item: EventAnalytics) => item.id || '', 
    []
  );

  return (
    <AnalyticsSection title="Recent Events">
      <FlatList
        data={eventAnalytics}
        renderItem={renderEventItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={hasMore ? <ActivityIndicator size="small" color="#4285F4" style={styles.loader} /> : null}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
      />
    </AnalyticsSection>
  );
};
