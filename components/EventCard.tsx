/**
 * EventCard Component
 * 
 * Displays a single event card with:
 * - Date badge
 * - Event details (title, time, location)
 * - Type tags and status badges
 * - Registration button (for registerable events)
 * - Registered users list
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { formatDateInEST } from '../lib/dateUtils';
import { getPointTypeColors, formatPointTypeText } from '../lib/pointTypeColors';
import { supabase } from '../lib/supabase';

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

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isRegistered,
  onRegister,
  onUnregister,
}) => {
  const now = new Date();
  const isUpcoming = event.startDate > now;
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [registrations, setRegistrations] = useState<string[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);

  // Fetch registration count on mount
  useEffect(() => {
    if (event.is_registerable) {
      fetchRegistrationCount();
    }
  }, [event.id]);

  const fetchRegistrationCount = async () => {
    try {
      const { count, error } = await supabase
        .from('event_registration')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id);

      if (!error && count !== null) {
        setRegistrationCount(count);
      }
    } catch (err) {
      console.error('Error fetching registration count:', err);
    }
  };

  const fetchRegistrations = async () => {
    if (registrations.length > 0) {
      setShowRegistrations(!showRegistrations);
      return;
    }

    setLoadingRegistrations(true);
    setShowRegistrations(true);

    try {
      const { data, error } = await supabase
        .from('event_registration')
        .select(`
          user_id,
          users!inner(first_name, last_name)
        `)
        .eq('event_id', event.id);

      if (error) throw error;

      const names = (data || []).map((reg: any) => 
        `${reg.users.first_name} ${reg.users.last_name}`
      );
      
      setRegistrations(names);
    } catch (err) {
      console.error('Error fetching registrations:', err);
    } finally {
      setLoadingRegistrations(false);
    }
  };

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
      setRegistrationCount(prev => Math.max(0, prev - 1));
      setRegistrations(prev => prev.filter((_, i) => i !== 0)); // Remove current user (simplified)
    } else {
      onRegister(event.id);
      setRegistrationCount(prev => prev + 1);
    }
  };

  const handleViewRegistrations = (e: any) => {
    e.stopPropagation();
    fetchRegistrations();
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
          <View style={[
            styles.typeTag, 
            { 
              backgroundColor: getPointTypeColors(event.point_type).backgroundColor,
              borderColor: getPointTypeColors(event.point_type).borderColor
            }
          ]}>
            <Text style={[
              styles.typeTagText, 
              { color: getPointTypeColors(event.point_type).textColor }
            ]}>
              {formatPointTypeText(event.point_type)}
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

          {/* View Registrations Button */}
          {registrationCount > 0 && (
            <TouchableOpacity
              style={styles.viewRegistrationsButton}
              onPress={handleViewRegistrations}
            >
              <Text style={styles.viewRegistrationsText}>
                👥 {registrationCount} {registrationCount === 1 ? 'person' : 'people'} registered
              </Text>
            </TouchableOpacity>
          )}

          {/* Registrations List */}
          {showRegistrations && (
            <View style={styles.registrationsList}>
              {loadingRegistrations ? (
                <ActivityIndicator size="small" color="#330066" />
              ) : registrations.length > 0 ? (
                <>
                  <Text style={styles.registrationsTitle}>Registered Members:</Text>
                  {registrations.map((name, index) => (
                    <Text key={index} style={styles.registrationName}>
                      • {name}
                    </Text>
                  ))}
                </>
              ) : (
                <Text style={styles.noRegistrationsText}>No registrations yet</Text>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 4,
    shadowColor: '#330066',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#330066',
  },
  pastEventCard: {
    opacity: 0.7,
    backgroundColor: '#faf8fc',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#330066',
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '800',
    color: '#330066',
    lineHeight: 28,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: '#330066',
    letterSpacing: 0.5,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#330066',
    marginBottom: 6,
    lineHeight: 24,
  },
  eventTime: {
    fontSize: 14,
    color: '#6b5b7a',
    fontWeight: '600',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#9980b3',
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
    backgroundColor: '#fff8e6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F7B910',
  },
  registeredTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#330066',
    letterSpacing: 0.5,
  },
  hostText: {
    fontSize: 14,
    color: '#6b5b7a',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  cardActions: {
    marginTop: 4,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#330066',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButton: {
    backgroundColor: '#330066',
    borderWidth: 2,
    borderColor: '#F7B910',
  },
  unregisterButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  registerButtonText: {
    color: '#fff',
  },
  unregisterButtonText: {
    color: '#ef4444',
  },
  viewRegistrationsButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff8e6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F7B910',
    alignItems: 'center',
  },
  viewRegistrationsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#330066',
  },
  registrationsList: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#faf8fc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8d0e0',
  },
  registrationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#330066',
    marginBottom: 8,
  },
  registrationName: {
    fontSize: 13,
    color: '#6b5b7a',
    marginBottom: 4,
    fontWeight: '500',
  },
  noRegistrationsText: {
    fontSize: 13,
    color: '#9980b3',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
