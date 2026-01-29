import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OFFICER_POSITIONS } from '../../constants/operations';
import { Member } from '../../types/operations';

interface PositionSelectorModalProps {
  visible: boolean;
  selectedMember: Member | null;
  selectedPosition: string;
  onClose: () => void;
  onSelectPosition: (position: string) => void;
  onSave: () => void;
}

export function PositionSelectorModal({
  visible,
  selectedMember,
  selectedPosition,
  onClose,
  onSelectPosition,
  onSave,
}: PositionSelectorModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.positionModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Position</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {selectedMember && (
            <Text style={styles.modalSubtitle}>
              {selectedMember.first_name} {selectedMember.last_name}
            </Text>
          )}

          <ScrollView style={styles.positionsScrollView}>
            <TouchableOpacity
              style={[styles.positionOption, selectedPosition === '' && styles.positionOptionActive]}
              onPress={() => onSelectPosition('')}
            >
              <Text style={[styles.positionOptionText, selectedPosition === '' && styles.positionOptionTextActive]}>
                None (Brother)
              </Text>
              {selectedPosition === '' && <Ionicons name="checkmark" size={20} color="#330066" />}
            </TouchableOpacity>
            
            {OFFICER_POSITIONS.map(position => (
              <TouchableOpacity
                key={position}
                style={[styles.positionOption, selectedPosition === position && styles.positionOptionActive]}
                onPress={() => onSelectPosition(position)}
              >
                <Text style={[styles.positionOptionText, selectedPosition === position && styles.positionOptionTextActive]}>
                  {position.replace(/_/g, ' ').toUpperCase()}
                </Text>
                {selectedPosition === position && <Ionicons name="checkmark" size={20} color="#330066" />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={onSave}>
              <Text style={styles.modalSaveText}>Update</Text>
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
  positionModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 4,
  },
  positionsScrollView: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  positionOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  positionOptionActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#330066',
  },
  positionOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  positionOptionTextActive: {
    color: '#330066',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#330066',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
