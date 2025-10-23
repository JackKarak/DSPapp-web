/**
 * Form section components
 * Modular sections with proper accessibility
 */

import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { FormData, FormErrors, FormMode } from '../hooks/events/useEventForm';
import { CustomDropdown } from './FormComponents';
import { registerFormStyles as styles } from '../styles/registerForm.styles';
import { POINT_TYPE_OPTIONS, roundToNearest15Minutes } from '../constants/formConstants';

// Helper functions
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// Basic Details Section
interface BasicDetailsSectionProps {
  mode: FormMode;
  formData: FormData;
  errors: FormErrors;
  onUpdate: (field: keyof FormData, value: any) => void;
}

export const BasicDetailsSection: React.FC<BasicDetailsSectionProps> = ({
  mode,
  formData,
  errors,
  onUpdate,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>Basic Details</Text>
    
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {mode === 'event' ? 'Event Title' : 'Title'} <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={[styles.input, errors.title && styles.inputError]}
        placeholder={mode === 'event' ? 'e.g., Weekly Chapter Meeting' : 'e.g., Spring Semester Points'}
        placeholderTextColor="#9ca3af"
        value={formData.title}
        onChangeText={(value) => onUpdate('title', value)}
        returnKeyType="next"
        autoCapitalize="words"
        accessibilityLabel={`${mode === 'event' ? 'Event' : ''} Title`}
        accessibilityHint="Required field"
      />
      {errors.title && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {errors.title}
        </Text>
      )}
    </View>

    {mode === 'event' && (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Location <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.location && styles.inputError]}
          placeholder="e.g., Chapter House, Main Hall"
          placeholderTextColor="#9ca3af"
          value={formData.location}
          onChangeText={(value) => onUpdate('location', value)}
          returnKeyType="next"
          autoCapitalize="words"
          accessibilityLabel="Location"
          accessibilityHint="Required field for events"
        />
        {errors.location && (
          <Text style={styles.errorText} accessibilityRole="alert">
            {errors.location}
          </Text>
        )}
      </View>
    )}

    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        Description <Text style={styles.optional}>(optional)</Text>
      </Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Add details about this event..."
        placeholderTextColor="#9ca3af"
        value={formData.description}
        onChangeText={(value) => onUpdate('description', value)}
        multiline
        numberOfLines={3}
        returnKeyType="default"
        textAlignVertical="top"
        accessibilityLabel="Description"
        accessibilityHint="Optional field"
      />
    </View>
  </View>
);

// Points Configuration Section
interface PointsSectionProps {
  mode: FormMode;
  formData: FormData;
  errors: FormErrors;
  onUpdate: (field: keyof FormData, value: any) => void;
}

