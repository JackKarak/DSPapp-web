/**
 * MemberPointsModal Component
 * 
 * Shows detailed points breakdown by category for a single member
 * Displays: Brotherhood, Scholarship, Professionalism, Service, DEI, Fundraising, Health & Wellness
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Member } from '../../types/analytics';

interface MemberPointsModalProps {
  visible: boolean;
  member: Member | null;
  pointsByCategory: Record<string, number> | null;
  loading: boolean;
  onClose: () => void;
}

interface CategoryCardProps {
  category: string;
  points: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, points, icon, color }) => (
  <View style={styles.categoryCard}>
    <View style={[styles.categoryIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={24} color="#ffffff" />
    </View>
    <View style={styles.categoryInfo}>
      <Text style={styles.categoryName}>{category}</Text>
      <Text style={styles.categoryPoints}>{points.toFixed(1)} points</Text>
    </View>
  </View>
);

export const MemberPointsModal: React.FC<MemberPointsModalProps> = ({
  visible,
  member,
  pointsByCategory,
  loading,
  onClose,
}) => {
  if (!member) return null;

  const totalPoints = pointsByCategory 
    ? Object.values(pointsByCategory).reduce((sum, val) => sum + val, 0) 
    : 0;

  const categories = [
    { key: 'Brotherhood', icon: 'people' as const, color: '#330066' },
    { key: 'Scholarship', icon: 'school' as const, color: '#8E44AD' },
    { key: 'Professionalism', icon: 'briefcase' as const, color: '#4A90E2' },
    { key: 'Service', icon: 'hand-left' as const, color: '#50C878' },
    { key: 'DEI', icon: 'ribbon' as const, color: '#E91E63' },
    { key: 'Fundraising', icon: 'cash' as const, color: '#FF9800' },
    { key: 'H&W', icon: 'fitness' as const, color: '#E67E22' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </Text>
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {member.first_name} {member.last_name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {member.role === 'pledge' ? 'Pledge' : 'Brother'}
                  {member.pledge_class && ` • ${member.pledge_class}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#330066" />
                <Text style={styles.loadingText}>Loading points...</Text>
              </View>
            ) : (
              <>
                {/* Total Points Summary */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryIconContainer}>
                    <Ionicons name="trophy" size={32} color="#FFD700" />
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryLabel}>Total Points</Text>
                    <Text style={styles.summaryValue}>{totalPoints.toFixed(1)}</Text>
                  </View>
                </View>

                {/* Category Breakdown */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📊 Points by Category</Text>
                  
                  {categories.map(({ key, icon, color }) => (
                    <CategoryCard
                      key={key}
                      category={key}
                      points={pointsByCategory?.[key] || 0}
                      icon={icon}
                      color={color}
                    />
                  ))}
                </View>

                {/* Additional Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>ℹ️ Information</Text>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                      Points are calculated based on event attendance and participation. 
                      Each event attendance earns the event's point value.
                    </Text>
                  </View>
                </View>
              </>
            )}
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#330066',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  summaryIconContainer: {
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#78350f',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#78350f',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  categoryPoints: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
});
