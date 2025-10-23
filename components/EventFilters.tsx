/**
 * EventFilters Component - Enhanced UI
 * 
 * Provides modern, polished filtering UI for events:
 * - Type filter (Service, Social, DEI, Professional, H&W)
 * - Registration status filter (All, Registerable, Non-Registerable)
 * - Time filter (All, Upcoming, Past)
 * 
 * Features:
 * - Visual icons for each filter category
 * - Color-coded active states
 * - Improved spacing and shadows
 * - Better mobile responsiveness
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { DropdownSelect } from './DropdownSelect';

export interface FilterOption {
  label: string;
  value: string;
}

interface EventFiltersProps {
  selectedType: string;
  filterRegisterable: string;
  filterPastEvents: string;
  typeOptions: FilterOption[];
  userRole: string;
  onTypeChange: (value: string) => void;
  onRegisterableChange: (value: string) => void;
  onPastEventsChange: (value: string) => void;
}

export const EventFilters: React.FC<EventFiltersProps> = ({
  selectedType,
  filterRegisterable,
  filterPastEvents,
  typeOptions,
  userRole,
  onTypeChange,
  onRegisterableChange,
  onPastEventsChange,
}) => {
  // Registration options
  const registerableOptions: FilterOption[] = [
    { label: 'All Events', value: 'All' },
    { label: 'Registerable Only', value: 'Registerable' },
    { label: 'Non-Registerable Only', value: 'Non-Registerable' }
  ];

  // Status options (conditional based on role)
  const statusOptions: FilterOption[] = userRole === 'pledge' ? [
    { label: 'Upcoming', value: 'Upcoming' }
  ] : [
    { label: 'All Events', value: 'All' },
    { label: 'Upcoming Only', value: 'Upcoming' },
    { label: 'Past Only', value: 'Past' }
  ];

  // Check if any filters are active
  const hasActiveFilters = selectedType !== 'All' || 
                          filterRegisterable !== 'All' || 
                          filterPastEvents !== 'All';

  return (
    <View style={styles.filterContainer}>
      <View style={styles.filterHeader}>
        <Text style={styles.filterBarTitle}>Filter Events</Text>
        {hasActiveFilters && (
          <View style={styles.activeIndicator}>
            <View style={styles.activeDot} />
            <Text style={styles.activeIndicatorText}>Filtered</Text>
          </View>
        )}
      </View>

      <View style={styles.filterGrid}>
        <View style={styles.filterItem}>
          <DropdownSelect
            label="Event Type"
            value={selectedType}
            options={typeOptions}
            onValueChange={onTypeChange}
          />
        </View>

        <View style={styles.filterItem}>
          <DropdownSelect
            label="Registration Status"
            value={filterRegisterable}
            options={registerableOptions}
            onValueChange={onRegisterableChange}
          />
        </View>

        <View style={styles.filterItem}>
          <DropdownSelect
            label="Event Timeline"
            value={filterPastEvents}
            options={statusOptions}
            onValueChange={onPastEventsChange}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterBarTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginRight: 6,
  },
  activeIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    letterSpacing: 0.3,
  },
  filterGrid: {
    gap: 14,
  },
  filterItem: {
    width: '100%',
  },
});
