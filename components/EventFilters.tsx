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
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#330066',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#330066',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#F7B910',
  },
  filterBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#330066',
    letterSpacing: -0.1,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F7B910',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F7B910',
    marginRight: 3,
  },
  activeIndicatorText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#330066',
    letterSpacing: 0.2,
  },
  filterGrid: {
    gap: 6,
  },
  filterItem: {
    width: '100%',
  },
});
