/**
 * EventFeedbackModal Component
 * 
 * Modal for submitting event feedback with ratings and boolean questions
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

interface Event {
  id: string;
  title: string;
  date: string;
  host_name: string;
}

interface EventFeedbackModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
  onSubmit: () => void;
  feedbackData: {
    rating: number;
    would_attend_again: boolean | null;
    well_organized: boolean | null;
    comments: string;
  };
  onUpdateFeedback: <K extends keyof EventFeedbackModalProps['feedbackData']>(
    field: K,
    value: EventFeedbackModalProps['feedbackData'][K]
  ) => void;
  submitting: boolean;
}

export const EventFeedbackModal: React.FC<EventFeedbackModalProps> = ({
  visible,
  event,
  onClose,
  onSubmit,
  feedbackData,
  onUpdateFeedback,
  submitting,
}) => {
  if (!event) return null;

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
            <Text style={styles.modalTitle}>Event Feedback</Text>
            <Text style={styles.eventTitle}>{event.title}</Text>

            {/* Rating */}
            <Text style={styles.label}>Rating *</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => onUpdateFeedback('rating', star)}
                  style={styles.starButton}
                >
                  <Text style={styles.star}>
                    {star <= feedbackData.rating ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Would Attend Again */}
            <Text style={styles.label}>Would you attend again? *</Text>
            <View style={styles.booleanContainer}>
              <TouchableOpacity
                style={[
                  styles.booleanButton,
                  feedbackData.would_attend_again === true && styles.booleanButtonSelected,
                ]}
                onPress={() => onUpdateFeedback('would_attend_again', true)}
              >
                <Text
                  style={[
                    styles.booleanButtonText,
                    feedbackData.would_attend_again === true && styles.booleanButtonTextSelected,
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.booleanButton,
                  feedbackData.would_attend_again === false && styles.booleanButtonSelected,
                ]}
                onPress={() => onUpdateFeedback('would_attend_again', false)}
              >
                <Text
                  style={[
                    styles.booleanButtonText,
                    feedbackData.would_attend_again === false && styles.booleanButtonTextSelected,
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
            </View>

            {/* Well Organized */}
            <Text style={styles.label}>Was the event well organized? *</Text>
            <View style={styles.booleanContainer}>
              <TouchableOpacity
                style={[
                  styles.booleanButton,
                  feedbackData.well_organized === true && styles.booleanButtonSelected,
                ]}
                onPress={() => onUpdateFeedback('well_organized', true)}
              >
                <Text
                  style={[
                    styles.booleanButtonText,
                    feedbackData.well_organized === true && styles.booleanButtonTextSelected,
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.booleanButton,
                  feedbackData.well_organized === false && styles.booleanButtonSelected,
                ]}
                onPress={() => onUpdateFeedback('well_organized', false)}
              >
                <Text
                  style={[
                    styles.booleanButtonText,
                    feedbackData.well_organized === false && styles.booleanButtonTextSelected,
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
            </View>

            {/* Comments */}
            <Text style={styles.label}>Additional Comments (Optional)</Text>
            <TextInput
              style={styles.textArea}
              value={feedbackData.comments}
              onChangeText={(text) => onUpdateFeedback('comments', text)}
              placeholder="Share your thoughts..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

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
                onPress={onSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
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
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
  },
  star: {
    fontSize: 32,
  },
  booleanContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  booleanButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  booleanButtonSelected: {
    borderColor: '#9333ea',
    backgroundColor: '#9333ea',
  },
  booleanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  booleanButtonTextSelected: {
    color: '#ffffff',
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
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
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
