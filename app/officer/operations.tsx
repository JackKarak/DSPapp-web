/**
 * VP Operations - Operations Management Screen
 * 
 * Exclusive screen for VP Operations to:
 * 1. Manage dynamic point categories (add, edit, delete)
 * 2. Adjust point thresholds for all categories
 * 3. Manage officer positions and assignments
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from 'expo-router';

interface PointCategory {
  id: string;
  name: string;
  display_name: string;
  threshold: number;
  color: string;
  icon: string;
  sort_order: number;
  is_active?: boolean;
}

interface Member {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  officer_position: string | null;
}

const OFFICER_POSITIONS = [
  'president',
  'vp_operations',
  'vp_scholarship',
  'vp_finance',
  'vp_recruitment',
  'vp_member_development',
  'historian',
  'secretary',
  'sergeant_at_arms',
] as const;

const EMOJI_OPTIONS = ['⭐', '🤝', '💼', '🤲', '📚', '💪', '💰', '🌈', '🎯', '🏆', '📊', '🎓', '🌟', '💡', '🔥'];
const COLOR_OPTIONS = ['#8B4513', '#1E90FF', '#32CD32', '#FFD700', '#FF69B4', '#9370DB', '#20B2AA', '#FF6347', '#4B0082', '#00CED1'];

export default function OperationsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Point categories state
  const [categories, setCategories] = useState<PointCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<PointCategory | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    display_name: '',
    threshold: 0,
    color: '#330066',
    icon: '⭐',
  });
  
  // Members and officers state
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string>('');

  // Check VP Operations access
  const checkAccess = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Not authenticated');
      return false;
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('role, officer_position')
      .eq('user_id', user.id)
      .single();

    if (error || userData?.role !== 'officer' || userData?.officer_position !== 'vp_operations') {
      Alert.alert('Access Denied', 'This screen is only accessible to VP Operations');
      return false;
    }

    return true;
  }, []);

  // Fetch point categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('point_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      Alert.alert('Error', 'Failed to load point categories');
    }
  }, []);

  // Fetch all members
  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, email, role, officer_position')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      Alert.alert('Error', 'Failed to load members');
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    const hasAccess = await checkAccess();
    if (!hasAccess) return;

    await Promise.all([fetchCategories(), fetchMembers()]);
    setLoading(false);
  }, [checkAccess, fetchCategories, fetchMembers]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Category management functions
  const openAddCategoryModal = () => {
    setCategoryForm({
      name: '',
      display_name: '',
      threshold: 0,
      color: COLOR_OPTIONS[0],
      icon: EMOJI_OPTIONS[0],
    });
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (category: PointCategory) => {
    setCategoryForm({
      name: category.name,
      display_name: category.display_name,
      threshold: category.threshold,
      color: category.color,
      icon: category.icon,
    });
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const saveCategory = useCallback(async () => {
    if (!categoryForm.display_name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase.rpc('update_point_category', {
          p_id: editingCategory.id,
          p_display_name: categoryForm.display_name,
          p_threshold: categoryForm.threshold,
          p_color: categoryForm.color,
          p_icon: categoryForm.icon,
        });

        if (error) throw error;
        Alert.alert('Success', 'Category updated successfully');
      } else {
        // Add new category
        const categoryName = categoryForm.display_name.toLowerCase().replace(/\s+/g, '_');
        const { error } = await supabase.rpc('add_point_category', {
          p_name: categoryName,
          p_display_name: categoryForm.display_name,
          p_threshold: categoryForm.threshold,
          p_color: categoryForm.color,
          p_icon: categoryForm.icon,
        });

        if (error) throw error;
        Alert.alert('Success', 'Category added successfully');
      }

      closeCategoryModal();
      fetchCategories();
    } catch (err: any) {
      console.error('Error saving category:', err);
      Alert.alert('Error', err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }, [categoryForm, editingCategory, fetchCategories]);

  const deleteCategory = useCallback(async (category: PointCategory) => {
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
  }, [fetchCategories]);

  const updateCategoryThreshold = useCallback(async (category: PointCategory, newThreshold: number) => {
    try {
      const { error } = await supabase.rpc('update_point_category', {
        p_id: category.id,
        p_display_name: category.display_name,
        p_threshold: newThreshold,
        p_color: category.color,
        p_icon: category.icon,
      });

      if (error) throw error;
      
      // Update local state
      setCategories(prev => prev.map(cat => 
        cat.id === category.id ? { ...cat, threshold: newThreshold } : cat
      ));
    } catch (err: any) {
      console.error('Error updating threshold:', err);
      Alert.alert('Error', 'Failed to update threshold');
    }
  }, []);

  // Update member officer position
  const updateMemberPosition = useCallback(async (member: Member, position: string | null) => {
    try {
      // Determine new role
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
        {/* Point Categories Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={24} color="#330066" />
            <Text style={styles.sectionTitle}>Point Categories</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Manage point categories and their thresholds. Changes apply to all members, event forms, and analytics.
          </Text>

          {categories.map((category) => (
            <View key={category.id} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <View style={styles.categoryDetails}>
                  <Text style={styles.categoryName}>{category.display_name}</Text>
                  <View style={[styles.colorIndicator, { backgroundColor: category.color }]} />
                </View>
              </View>
              
              <View style={styles.categoryActions}>
                <TextInput
                  style={styles.thresholdInput}
                  value={category.threshold.toString()}
                  onChangeText={(text) => {
                    const newValue = parseFloat(text) || 0;
                    setCategories(prev => prev.map(cat => 
                      cat.id === category.id ? { ...cat, threshold: newValue } : cat
                    ));
                  }}
                  onBlur={() => updateCategoryThreshold(category, category.threshold)}
                  keyboardType="numeric"
                  placeholder="0"
                />
                <Text style={styles.pointsLabel}>pts</Text>
                
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => openEditCategoryModal(category)}
                >
                  <Ionicons name="create-outline" size={20} color="#64748b" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => deleteCategory(category)}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddCategoryModal}
          >
            <Ionicons name="add-circle" size={24} color="#330066" />
            <Text style={styles.addButtonText}>Add New Category</Text>
          </TouchableOpacity>
        </View>

      {/* Officer Management Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={24} color="#330066" />
          <Text style={styles.sectionTitle}>Officer Positions</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Assign or remove officer positions. Tap a member to change their position.
        </Text>

        {/* Current Officers */}
        <View style={styles.officersContainer}>
          <Text style={styles.subsectionTitle}>Current Officers</Text>
          {members.filter(m => m.role === 'officer' && m.officer_position).map(officer => (
            <TouchableOpacity
              key={officer.user_id}
              style={styles.memberCard}
              onPress={() => {
                setSelectedMember(officer);
                setSelectedPosition(officer.officer_position || '');
              }}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>
                  {officer.first_name?.[0]}{officer.last_name?.[0]}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {officer.first_name} {officer.last_name}
                </Text>
                <Text style={styles.memberPosition}>
                  {officer.officer_position?.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
              <Ionicons name="create-outline" size={20} color="#64748b" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Available Members */}
        <View style={styles.officersContainer}>
          <Text style={styles.subsectionTitle}>Available Members (Brothers)</Text>
          {members.filter(m => m.role !== 'pledge' && (m.role !== 'officer' || !m.officer_position)).slice(0, 10).map(member => (
            <TouchableOpacity
              key={member.user_id}
              style={styles.memberCard}
              onPress={() => {
                setSelectedMember(member);
                setSelectedPosition('');
              }}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.first_name} {member.last_name}
                </Text>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </View>
              <Ionicons name="add-circle-outline" size={20} color="#330066" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Position Selector */}
        {selectedMember && (
          <View style={styles.positionSelector}>
            <Text style={styles.positionSelectorTitle}>
              Select position for {selectedMember.first_name} {selectedMember.last_name}
            </Text>
            
            <View style={styles.positionsGrid}>
              <TouchableOpacity
                style={[styles.positionButton, selectedPosition === '' && styles.positionButtonActive]}
                onPress={() => setSelectedPosition('')}
              >
                <Text style={[styles.positionButtonText, selectedPosition === '' && styles.positionButtonTextActive]}>
                  None (Brother)
                </Text>
              </TouchableOpacity>
              
              {OFFICER_POSITIONS.map(position => (
                <TouchableOpacity
                  key={position}
                  style={[styles.positionButton, selectedPosition === position && styles.positionButtonActive]}
                  onPress={() => setSelectedPosition(position)}
                >
                  <Text style={[styles.positionButtonText, selectedPosition === position && styles.positionButtonTextActive]}>
                    {position.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedMember(null);
                  setSelectedPosition('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => updateMemberPosition(selectedMember, selectedPosition || null)}
              >
                <Text style={styles.saveButtonText}>Update Position</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>

      {/* Category Add/Edit Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeCategoryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </Text>
              <TouchableOpacity onPress={closeCategoryModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={categoryForm.display_name}
                  onChangeText={(text) => setCategoryForm({ ...categoryForm, display_name: text })}
                  placeholder="e.g., Professional Development"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Required Points</Text>
                <TextInput
                  style={styles.formInput}
                  value={categoryForm.threshold.toString()}
                  onChangeText={(text) => setCategoryForm({ ...categoryForm, threshold: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Icon</Text>
                <View style={styles.emojiGrid}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiOption,
                        categoryForm.icon === emoji && styles.emojiOptionActive,
                      ]}
                      onPress={() => setCategoryForm({ ...categoryForm, icon: emoji })}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Color</Text>
                <View style={styles.colorGrid}>
                  {COLOR_OPTIONS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        categoryForm.color === color && styles.colorOptionActive,
                      ]}
                      onPress={() => setCategoryForm({ ...categoryForm, color })}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeCategoryModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={saveCategory}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingCategory ? 'Update' : 'Add'} Category
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thresholdLabel: {
    flex: 1,
  },
  thresholdName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  thresholdInput: {
    width: 70,
    height: 36,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#64748b',
    width: 28,
  },
  iconButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#330066',
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330066',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#330066',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  officersContainer: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#330066',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  memberPosition: {
    fontSize: 13,
    color: '#330066',
    fontWeight: '500',
    marginTop: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  positionSelector: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  positionSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  positionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  positionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  positionButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  positionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  positionButtonTextActive: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiOptionActive: {
    borderColor: '#330066',
    backgroundColor: '#ede9fe',
  },
  emojiText: {
    fontSize: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: '#1e293b',
  },
});
