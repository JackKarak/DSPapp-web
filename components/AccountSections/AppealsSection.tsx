/**
 * AppealsSection Component
 * 
 * Displays user's point appeals and appealable events
 */

import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDateInEST } from '../../lib/dateUtils';
import { getPointTypeColors, formatPointTypeText } from '../../lib/pointTypeColors';

interface Event {
  id: string;
  title: string;
  date: string;
  host_name: string;
  point_value?: number;
  point_type?: string;
}

interface PointAppeal {
  id: string;
  event_id: string;
  appeal_reason: string;
  picture_url?: string; // Optional
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  reviewed_at?: string;
  admin_response?: string;
  event?: {
    id: string;
    title: string;
    start_time: string;
    point_value: number;
    point_type: string;
  };
  reviewer?: {
    first_name: string;
    last_name: string;
  };
}

interface AppealsSectionProps {
  userAppeals: PointAppeal[];
  appealableEvents: Event[];
  onAppealPress: (event: Event) => void;
  userRole: string | null;
}

const AppealRow: React.FC<{ appeal: PointAppeal }> = ({ appeal }) => {
  const statusColors = {
    pending: '#fbbf24',
    approved: '#10b981',
    denied: '#ef4444',
  };

  const statusEmojis = {
    pending: '⏳',
    approved: '✅',
    denied: '❌',
  };

  return (
    <View style={styles.appealRow}>
      <View style={styles.appealHeader}>
        <Text style={styles.appealTitle} numberOfLines={1}>
          {appeal.event?.title || 'Unknown Event'}
        </Text>
        <View style={styles.appealTags}>
          {appeal.event?.point_type && (
            <View style={[
              styles.pointTypeTag,
              {
                backgroundColor: getPointTypeColors(appeal.event.point_type).backgroundColor,
                borderColor: getPointTypeColors(appeal.event.point_type).borderColor,
              }
            ]}>
              <Text style={[
                styles.pointTypeText,
                { color: getPointTypeColors(appeal.event.point_type).textColor }
              ]}>
                {formatPointTypeText(appeal.event.point_type)}
              </Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: statusColors[appeal.status] }]}>
            <Text style={styles.statusText}>
              {statusEmojis[appeal.status]} {appeal.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.appealReason} numberOfLines={2}>
        {appeal.appeal_reason}
      </Text>
      <Text style={styles.appealDate}>
        Submitted: {formatDateInEST(appeal.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
      </Text>
      {appeal.admin_response && (
        <View style={styles.reviewNotesContainer}>
          <Text style={styles.reviewNotesLabel}>Admin Response:</Text>
          <Text style={styles.reviewNotes}>{appeal.admin_response}</Text>
        </View>
      )}
    </View>
  );
};

const AppealableEventRow: React.FC<{ 
  event: Event; 
  onPress: (event: Event) => void;
}> = ({ event, onPress }) => (
  <TouchableOpacity style={styles.appealableRow} onPress={() => onPress(event)}>
    <View style={styles.appealableContent}>
      <View style={styles.appealableTitleRow}>
        <Text style={styles.appealableTitle} numberOfLines={1}>
          {event.title}
        </Text>
        {event.point_type && (
          <View style={[
            styles.pointTypeTag,
            {
              backgroundColor: getPointTypeColors(event.point_type).backgroundColor,
              borderColor: getPointTypeColors(event.point_type).borderColor,
            }
          ]}>
            <Text style={[
              styles.pointTypeText,
              { color: getPointTypeColors(event.point_type).textColor }
            ]}>
              {formatPointTypeText(event.point_type)}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.appealableDate}>
        {formatDateInEST(event.date, { month: 'short', day: 'numeric', year: 'numeric' })}
      </Text>
      <Text style={styles.appealableHost} numberOfLines={1}>
        Host: {event.host_name}
      </Text>
    </View>
    <View style={styles.appealButton}>
      <Text style={styles.appealButtonText}>Appeal</Text>
    </View>
  </TouchableOpacity>
);

export const AppealsSection: React.FC<AppealsSectionProps> = ({
  userAppeals,
  appealableEvents,
  onAppealPress,
  userRole,
}) => {
  const [appealableExpanded, setAppealableExpanded] = useState(false);
  
  // Pledges cannot submit appeals
  if (userRole === 'pledge') {
    return null;
  }

  // Show only 5 most recent appealable events by default
  const displayedAppealableEvents = appealableExpanded 
    ? appealableEvents 
    : appealableEvents.slice(0, 5);

  return (
    <View style={styles.container}>
      {/* User Appeals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Appeals</Text>
        {userAppeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No appeals submitted yet</Text>
          </View>
        ) : (
          <FlatList
            data={userAppeals}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <AppealRow appeal={item} />}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      {/* Appealable Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appealable Events</Text>
        <Text style={styles.sectionSubtitle}>
          Events from the last 30 days that you didn't attend
        </Text>
        {appealableEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyText}>
              No appealable events. Great attendance!
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={displayedAppealableEvents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <AppealableEventRow event={item} onPress={onAppealPress} />
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            
            {/* Show More/Less Button */}
            {appealableEvents.length > 5 && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setAppealableExpanded(!appealableExpanded)}
              >
                <Text style={styles.expandButtonText}>
                  {appealableExpanded 
                    ? 'Show Less' 
                    : `Show All (${appealableEvents.length - 5} more)`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  appealRow: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appealTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  appealTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pointTypeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  appealReason: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
    lineHeight: 18,
  },
  appealDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  reviewNotesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  reviewNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  reviewNotes: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  appealableRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  appealableContent: {
    flex: 1,
    marginRight: 12,
  },
  appealableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  appealableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  appealableDate: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  appealableHost: {
    fontSize: 12,
    color: '#94a3b8',
  },
  appealButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  appealButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  expandButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  separator: {
    height: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
