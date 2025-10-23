/**
 * ProfileDisplay Component
 * 
 * Displays user profile information in read-only mode
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserProfile } from '../../types/hooks';
import { formatLabel } from '../../constants/accountConstants';

interface ProfileDisplayProps {
  profile: UserProfile;
}

export const ProfileDisplay: React.FC<ProfileDisplayProps> = ({ profile }) => {
  const formatValue = (value: string | null): string => {
    if (!value) return 'Not specified';
    if (value.includes('_')) return formatLabel(value);
    return value;
  };

  return (
    <View style={styles.container}>
      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>
            {profile.first_name} {profile.last_name}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{profile.phone_number || 'Not specified'}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile.email || 'Not specified'}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>UID</Text>
          <Text style={styles.value}>{profile.uid || 'Not specified'}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Pronouns</Text>
          <Text style={styles.value}>{formatValue(profile.pronouns)}</Text>
        </View>
      </View>

      {/* Academic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Academic Information</Text>
        
        <View style={styles.field}>
          <Text style={styles.label}>Majors</Text>
          <Text style={styles.value}>{profile.majors || 'Not specified'}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Minors</Text>
          <Text style={styles.value}>{profile.minors || 'Not specified'}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Expected Graduation</Text>
          <Text style={styles.value}>{profile.expected_graduation || 'Not specified'}</Text>
        </View>
      </View>

      {/* Fraternity Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fraternity Information</Text>
        
        <View style={styles.field}>
          <Text style={styles.label}>House Membership</Text>
          <Text style={styles.value}>{profile.house_membership || 'Not specified'}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Pledge Class</Text>
          <Text style={styles.value}>{profile.pledge_class || 'Not specified'}</Text>
        </View>
      </View>

      {/* Personal Details (Optional) */}
      {(profile.gender || profile.sexual_orientation || profile.race || profile.living_type) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          
          {profile.gender && (
            <View style={styles.field}>
              <Text style={styles.label}>Gender</Text>
              <Text style={styles.value}>{formatValue(profile.gender)}</Text>
            </View>
          )}

          {profile.sexual_orientation && (
            <View style={styles.field}>
              <Text style={styles.label}>Sexual Orientation</Text>
              <Text style={styles.value}>{formatValue(profile.sexual_orientation)}</Text>
            </View>
          )}

          {profile.race && (
            <View style={styles.field}>
              <Text style={styles.label}>Race/Ethnicity</Text>
              <Text style={styles.value}>{formatValue(profile.race)}</Text>
            </View>
          )}

          {profile.living_type && (
            <View style={styles.field}>
              <Text style={styles.label}>Living Type</Text>
              <Text style={styles.value}>{formatValue(profile.living_type)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    color: '#1a1a1a',
  },
});
