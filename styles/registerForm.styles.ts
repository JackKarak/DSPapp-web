/**
 * Register form styles
 * Extracted for better maintainability and reusability
 */

import { StyleSheet, Platform } from 'react-native';

export const registerFormStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
  },
  
  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3f4f6',
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  modeButtonTextActive: {
    color: '#8b5cf6',
  },

  // Sections
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },

  // Form Fields
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
    fontSize: 15,
  },
  optional: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '400',
  },
  input: {
    height: 48,
    borderColor: '#d1d5db',
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  textArea: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 2,
  },
  placeholderText: {
    color: '#9ca3af',
  },

  // Dropdown
  dropdownButton: {
    height: 48,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#d1d5db',
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#1f2937',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#9ca3af',
    lineHeight: 24,
  },
  optionsList: {
    paddingHorizontal: 20,
  },
  optionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  checkmark: {
    color: '#8b5cf6',
    fontSize: 18,
    fontWeight: '700',
  },
  selectedOption: {
    backgroundColor: '#f9fafb',
  },
  selectedOptionText: {
    color: '#8b5cf6',
    fontWeight: '600',
  },

  // Switch Rows
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 12,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  switchHint: {
    fontSize: 13,
    color: '#9ca3af',
  },

  // Date/Time Pickers
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerButton: {
    height: 48,
    borderColor: '#d1d5db',
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#1f2937',
  },

  // Error Banner
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
    fontWeight: '500',
  },
  errorBannerClose: {
    fontSize: 20,
    color: '#dc2626',
    marginLeft: 12,
    fontWeight: '600',
  },

  // Submit Button
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },

  // Success Overlay
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  successCheck: {
    fontSize: 64,
    color: '#10b981',
    marginBottom: 16,
  },
  successText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 15,
    color: '#6b7280',
  },

  // Loading Overlay - REMOVED BLOCKING OVERLAY
  loadingContainer: {
    paddingVertical: 2,
  },
});
