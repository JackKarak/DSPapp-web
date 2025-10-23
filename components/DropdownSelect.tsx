/**
 * Reusable Dropdown Select Component
 * Replaces 8+ separate dropdown implementations
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownSelectProps {
  label: string;
  value: string;
  options: DropdownOption[] | string[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  formatValue?: (value: string) => string;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  label,
  value,
  options,
  onValueChange,
  placeholder = 'Select an option',
  formatValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Normalize options to { label, value } format
  const normalizedOptions: DropdownOption[] = options.map(opt => 
    typeof opt === 'string' 
      ? { label: opt, value: opt }
      : opt
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayValue = selectedOption
    ? (formatValue ? formatValue(selectedOption.label) : selectedOption.label)
    : placeholder;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(!isOpen)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${displayValue}`}
        accessibilityHint="Double tap to open options"
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={[styles.buttonText, !value && styles.placeholderText]}>
          {displayValue}
        </Text>
        <Text style={styles.arrow}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownContainer}>
          <ScrollView
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {normalizedOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  value === option.value && styles.optionSelected
                ]}
                onPress={() => {
                  onValueChange(option.value);
                  setIsOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: value === option.value }}
                accessibilityLabel={option.label}
              >
                <Text style={[
                  styles.optionText,
                  value === option.value && styles.optionTextSelected
                ]}>
                  {option.label}
                </Text>
                {value === option.value && (
                  <View style={styles.checkmark} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonText: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
    fontWeight: '500',
  },
  placeholderText: {
    color: '#9ca3af',
    fontWeight: '400',
  },
  arrow: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '700',
  },
  dropdownContainer: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    maxHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  optionsList: {
    maxHeight: 180,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  optionSelected: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 2,
    borderLeftColor: '#3b82f6',
  },
  optionText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  checkmark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#8b5cf6',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
