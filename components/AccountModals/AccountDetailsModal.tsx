/**
 * AccountDetailsModal Component
 * 
 * Modal for displaying achievement details and other account information
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ACHIEVEMENTS, TIER_CONFIG } from '../../constants/accountConstants';

interface AccountDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  userAchievements: string[];
}

export const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
  visible,
  onClose,
  userAchievements,
}) => {
  const achievementEntries = Object.entries(ACHIEVEMENTS);
  
  // Sort achievements by tier order (Rose Gold > Gold > Silver > Bronze)
  const sortedAchievements = achievementEntries.sort(([, a], [, b]) => {
    const tierA = TIER_CONFIG[a.tier as keyof typeof TIER_CONFIG]?.order || 0;
    const tierB = TIER_CONFIG[b.tier as keyof typeof TIER_CONFIG]?.order || 0;
    return tierB - tierA;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏆 All Achievements</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.subtitle}>
              {userAchievements.length} of {achievementEntries.length} unlocked
            </Text>

            {sortedAchievements.map(([key, achievement]) => {
              const isEarned = userAchievements.includes(key);
              const tierConfig = TIER_CONFIG[achievement.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze;

              return (
                <View
                  key={key}
                  style={[
                    styles.achievementCard,
                    isEarned && { borderColor: tierConfig.color },
                  ]}
                >
                  <View style={styles.achievementHeader}>
                    <View style={styles.achievementIcon}>
                      <Text style={styles.iconText}>
                        {isEarned ? (achievement.icon || '🏆') : '🔒'}
                      </Text>
                    </View>
                    <View style={styles.achievementInfo}>
                      <Text
                        style={[
                          styles.achievementTitle,
                          isEarned && { color: tierConfig.color },
                        ]}
                      >
                        {achievement.title}
                      </Text>
                      <View
                        style={[
                          styles.tierBadge,
                          { backgroundColor: isEarned ? tierConfig.color : '#94a3b8' },
                        ]}
                      >
                        <Text style={styles.tierText}>
                          {tierConfig.name.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {isEarned && (
                      <Text style={styles.earnedCheck}>✅</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.achievementDescription,
                      !isEarned && styles.achievementLocked,
                    ]}
                  >
                    {achievement.description}
                  </Text>
                </View>
              );
            })}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Keep attending events to unlock more achievements!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  achievementCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconText: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  earnedCheck: {
    fontSize: 24,
    marginLeft: 8,
  },
  achievementDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  achievementLocked: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
});
