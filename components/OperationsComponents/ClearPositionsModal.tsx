import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ClearPositionsModalProps {
  visible: boolean;
  count: number;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearPositionsModal({
  visible,
  count,
  saving,
  onConfirm,
  onCancel,
}: ClearPositionsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModal}>
          <Ionicons name="warning" size={48} color="#dc2626" />
          <Text style={styles.confirmTitle}>Clear All Officer Positions?</Text>
          <Text style={styles.confirmMessage}>
            This will remove ALL officer positions and convert everyone back to brothers.
            Use this after elections to prepare for assigning new officers.
          </Text>
          <Text style={styles.confirmCount}>
            {count} position{count !== 1 ? 's' : ''} will be cleared
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={onCancel}
              disabled={saving}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmDeleteButton}
              onPress={onConfirm}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmDeleteText}>Clear All</Text>
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
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  confirmCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
