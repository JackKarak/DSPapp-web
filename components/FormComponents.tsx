/**
 * Shared form UI components
 * Reusable components with proper accessibility
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { registerFormStyles as styles } from '../styles/registerForm.styles';

// Error Banner Component
interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => (
  <View 
    style={styles.errorBanner}
    accessibilityRole="alert"
  >
    <View style={styles.errorBannerContent}>
      <Text style={styles.errorBannerText}>⚠️ {message}</Text>
      <TouchableOpacity 
        onPress={onDismiss} 
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss error message"
      >
        <Text style={styles.errorBannerClose}>✕</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// Success Overlay Component
interface SuccessOverlayProps {
  visible: boolean;
}

export const SuccessOverlay: React.FC<SuccessOverlayProps> = ({ visible }) => {
  if (!visible) return null;
  
  return (
    <View 
      style={styles.successOverlay}
      accessibilityRole="alert"
      accessibilityLabel="Event created successfully"
    >
      <View style={styles.successCard}>
        <Text style={styles.successCheck}>✓</Text>
        <Text style={styles.successText}>Event Created!</Text>
        <Text style={styles.successSubtext}>Pending approval</Text>
      </View>
    </View>
  );
};

// Custom Dropdown Component
interface DropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
  error?: string;
}

export const CustomDropdown: React.FC<DropdownProps> = ({ 
  label, 
  value, 
  options, 
  onValueChange, 
  error 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value]
  );

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdownButton, error && styles.inputError]}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedOption?.label || 'Not selected'}`}
        accessibilityHint="Double tap to open options"
      >
        <Text 
          style={[styles.dropdownButtonText, !value && styles.placeholderText]} 
          numberOfLines={1}
        >
          {selectedOption?.label || 'Select point type...'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>
      {error && (
        <Text 
          style={styles.errorText}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
        accessibilityViewIsModal={true}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close options menu"
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity 
                onPress={() => setIsVisible(false)} 
                style={styles.modalCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    option.value === value && styles.selectedOption
                  ]}
                  onPress={() => {
                    onValueChange(option.value);
                    setIsVisible(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: option.value === value }}
                  accessibilityLabel={option.label}
                >
                  <Text style={[
                    styles.optionText,
                    option.value === value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                  {option.value === value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
