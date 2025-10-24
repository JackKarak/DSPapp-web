/**
 * President Register Event Screen
 * Refactored for efficiency, modularity, and accessibility
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useEventForm } from '../../hooks/events';
import { ErrorBanner, SuccessOverlay } from '../../components/FormComponents';
import {
  BasicDetailsSection,
  PointsConfigSection,
  AccessSection,
  ScheduleSection,
} from '../../components/FormSections';
import { registerFormStyles as styles } from '../../styles/registerForm.styles';
import { KEYBOARD_VERTICAL_OFFSET_IOS } from '../../constants/formConstants';

export default function PresidentRegisterEvent() {
  // Use custom hook for all form logic
  const {
    mode,
    formData,
    errors,
    globalError,
    loading,
    showSuccess,
    updateField,
    handleModeChange,
    handleSubmit,
    setGlobalError,
  } = useEventForm();

  // Date picker state (kept local as UI-specific)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Create New Entry</Text>
        <Text style={styles.subtitle}>
          {mode === 'event' ? 'Schedule an event for members' : 'Award points to members'}
        </Text>

        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity 
            style={[
              styles.modeButton,
              mode === 'event' && styles.modeButtonActive
            ]}
            onPress={() => handleModeChange('event')}
          >
            <Text style={[
              styles.modeButtonText,
              mode === 'event' && styles.modeButtonTextActive
            ]}>
              Regular Event
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.modeButton,
              mode === 'points' && styles.modeButtonActive
            ]}
            onPress={() => handleModeChange('points')}
          >
            <Text style={[
              styles.modeButtonText,
              mode === 'points' && styles.modeButtonTextActive
            ]}>
              Points Only
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {globalError && <ErrorBanner message={globalError} onDismiss={() => setGlobalError('')} />}

        {/* Basic Details */}
        <BasicDetailsSection 
          mode={mode}
          formData={formData}
          errors={errors}
          onUpdate={updateField}
        />

        {/* Points Configuration */}
        <PointsConfigSection 
          mode={mode}
          formData={formData}
          errors={errors}
          onUpdate={updateField}
        />

        {/* Access Section */}
        <AccessSection 
          mode={mode}
          formData={formData}
          onUpdate={updateField}
        />

        {/* Schedule Section */}
        <ScheduleSection 
          mode={mode}
          formData={formData}
          errors={errors}
          showStartDatePicker={showStartDatePicker}
          showStartTimePicker={showStartTimePicker}
          showEndDatePicker={showEndDatePicker}
          showEndTimePicker={showEndTimePicker}
          showDeadlinePicker={showDeadlinePicker}
          onUpdate={updateField}
          setShowStartDatePicker={setShowStartDatePicker}
          setShowStartTimePicker={setShowStartTimePicker}
          setShowEndDatePicker={setShowEndDatePicker}
          setShowEndTimePicker={setShowEndTimePicker}
          setShowDeadlinePicker={setShowDeadlinePicker}
        />

        {/* Submit Button */}
        <TouchableOpacity 
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Success Overlay */}
      <SuccessOverlay visible={showSuccess} />
    </KeyboardAvoidingView>
  );
}
