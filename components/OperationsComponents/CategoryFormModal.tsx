/**
 * Category Form Modal
 * Modal for adding or editing point categories
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PointCategory } from '../../types/operations';

interface CategoryFormModalProps {
  visible: boolean;
  category: PointCategory | null; // null for new category
  saving: boolean;
  onClose: () => void;
  onSave: (data: { display_name: string; threshold: number; icon: string; color: string; name?: string }) => void;
}

const EMOJI_OPTIONS = ['🤝', '💼', '🤲', '🎉', '🏋️', '🎨', '📚', '🌟', '🎯', '💡', '🚀', '🔥', '⭐', '💪', '🎓'];
const COLOR_OPTIONS = ['#8B4513', '#1E90FF', '#32CD32', '#FFD700', '#FF4500', '#9370DB', '#FF69B4', '#00CED1', '#FF6347', '#4169E1'];

export function CategoryFormModal({
  visible,
  category,
  saving,
  onClose,
  onSave,
}: CategoryFormModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [threshold, setThreshold] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('⭐');
  const [selectedColor, setSelectedColor] = useState('#330066');

  const isEditing = category !== null;

  useEffect(() => {
    if (category) {
      setDisplayName(category.display_name);
      setThreshold(category.threshold.toString());
      setSelectedIcon(category.icon);
      setSelectedColor(category.color);
    } else {
      setDisplayName('');
      setThreshold('');
      setSelectedIcon('⭐');
      setSelectedColor('#330066');
    }
  }, [category]);

  const handleSave = () => {
    const thresholdNum = parseFloat(threshold);
    if (!displayName.trim()) {
      alert('Please enter a category name');
      return;
    }
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      alert('Please enter a valid threshold');
      return;
    }

    const data: any = {
      display_name: displayName.trim(),
      threshold: thresholdNum,
      icon: selectedIcon,
      color: selectedColor,
    };

    // Only include name for new categories
    if (!isEditing) {
      data.name = displayName.toLowerCase().replace(/\s+/g, '_');
    }

    onSave(data);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Category' : 'Add Category'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            {/* Display Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Category Name *</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g., Professional Development"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Threshold */}
            <View style={styles.field}>
              <Text style={styles.label}>Point Threshold *</Text>
              <TextInput
                style={styles.input}
                value={threshold}
                onChangeText={setThreshold}
                placeholder="e.g., 5.0"
                keyboardType="decimal-pad"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Icon Picker */}
            <View style={styles.field}>
              <Text style={styles.label}>Icon</Text>
              <View style={styles.emojiGrid}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiOption,
                      selectedIcon === emoji && styles.emojiSelected,
                    ]}
                    onPress={() => setSelectedIcon(emoji)}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color Picker */}
            <View style={styles.field}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview:</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewIcon}>{selectedIcon}</Text>
                <Text style={styles.previewName}>{displayName || 'Category Name'}</Text>
                <Text style={styles.previewThreshold}>{threshold || '0'} points</Text>
                <View style={[styles.previewBar, { backgroundColor: selectedColor }]} />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditing ? 'Save Changes' : 'Add Category'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
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
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
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
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiSelected: {
    borderColor: '#330066',
    backgroundColor: '#f1f5f9',
  },
  emoji: {
    fontSize: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#1e293b',
  },
  preview: {
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  previewIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  previewThreshold: {
    fontSize: 14,
    color: '#64748b',
  },
  previewBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#330066',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
