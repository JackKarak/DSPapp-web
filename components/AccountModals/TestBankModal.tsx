/**
 * TestBankModal Component
 * 
 * Modal for submitting test bank files
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';

interface TestBankModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  classCode: string;
  fileType: 'test' | 'notes' | 'materials';
  selectedFile: any | null;
  onUpdateClassCode: (code: string) => void;
  onUpdateFileType: (type: 'test' | 'notes' | 'materials') => void;
  onPickFile: () => void;
}

export const TestBankModal: React.FC<TestBankModalProps> = ({
  visible,
  onClose,
  onSubmit,
  classCode,
  fileType,
  selectedFile,
  onUpdateClassCode,
  onUpdateFileType,
  onPickFile,
}) => {
  const handleSubmit = () => {
    if (!classCode.trim()) {
      Alert.alert('Validation Error', 'Please enter a class code.');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Validation Error', 'Please select a file to upload.');
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
            <Text style={styles.modalTitle}>📚 Test Bank Submission</Text>
            <Text style={styles.subtitle}>
              Help your brothers by sharing study materials
            </Text>

            {/* Class Code */}
            <Text style={styles.label}>Class Code *</Text>
            <TextInput
              style={styles.input}
              value={classCode}
              onChangeText={onUpdateClassCode}
              placeholder="e.g., CMSC131, MATH140"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {/* File Type */}
            <Text style={styles.label}>File Type *</Text>
            <View style={styles.fileTypeContainer}>
              {[
                { value: 'test', label: 'Test' },
                { value: 'notes', label: 'Notes' },
                { value: 'materials', label: 'Assignment' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.fileTypeButton,
                    fileType === type.value && styles.fileTypeButtonSelected,
                  ]}
                  onPress={() => onUpdateFileType(type.value as 'test' | 'notes' | 'materials')}
                >
                  <Text
                    style={[
                      styles.fileTypeText,
                      fileType === type.value && styles.fileTypeTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* File Selection */}
            <Text style={styles.label}>File *</Text>
            <TouchableOpacity style={styles.fileButton} onPress={onPickFile}>
              <Text style={styles.fileButtonIcon}>📄</Text>
              <Text style={styles.fileButtonText}>
                {selectedFile ? selectedFile.name : 'Select File'}
              </Text>
            </TouchableOpacity>

            {selectedFile && (
              <View style={styles.fileInfo}>
                <Text style={styles.fileInfoText}>
                  Size: {(selectedFile.size / 1024).toFixed(2)} KB
                </Text>
              </View>
            )}

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Your submission will be reviewed before being added to the test bank. Make sure files don't contain any personal information.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
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
  subtitle: {
    fontSize: 14,
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
  fileTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  fileTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  fileTypeButtonSelected: {
    borderColor: '#9333ea',
    backgroundColor: '#9333ea',
  },
  fileTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  fileTypeTextSelected: {
    color: '#ffffff',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  fileButtonIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  fileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  fileInfo: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  fileInfoText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
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
