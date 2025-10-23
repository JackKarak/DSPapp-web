/**
 * UserHeader Component
 * 
 * Displays user's name with ranking tags at the top of account screen
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserProfile, Analytics } from '../../types/hooks';
import { Colors } from '../../constants/colors';

interface UserHeaderProps {
  profile: UserProfile | null;
  analytics: Analytics | null;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ profile, analytics }) => {
  if (!profile) return null;

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User';

  return (
    <View style={styles.container}>
      <Text style={styles.nameText}>{fullName}</Text>
      
      <View style={styles.tagsContainer}>
        {/* Pledge Class Ranking */}
        {analytics && analytics.rankInPledgeClass > 0 && analytics.totalInPledgeClass > 0 && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              #{analytics.rankInPledgeClass} in Pledge Class ({analytics.totalInPledgeClass} total)
            </Text>
          </View>
        )}

        {/* House Membership */}
        {profile.house_membership && (
          <View style={[styles.tag, styles.houseMembershipTag]}>
            <Text style={styles.tagText}>
              {profile.house_membership}
            </Text>
          </View>
        )}

        {/* Fraternity Ranking */}
        {analytics && analytics.rankInFraternity > 0 && analytics.totalInFraternity > 0 && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              #{analytics.rankInFraternity} in Fraternity ({analytics.totalInFraternity} total)
            </Text>
          </View>
        )}

        {/* Pledge Class */}
        {profile.pledge_class && (
          <View style={[styles.tag, styles.pledgeClassTag]}>
            <Text style={styles.tagText}>
              {profile.pledge_class}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  houseMembershipTag: {
    backgroundColor: Colors.secondary,
  },
  pledgeClassTag: {
    backgroundColor: '#6366f1',
  },
  tagText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});
