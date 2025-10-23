/**
 * AccountDeletionModal Component
 * 
 * Modal for account deletion confirmation with typed confirmation
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface AccountDeletionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmationText: string;
  onUpdateConfirmationText: (text: string) => void;
  deleting: boolean;
}

export const AccountDeletionModal: React.FC<AccountDeletionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  confirmationText,
  onUpdateConfirmationText,
  deleting,
}) => {
  const isConfirmationValid = confirmationText.toLowerCase() === 'delete my account';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalTitle}>⚠️ Delete Account</Text>
            
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>This action is permanent!</Text>
              <Text style={styles.warningText}>
                Deleting your account will:
              </Text>
              <View style={styles.warningList}>
                <Text style={styles.warningItem}>• Delete all your personal data</Text>
                <Text style={styles.warningItem}>• Remove your event history</Text>
                <Text style={styles.warningItem}>• Cancel any pending appeals</Text>
                <Text style={styles.warningItem}>• Remove you from all organizations</Text>
              </View>
              <Text style={styles.warningFooter}>
                This process may take up to 30 days to complete.
              </Text>
            </View>

            <View style={styles.recoveryBox}>
              <Text style={styles.recoveryIcon}>💡</Text>
              <Text style={styles.recoveryText}>
                You can contact support within 7 days to potentially recover your account.
              </Text>
            </View>

            <Text style={styles.label}>
              Type "DELETE MY ACCOUNT" to confirm
            </Text>
            <TextInput
              style={[
                styles.input,
                isConfirmationValid && confirmationText.length > 0 && styles.inputValid,
              ]}
              value={confirmationText}
              onChangeText={onUpdateConfirmationText}
              placeholder="DELETE MY ACCOUNT"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.deleteButton,
                  !isConfirmationValid && styles.deleteButtonDisabled,
                ]}
                onPress={onConfirm}
                disabled={!isConfirmationValid || deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Forever</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 20,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#7f1d1d',
    marginBottom: 8,
  },
  warningList: {
    marginBottom: 8,
  },
  warningItem: {
    fontSize: 13,
    color: '#7f1d1d',
    marginBottom: 4,
    lineHeight: 20,
  },
  warningFooter: {
    fontSize: 12,
    color: '#991b1b',
    fontStyle: 'italic',
    marginTop: 4,
  },
  recoveryBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  recoveryIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  recoveryText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 20,
    fontWeight: '600',
  },
  inputValid: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  deleteButtonDisabled: {
    backgroundColor: '#fca5a5',
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
