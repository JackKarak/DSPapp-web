/**
 * Officer Register Event Screen
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

export default function OfficerRegisterEvent() {
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
      style={styles.wrapper} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET_IOS}
    >
      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header}>Create New Entry</Text>
        <Text style={styles.subtitle}>
          {mode === 'event' ? 'Schedule an event for members' : 'Award points to members'}
        </Text>

        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'event' && styles.modeButtonActive]}
            onPress={() => handleModeChange('event')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'event' }}
            accessibilityLabel="Event mode"
          >
            <Text style={[styles.modeButtonText, mode === 'event' && styles.modeButtonTextActive]}>
              📅 Event
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'points' && styles.modeButtonActive]}
            onPress={() => handleModeChange('points')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'points' }}
            accessibilityLabel="Points only mode"
          >
            <Text style={[styles.modeButtonText, mode === 'points' && styles.modeButtonTextActive]}>
              ⭐ Points Only
            </Text>
          </TouchableOpacity>
        </View>

        {/* Global Error Banner */}
        {globalError && (
          <ErrorBanner message={globalError} onDismiss={() => setGlobalError('')} />
        )}

        {/* Form Sections */}
        <BasicDetailsSection
          mode={mode}
          formData={formData}
          errors={errors}
          onUpdate={updateField}
        />

        <PointsConfigSection
          mode={mode}
          formData={formData}
          errors={errors}
          onUpdate={updateField}
        />

        <AccessSection
          mode={mode}
          formData={formData}
          onUpdate={updateField}
        />

        <ScheduleSection
          mode={mode}
          formData={formData}
          errors={errors}
          onUpdate={updateField}
          showStartDatePicker={showStartDatePicker}
          showStartTimePicker={showStartTimePicker}
          showEndDatePicker={showEndDatePicker}
          showEndTimePicker={showEndTimePicker}
          showDeadlinePicker={showDeadlinePicker}
          setShowStartDatePicker={setShowStartDatePicker}
          setShowStartTimePicker={setShowStartTimePicker}
          setShowEndDatePicker={setShowEndDatePicker}
          setShowEndTimePicker={setShowEndTimePicker}
          setShowDeadlinePicker={setShowDeadlinePicker}
        />

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={mode === 'event' ? 'Create Event' : 'Award Points'}
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {mode === 'event' ? 'Create Event' : 'Award Points'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Success Overlay - No longer blocks interaction */}
      <SuccessOverlay visible={showSuccess} />
    </KeyboardAvoidingView>
  );
}
