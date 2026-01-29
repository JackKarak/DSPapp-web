/**
 * VP Operations - Operations Management Screen (Refactored)
 * 
 * Exclusive screen for VP Operations to:
 * 1. Manage dynamic point categories (add, edit, delete)
 * 2. Adjust point thresholds for all categories
 * 3. Manage officer positions and assignments
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { OfficerManagementSection } from '../../components/OperationsComponents/OfficerManagementSection';
import { PositionSelectorModal } from '../../components/OperationsComponents/PositionSelectorModal';
import { ClearPositionsModal } from '../../components/OperationsComponents/ClearPositionsModal';
import { Member } from '../../types/operations';

export default function OperationsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Officer management state
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [brotherSearch, setBrotherSearch] = useState('');

  // Check VP Operations access
  const checkAccess = useCallback(async () => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, officer_position')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Access check error:', error);
        Alert.alert('Error', `Failed to check access: ${error.message}`);
        return false;
      }

      if (userData?.role !== 'officer' || userData?.officer_position !== 'vp_operations') {
        Alert.alert(
          'Access Denied', 
          `This screen is only accessible to VP Operations.\nCurrent role: ${userData?.role}\nCurrent position: ${userData?.officer_position}`
        );
        return false;
      }
      return true;
    } catch (err) {
      console.error('Access check error:', err);
      return false;
    }
  }, []);

  // Fetch members for officer management
  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, email, role, officer_position')
        .in('role', ['brother', 'officer'])
        .order('last_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      Alert.alert('Error', 'Failed to load members');
    }
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    const hasAccess = await checkAccess();
    if (!hasAccess) {
      setLoading(false);
      return;
    }

    await fetchMembers();
    setLoading(false);
  }, [checkAccess, fetchMembers]);

  // Focus effect to reload data
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Update member officer position
  const updateMemberPosition = useCallback(async (member: Member, position: string | null) => {
    try {
      const newRole = position ? 'officer' : 'brother';
      
      const { error } = await supabase
        .from('users')
        .update({
          role: newRole,
          officer_position: position,
        })
        .eq('user_id', member.user_id);

      if (error) throw error;

      Alert.alert('Success', `Updated ${member.first_name} ${member.last_name}'s position`);
      fetchMembers();
      setSelectedMember(null);
      setSelectedPosition('');
    } catch (err: any) {
      console.error('Error updating position:', err);
      Alert.alert('Error', 'Failed to update officer position');
    }
  }, [fetchMembers]);

  // Clear all officer positions
  const clearAllOfficerPositions = useCallback(async () => {
    try {
      setSaving(true);
      
      const currentOfficers = members.filter(m => m.role === 'officer' && m.officer_position);
      
      if (currentOfficers.length === 0) {
        Alert.alert('Info', 'No officer positions to clear');
        setShowClearConfirm(false);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({
          role: 'brother',
          officer_position: null,
        })
        .not('officer_position', 'is', null);

      if (error) throw error;

      Alert.alert(
        'Success', 
        `Cleared ${currentOfficers.length} officer position${currentOfficers.length !== 1 ? 's' : ''}. Ready for new elections!`
      );
      fetchMembers();
      setShowClearConfirm(false);
    } catch (err: any) {
      console.error('Error clearing positions:', err);
      Alert.alert('Error', 'Failed to clear officer positions');
    } finally {
      setSaving(false);
    }
  }, [members, fetchMembers]);

  // Officer selection handlers
  const handleSelectOfficer = (officer: Member) => {
    setSelectedMember(officer);
    setSelectedPosition(officer.officer_position || '');
    setShowPositionModal(true);
  };

  const handleSelectBrother = (member: Member) => {
    setSelectedMember(member);
    setSelectedPosition('');
    setShowPositionModal(true);
  };

  const handleSavePosition = () => {
    if (selectedMember) {
      updateMemberPosition(selectedMember, selectedPosition || null);
      setShowPositionModal(false);
    }
  };

  const handleClosePositionModal = () => {
    setShowPositionModal(false);
    setSelectedMember(null);
    setSelectedPosition('');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#330066" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <OfficerManagementSection
          members={members}
          brotherSearch={brotherSearch}
          onBrotherSearchChange={setBrotherSearch}
          onSelectOfficer={handleSelectOfficer}
          onSelectBrother={handleSelectBrother}
          onClearAll={() => setShowClearConfirm(true)}
        />
      </ScrollView>

      <PositionSelectorModal
        visible={showPositionModal}
        selectedMember={selectedMember}
        selectedPosition={selectedPosition}
        onClose={handleClosePositionModal}
        onSelectPosition={setSelectedPosition}
        onSave={handleSavePosition}
      />

      <ClearPositionsModal
        visible={showClearConfirm}
        count={members.filter(m => m.role === 'officer' && m.officer_position).length}
        saving={saving}
        onConfirm={clearAllOfficerPositions}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
});
