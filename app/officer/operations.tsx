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
import { CategoryManagementSection } from '../../components/OperationsComponents/CategoryManagementSection';
import { CategoryFormModal } from '../../components/OperationsComponents/CategoryFormModal';
import { Member, PointCategory } from '../../types/operations';

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

  // Category management state
  const [categories, setCategories] = useState<PointCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PointCategory | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);

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
        .in('role', ['brother', 'officer', 'president'])
        .order('last_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      Alert.alert('Error', 'Failed to load members');
    }
  }, []);

  // Fetch point categories
  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const { data, error } = await supabase
        .from('point_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    const hasAccess = await checkAccess();
    if (!hasAccess) {
      setLoading(false);
      return;
    }

    await Promise.all([
      fetchMembers(),
      fetchCategories()
    ]);
    setLoading(false);
  }, [checkAccess, fetchMembers, fetchCategories]);

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

  // Category management handlers
  const handleAddCategory = () => {
    setSelectedCategory(null);
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category: PointCategory) => {
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = (category: PointCategory) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.display_name}"? This will hide it from all screens but preserve historical data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_point_category', {
                p_id: category.id,
              });

              if (error) throw error;

              Alert.alert('Success', 'Category deleted successfully');
              fetchCategories();
            } catch (err: any) {
              console.error('Error deleting category:', err);
              Alert.alert('Error', err.message || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const handleSaveCategory = async (data: any) => {
    try {
      setCategorySaving(true);

      if (selectedCategory) {
        // Update existing category
        const { error } = await supabase.rpc('update_point_category', {
          p_id: selectedCategory.id,
          p_display_name: data.display_name,
          p_threshold: data.threshold,
          p_color: data.color,
          p_icon: data.icon,
        });

        if (error) throw error;
        Alert.alert('Success', 'Category updated successfully');
      } else {
        // Add new category
        const { error } = await supabase.rpc('add_point_category', {
          p_name: data.name,
          p_display_name: data.display_name,
          p_threshold: data.threshold,
          p_color: data.color,
          p_icon: data.icon,
        });

        if (error) throw error;
        Alert.alert('Success', 'Category added successfully');
      }

      fetchCategories();
      setShowCategoryModal(false);
      setSelectedCategory(null);
    } catch (err: any) {
      console.error('Error saving category:', err);
      Alert.alert('Error', err.message || 'Failed to save category');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setSelectedCategory(null);
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
        <CategoryManagementSection
          categories={categories}
          loading={categoriesLoading}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />

        <OfficerManagementSection
          members={members}
          brotherSearch={brotherSearch}
          onBrotherSearchChange={setBrotherSearch}
          onSelectOfficer={handleSelectOfficer}
          onSelectBrother={handleSelectBrother}
          onClearAll={() => setShowClearConfirm(true)}
        />
      </ScrollView>

      <CategoryFormModal
        visible={showCategoryModal}
        category={selectedCategory}
        saving={categorySaving}
        onClose={handleCloseCategoryModal}
        onSave={handleSaveCategory}
      />

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
