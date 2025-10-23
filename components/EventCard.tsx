/**
 * EventCard Component
 * 
 * Displays a single event card with:
 * - Date badge
 * - Event details (title, time, location)
 * - Type tags and status badges
 * - Registration button (for registerable events)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { formatDateInEST } from '../lib/dateUtils';

// Type definitions
export type EventCardData = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  point_value: number;
  point_type: string;
  created_by: string;
  host_name: string;
  is_registerable: boolean;
  available_to_pledges: boolean;
  startDate: Date;
  endDate: Date;
};

interface EventCardProps {
  event: EventCardData;
  isRegistered: boolean;
  onRegister: (eventId: string) => void;
  onUnregister: (eventId: string) => void;
}

// Utility functions for tag styling
function getTypeTagStyle(type: string) {
  const styles: Record<string, any> = {
    service: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
    social: { backgroundColor: '#fce7f3', borderColor: '#ec4899' },
    dei: { backgroundColor: '#e0e7ff', borderColor: '#6366f1' },
    professional: { backgroundColor: '#d1fae5', borderColor: '#10b981' },
    'h&w': { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  };
  return styles[type] || { backgroundColor: '#f3f4f6', borderColor: '#9ca3af' };
}

function getTypeTagTextStyle(type: string) {
  const styles: Record<string, any> = {
    service: { color: '#1e40af' },
    social: { color: '#9f1239' },
    dei: { color: '#4338ca' },
    professional: { color: '#047857' },
    'h&w': { color: '#b45309' },
  };
  return styles[type] || { color: '#374151' };
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isRegistered,
  onRegister,
  onUnregister,
}) => {
  const now = new Date();
  const isUpcoming = event.startDate > now;

  const handleCardPress = () => {
    router.push({
      pathname: `/event/[id]` as const,
      params: {
        id: event.id,
        is_registerable: event.is_registerable ? '1' : '0'
      }
    });
  };

  const handleRegistrationPress = (e: any) => {
    e.stopPropagation();
    if (isRegistered) {
      onUnregister(event.id);
    } else {
      onRegister(event.id);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.eventCard, !isUpcoming && styles.pastEventCard]}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateDay}>
            {event.startDate.getDate()}
          </Text>
          <Text style={styles.dateMonth}>
            {formatDateInEST(event.start_time, { month: 'short' }).toUpperCase()}
          </Text>
        </View>

        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={styles.eventTime}>
            {formatDateInEST(event.start_time, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </Text>
          <Text style={styles.eventLocation} numberOfLines={1}>
            📍 {event.location}
          </Text>
        </View>
      </View>

      {/* Card Details */}
      <View style={styles.cardDetails}>
        <View style={styles.tagContainer}>
          <View style={[styles.typeTag, getTypeTagStyle(event.point_type)]}>
            <Text style={[styles.typeTagText, getTypeTagTextStyle(event.point_type)]}>
              {event.point_type === 'dei' ? 'DEI' :
                event.point_type === 'h&w' ? 'H&W' :
                  event.point_type.toUpperCase()}
            </Text>
          </View>
          {!isUpcoming && (
            <View style={styles.pastTag}>
              <Text style={styles.pastTagText}>PAST</Text>
            </View>
          )}
          {isRegistered && (
            <View style={styles.registeredTag}>
              <Text style={styles.registeredTagText}>✓ REGISTERED</Text>
            </View>
          )}
        </View>

        <Text style={styles.hostText}>
          Hosted by {event.host_name}
        </Text>
      </View>

      {/* Registration Button */}
      {event.is_registerable && isUpcoming && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isRegistered ? styles.unregisterButton : styles.registerButton
            ]}
            onPress={handleRegistrationPress}
          >
            <Text style={[
              styles.actionButtonText,
              isRegistered ? styles.unregisterButtonText : styles.registerButtonText
            ]}>
              {isRegistered ? 'Unregister' : 'Register Now'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  pastEventCard: {
    opacity: 0.7,
    backgroundColor: '#f8fafc',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateContainer: {
    backgroundColor: '#d97706',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    marginRight: 16,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 28,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fef3c7',
    letterSpacing: 0.5,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
    lineHeight: 24,
  },
  eventTime: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  cardDetails: {
    marginBottom: 16,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pastTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  pastTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  registeredTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  registeredTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  hostText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  cardActions: {
    marginTop: 4,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButton: {
    backgroundColor: '#8b5cf6',
  },
  unregisterButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  registerButtonText: {
    color: '#fff',
  },
  unregisterButtonText: {
    color: '#ef4444',
  },
});
