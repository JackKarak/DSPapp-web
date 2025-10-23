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
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  buttonText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
    fontWeight: '500',
  },
  placeholderText: {
    color: '#9ca3af',
    fontWeight: '400',
  },
  arrow: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '700',
  },
  dropdownContainer: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    maxHeight: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  optionsList: {
    maxHeight: 240,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  optionSelected: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  optionText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8b5cf6',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
