/**
 * EventsSection Component
 * 
 * Displays list of user's attended events with feedback options
 */

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDateInEST } from '../../lib/dateUtils';

interface Event {
  id: string;
  title: string;
  date: string;
  host_name: string;
  point_value?: number;
  point_type?: string;
}

interface EventsSectionProps {
  events: Event[];
  submittedFeedback: Set<string>;
  onEventPress?: (event: Event) => void;
  onFeedbackPress: (event: Event) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

const EventRow: React.FC<{ 
  event: Event; 
  onFeedbackPress: (event: Event) => void; 
  hasFeedbackSubmitted: boolean;
}> = React.memo(({ event, onFeedbackPress, hasFeedbackSubmitted }) => (
  <View style={styles.tableRow}>
    <Text style={styles.cell} numberOfLines={2}>{event.title}</Text>
    <Text style={styles.cell}>
      {formatDateInEST(event.date, { month: 'short', day: 'numeric', year: 'numeric' })}
    </Text>
    <Text style={styles.cell} numberOfLines={1}>{event.host_name}</Text>
    {hasFeedbackSubmitted ? (
      <View style={[styles.feedbackButton, styles.feedbackSubmitted]}>
        <Text style={styles.feedbackSubmittedText}>✅</Text>
      </View>
    ) : (
      <TouchableOpacity 
        style={styles.feedbackButton}
        onPress={() => onFeedbackPress(event)}
        activeOpacity={0.7}
      >
        <Text style={styles.feedbackButtonText}>📝</Text>
      </TouchableOpacity>
    )}
  </View>
));

EventRow.displayName = 'EventRow';

export const EventsSection: React.FC<EventsSectionProps> = ({
  events,
  submittedFeedback,
  onFeedbackPress,
  expanded,
  onToggleExpanded,
}) => {
  const displayedEvents = expanded ? events : events.slice(0, 5);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Events</Text>
      
      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>No Events Yet</Text>
          <Text style={styles.emptySubtitle}>
            Attend your first event to see it here!
          </Text>
        </View>
      ) : (
        <>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.headerCell}>Event</Text>
            <Text style={styles.headerCell}>Date</Text>
            <Text style={styles.headerCell}>Host</Text>
            <Text style={styles.headerCell}>Feedback</Text>
          </View>

          {/* Events Table */}
          <FlatList
            data={displayedEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EventRow
                event={item}
                onFeedbackPress={onFeedbackPress}
                hasFeedbackSubmitted={submittedFeedback.has(item.id)}
              />
            )}
            scrollEnabled={false}
            style={styles.eventsList}
          />

          {/* Expand/Collapse Button */}
          {events.length > 5 && (
            <TouchableOpacity
              style={styles.expandButton}
              onPress={onToggleExpanded}
            >
              <Text style={styles.expandButtonText}>
                {expanded 
                  ? 'Show Less' 
                  : `Show All (${events.length - 5} more)`
                }
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  headerCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
  },
  feedbackButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  feedbackSubmitted: {
    backgroundColor: '#28a745',
  },
  feedbackButtonText: {
    fontSize: 18,
  },
  feedbackSubmittedText: {
    fontSize: 18,
    color: 'white',
  },
  eventsList: {
    maxHeight: 400,
  },
  expandButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
