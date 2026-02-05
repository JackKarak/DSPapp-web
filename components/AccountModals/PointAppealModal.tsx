/**
 * PointAppealModal Component
 * 
 * Modal for submitting point appeals with a reason
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
  Alert,
} from 'react-native';

interface Event {
  id: string;
  title: string;
  date: string;
  host_name: string;
  point_value?: number;
}

interface PointAppealModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
  onSubmit: () => void;
  appealReason: string;
  appealPictureUrl: string;
  onUpdateReason: (reason: string) => void;
  onUpdatePictureUrl: (url: string) => void;
  submitting: boolean;
}

export const PointAppealModal: React.FC<PointAppealModalProps> = ({
  visible,
  event,
  onClose,
  onSubmit,
  appealReason,
  appealPictureUrl,
  onUpdateReason,
  onUpdatePictureUrl,
  submitting,
}) => {
  if (!event) return null;

  const handleSubmit = () => {
    // Validate inputs
    if (!appealReason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for your appeal.');
      return;
    }

    onSubmit();
  };

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
            <Text style={styles.modalTitle}>Point Appeal</Text>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDetails}>
              {event.date} • {event.host_name}
            </Text>
            {event.point_value !== undefined && event.point_value !== null && (
              <Text style={styles.pointValue}>
                Worth: {event.point_value} point{event.point_value !== 1 ? 's' : ''}
              </Text>
            )}

            {/* Appeal Reason */}
            <Text style={styles.label}>Reason for Appeal *</Text>
            <Text style={styles.helperText}>
              Explain why you should receive points for this event
            </Text>
            <TextInput
              style={styles.textArea}
              value={appealReason}
              onChangeText={onUpdateReason}
              placeholder="I was there but forgot to check in..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Your appeal will be reviewed by an officer or admin.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Appeal</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    textAlign: 'center',
  },
  eventDetails: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  pointValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9333ea',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    minHeight: 100,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
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
  submitButton: {
    backgroundColor: '#9333ea',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
