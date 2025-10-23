/**
 * ProfileEditForm Component
 * 
 * Form for editing user profile with all fields and validation
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { ProfileFormData } from '../../types/hooks';
import { DropdownSelect } from '../DropdownSelect';
import {
  PRONOUNS_OPTIONS,
  GRADUATION_OPTIONS,
  HOUSE_OPTIONS,
  PLEDGE_CLASS_OPTIONS,
  GENDER_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  RACE_OPTIONS,
  LIVING_TYPE_OPTIONS,
  AVAILABLE_MAJORS,
} from '../../constants/accountConstants';

interface ProfileEditFormProps {
  formData: ProfileFormData;
  onUpdate: <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

// Multi-Select Component for Majors
const MajorMultiSelect: React.FC<{
  selectedMajors: string[];
  onSelectionChange: (majors: string[]) => void;
}> = ({ selectedMajors, onSelectionChange }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleMajor = (major: string) => {
    if (selectedMajors.includes(major)) {
      onSelectionChange(selectedMajors.filter(m => m !== major));
    } else {
      onSelectionChange([...selectedMajors, major]);
    }
  };

  return (
    <View style={styles.multiSelectContainer}>
      <TouchableOpacity
        style={styles.multiSelectButton}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={selectedMajors.length > 0 ? styles.multiSelectText : styles.placeholderText}>
          {selectedMajors.length > 0 
            ? selectedMajors.join(', ')
            : 'Select majors'
          }
        </Text>
        <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {showDropdown && (
        <View style={styles.multiSelectDropdown}>
          {AVAILABLE_MAJORS.map((major) => (
            <TouchableOpacity
              key={major}
              style={[
                styles.multiSelectOption,
                selectedMajors.includes(major) && styles.multiSelectOptionSelected
              ]}
              onPress={() => toggleMajor(major)}
            >
              <Text style={[
                styles.multiSelectOptionText,
                selectedMajors.includes(major) && styles.multiSelectOptionTextSelected
              ]}>
                {major}
              </Text>
              {selectedMajors.includes(major) && (
                <Text style={styles.multiSelectCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  formData,
  onUpdate,
  onSave,
  onCancel,
  saving,
}) => {
  return (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      {/* Personal Information Section */}
      <Text style={styles.sectionLabel}>Personal Information</Text>
      
      <Text style={styles.fieldLabel}>First Name *</Text>
      <TextInput
        style={styles.input}
        value={formData.firstName || ''}
        onChangeText={(text) => onUpdate('firstName', text)}
        placeholder="Enter your first name"
        autoCapitalize="words"
        editable={!saving}
      />

      <Text style={styles.fieldLabel}>Last Name *</Text>
      <TextInput
        style={styles.input}
        value={formData.lastName || ''}
        onChangeText={(text) => onUpdate('lastName', text)}
        placeholder="Enter your last name"
        autoCapitalize="words"
        editable={!saving}
      />

      <Text style={styles.fieldLabel}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={formData.phoneNumber || ''}
        onChangeText={(text) => onUpdate('phoneNumber', text)}
        placeholder="(123) 456-7890"
        keyboardType="phone-pad"
        editable={!saving}
      />

      <Text style={styles.fieldLabel}>Email (Non-Terpmail)</Text>
      <TextInput
        style={styles.input}
        value={formData.email || ''}
        onChangeText={(text) => onUpdate('email', text)}
        placeholder="your.email@gmail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!saving}
      />

      <Text style={styles.fieldLabel}>UID</Text>
      <TextInput
        style={styles.input}
        value={formData.uid || ''}
        onChangeText={(text) => onUpdate('uid', text)}
        placeholder="Enter your UID"
        editable={!saving}
      />

      <Text style={styles.fieldLabel}>Pronouns</Text>
      <DropdownSelect
        label=""
        value={formData.pronouns || ''}
        options={PRONOUNS_OPTIONS}
        onValueChange={(value) => onUpdate('pronouns', value)}
        placeholder="Select pronouns"
      />

      {/* Academic Information Section */}
      <Text style={styles.sectionLabel}>Academic Information</Text>

      <Text style={styles.fieldLabel}>Majors / Intended Majors</Text>
      <MajorMultiSelect
        selectedMajors={formData.selectedMajors || []}
        onSelectionChange={(majors) => onUpdate('selectedMajors', majors)}
      />

      <Text style={styles.fieldLabel}>Minors / Intended Minors</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={formData.minors || ''}
        onChangeText={(text) => onUpdate('minors', text)}
        placeholder="Statistics, Business"
        multiline={true}
        numberOfLines={2}
        editable={!saving}
      />

      <Text style={styles.fieldLabel}>Expected Graduation</Text>
      <DropdownSelect
        label=""
        value={formData.expectedGraduation || ''}
        options={GRADUATION_OPTIONS}
        onValueChange={(value) => onUpdate('expectedGraduation', value)}
        placeholder="Select graduation date"
      />

      {/* Fraternity Information Section */}
      <Text style={styles.sectionLabel}>Fraternity Information</Text>

      <Text style={styles.fieldLabel}>House Membership</Text>
      <DropdownSelect
        label=""
        value={formData.houseMembership || ''}
        options={HOUSE_OPTIONS}
        onValueChange={(value) => onUpdate('houseMembership', value)}
        placeholder="Select house"
      />

      <Text style={styles.fieldLabel}>Pledge Class</Text>
      <DropdownSelect
        label=""
        value={formData.pledgeClass || ''}
        options={PLEDGE_CLASS_OPTIONS}
        onValueChange={(value) => onUpdate('pledgeClass', value)}
        placeholder="Select pledge class"
      />

      {/* Personal Details Section (Optional) */}
      <Text style={styles.sectionLabel}>Personal Details (Optional)</Text>

      <Text style={styles.fieldLabel}>Gender</Text>
      <DropdownSelect
        label=""
        value={formData.gender || ''}
        options={GENDER_OPTIONS}
        onValueChange={(value) => onUpdate('gender', value)}
        placeholder="Select gender"
      />

      <Text style={styles.fieldLabel}>Sexual Orientation</Text>
      <DropdownSelect
        label=""
        value={formData.sexualOrientation || ''}
        options={SEXUAL_ORIENTATION_OPTIONS}
        onValueChange={(value) => onUpdate('sexualOrientation', value)}
        placeholder="Select sexual orientation"
      />

      <Text style={styles.fieldLabel}>Race/Ethnicity</Text>
      <DropdownSelect
        label=""
        value={formData.race || ''}
        options={RACE_OPTIONS}
        onValueChange={(value) => onUpdate('race', value)}
        placeholder="Select race/ethnicity"
      />

      <Text style={styles.fieldLabel}>Living Type</Text>
      <DropdownSelect
        label=""
        value={formData.livingType || ''}
        options={LIVING_TYPE_OPTIONS}
        onValueChange={(value) => onUpdate('livingType', value)}
        placeholder="Select living type"
      />

      {/* Action Buttons */}
      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.disabledButton]} 
        onPress={onSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>Save Profile</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={onCancel}
        disabled={saving}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  multiSelectContainer: {
    marginBottom: 8,
  },
  multiSelectButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  multiSelectText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  multiSelectDropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  multiSelectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  multiSelectOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  multiSelectOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  multiSelectOptionTextSelected: {
    fontWeight: '600',
    color: '#1976D2',
  },
  multiSelectCheckmark: {
    fontSize: 18,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