export const PointsConfigSection: React.FC<PointsSectionProps> = ({
  mode,
  formData,
  errors,
  onUpdate,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>Points Configuration</Text>
    
    {mode === 'event' && (
      <View style={styles.switchRow}>
        <View style={styles.switchLabelContainer}>
          <Text style={styles.switchLabel}>Award Points</Text>
          <Text style={styles.switchHint}>Give members points for attending</Text>
        </View>
        <Switch 
          value={formData.awardPoints} 
          onValueChange={(value) => {
            onUpdate('awardPoints', value);
            if (!value) {
              onUpdate('pointType', '');
            }
          }}
          thumbColor={formData.awardPoints ? '#8b5cf6' : '#f4f3f4'}
          trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
          accessibilityLabel="Award points"
          accessibilityRole="switch"
          accessibilityState={{ checked: formData.awardPoints }}
        />
      </View>
    )}

    {formData.awardPoints && (
      <CustomDropdown
        label="Point Type"
        value={formData.pointType}
        options={POINT_TYPE_OPTIONS}
        onValueChange={(value) => onUpdate('pointType', value)}
        error={errors.pointType}
      />
    )}
  </View>
);

// Access & Registration Section
interface AccessSectionProps {
  mode: FormMode;
  formData: FormData;
  onUpdate: (field: keyof FormData, value: any) => void;
}

export const AccessSection: React.FC<AccessSectionProps> = ({
  mode,
  formData,
  onUpdate,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionHeader}>
      {mode === 'event' ? 'Access & Registration' : 'Access Settings'}
    </Text>
    
    {mode === 'event' && (
      <View style={styles.switchRow}>
        <View style={styles.switchLabelContainer}>
          <Text style={styles.switchLabel}>Open Registration</Text>
          <Text style={styles.switchHint}>Allow members to register in advance</Text>
        </View>
        <Switch 
          value={formData.isRegisterable} 
          onValueChange={(value) => onUpdate('isRegisterable', value)}
          thumbColor={formData.isRegisterable ? '#8b5cf6' : '#f4f3f4'}
          trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
          accessibilityLabel="Open registration"
          accessibilityRole="switch"
          accessibilityState={{ checked: formData.isRegisterable }}
        />
      </View>
    )}

    <View style={styles.switchRow}>
      <View style={styles.switchLabelContainer}>
        <Text style={styles.switchLabel}>Pledge Access</Text>
        <Text style={styles.switchHint}>Make available to pledge members</Text>
      </View>
      <Switch 
        value={formData.availableToPledges} 
        onValueChange={(value) => onUpdate('availableToPledges', value)}
        thumbColor={formData.availableToPledges ? '#8b5cf6' : '#f4f3f4'}
        trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
        accessibilityLabel="Pledge access"
        accessibilityRole="switch"
        accessibilityState={{ checked: formData.availableToPledges }}
      />
    </View>
  </View>
);

// Schedule Section
interface ScheduleSectionProps {
  mode: FormMode;
  formData: FormData;
  errors: FormErrors;
  onUpdate: (field: keyof FormData, value: any) => void;
  showStartDatePicker: boolean;
  showStartTimePicker: boolean;
  showEndDatePicker: boolean;
  showEndTimePicker: boolean;
  showDeadlinePicker: boolean;
  setShowStartDatePicker: (show: boolean) => void;
  setShowStartTimePicker: (show: boolean) => void;
  setShowEndDatePicker: (show: boolean) => void;
  setShowEndTimePicker: (show: boolean) => void;
  setShowDeadlinePicker: (show: boolean) => void;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  mode,
  formData,
  errors,
  onUpdate,
  showStartDatePicker,
  showStartTimePicker,
  showEndDatePicker,
  showEndTimePicker,
  showDeadlinePicker,
  setShowStartDatePicker,
  setShowStartTimePicker,
  setShowEndDatePicker,
  setShowEndTimePicker,
  setShowDeadlinePicker,
}) => {
  const handleTimeChange = (field: 'startTime' | 'endTime', time: Date | undefined) => {
    if (time) {
      const rounded = roundToNearest15Minutes(time);
      onUpdate(field, rounded);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>
        {mode === 'event' ? 'Schedule' : 'Deadline'}
      </Text>
      
      {mode === 'event' ? (
        <>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.switchLabel}>Multi-Day Event</Text>
              <Text style={styles.switchHint}>Event spans multiple days</Text>
            </View>
            <Switch 
              value={formData.isMultiDay} 
              onValueChange={(value) => onUpdate('isMultiDay', value)}
              thumbColor={formData.isMultiDay ? '#8b5cf6' : '#f4f3f4'}
              trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              accessibilityLabel="Multi-day event"
              accessibilityRole="switch"
              accessibilityState={{ checked: formData.isMultiDay }}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Start</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity 
                onPress={() => setShowStartDatePicker(true)} 
                style={[styles.pickerButton, { flex: 1.2 }]}
                accessibilityRole="button"
                accessibilityLabel={`Start date: ${formatDate(formData.startDate)}`}
                accessibilityHint="Double tap to change"
              >
                <Text style={styles.pickerButtonText}>📅 {formatDate(formData.startDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowStartTimePicker(true)} 
                style={[styles.pickerButton, { flex: 1 }]}
                accessibilityRole="button"
                accessibilityLabel={`Start time: ${formatTime(formData.startTime)}`}
                accessibilityHint="Double tap to change"
              >
                <Text style={styles.pickerButtonText}>🕐 {formatTime(formData.startTime)}</Text>
              </TouchableOpacity>
            </View>
            {showStartDatePicker && (
              <DateTimePicker
                value={formData.startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, date) => {
                  setShowStartDatePicker(false);
                  if (date) onUpdate('startDate', date);
                }}
              />
            )}
            {showStartTimePicker && (
              <DateTimePicker
                value={formData.startTime}
                mode="time"
                minuteInterval={15}
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, time) => {
                  setShowStartTimePicker(false);
                  handleTimeChange('startTime', time);
                }}
              />
            )}
          </View>

          {formData.isMultiDay && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity 
                onPress={() => setShowEndDatePicker(true)} 
                style={styles.pickerButton}
                accessibilityRole="button"
                accessibilityLabel={`End date: ${formatDate(formData.endDate)}`}
                accessibilityHint="Double tap to change"
              >
                <Text style={styles.pickerButtonText}>📅 {formatDate(formData.endDate)}</Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={formData.endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'compact' : 'default'}
                  onChange={(_, date) => {
                    setShowEndDatePicker(false);
                    if (date) onUpdate('endDate', date);
                  }}
                />
              )}
            </View>
          )}

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity 
              onPress={() => setShowEndTimePicker(true)} 
              style={styles.pickerButton}
              accessibilityRole="button"
              accessibilityLabel={`End time: ${formatTime(formData.endTime)}`}
              accessibilityHint="Double tap to change"
            >
              <Text style={styles.pickerButtonText}>🕐 {formatTime(formData.endTime)}</Text>
            </TouchableOpacity>
            {showEndTimePicker && (
              <DateTimePicker
                value={formData.endTime}
                mode="time"
                minuteInterval={15}
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, time) => {
                  setShowEndTimePicker(false);
                  handleTimeChange('endTime', time);
                }}
              />
            )}
          </View>

          {errors.time && (
            <Text style={[styles.errorText, { marginTop: 5 }]} accessibilityRole="alert">
              {errors.time}
            </Text>
          )}
        </>
      ) : (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Deadline Date</Text>
          <TouchableOpacity 
            onPress={() => setShowDeadlinePicker(true)} 
            style={styles.pickerButton}
            accessibilityRole="button"
            accessibilityLabel={`Deadline: ${formatDate(formData.endDate)}`}
            accessibilityHint="Double tap to change"
          >
            <Text style={styles.pickerButtonText}>📅 {formatDate(formData.endDate)}</Text>
          </TouchableOpacity>
          {showDeadlinePicker && (
            <DateTimePicker
              value={formData.endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'compact' : 'default'}
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDeadlinePicker(false);
                if (date) onUpdate('endDate', date);
              }}
            />
          )}
        </View>
      )}
    </View>
  );
};
