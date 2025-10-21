import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { combineDateAndTime, getESTISOString, roundToNearestMinute } from '../../lib/dateUtils';
import { supabase } from '../../lib/supabase';

// Memoized point type options - defined once outside component
const POINT_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Select point type', value: 'none' },
  { label: 'Brotherhood', value: 'brotherhood' },
  { label: 'Professional', value: 'professional' },
  { label: 'Service', value: 'service' },
  { label: 'Scholarship', value: 'scholarship' },
  { label: 'Health & Wellness', value: 'h&w' },
  { label: 'Fundraising', value: 'fundraising' },
  { label: 'DEI', value: 'dei' }
];

// Custom Dropdown Component for Point Types
interface DropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const CustomDropdown: React.FC<DropdownProps> = React.memo(({ label, value, options, onValueChange, disabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);

  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value]
  );

  const handlePress = useCallback(() => {
    if (!disabled) setIsVisible(true);
  }, [disabled]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleSelect = useCallback((optionValue: string) => {
    onValueChange(optionValue);
    setIsVisible(false);
  }, [onValueChange]);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdownButton, disabled && styles.dropdownButtonDisabled]}
        onPress={handlePress}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.dropdownButtonText, disabled && styles.dropdownButtonTextDisabled]} numberOfLines={1}>
          {selectedOption?.label || 'Select...'}
        </Text>
        <Text style={[styles.dropdownArrow, disabled && styles.dropdownArrowDisabled]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    option.value === value && styles.selectedOption
                  ]}
                  onPress={() => handleSelect(option.value)}
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
});

interface FormData {
  title: string;
  description: string;
  location: string;
  pointType: string;
  startDate: Date;
  startTime: Date;
  endDate: Date;
  endTime: Date;
  isRegisterable: boolean;
  availableToPledges: boolean;
  isMultiDay: boolean;
  isNoPoint: boolean;
  isNonEvent: boolean;
}

const INITIAL_FORM_STATE: FormData = {
  title: '',
  description: '',
  location: '',
  pointType: 'none',
  startDate: new Date(),
  startTime: new Date(),
  endDate: new Date(),
  endTime: new Date(),
  isRegisterable: true,
  availableToPledges: true,
  isMultiDay: false,
  isNoPoint: false,
  isNonEvent: false,
};

export default function OfficerRegisterEvent() {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_STATE);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Memoized validation function
  const validateForm = useCallback(() => {
    const { title, location, pointType, isNonEvent, isNoPoint } = formData;
    
    if (!title) return 'Please enter an event title';
    if (!isNonEvent && !location) return 'Please enter a location';
    if (!isNonEvent && !pointType && !isNoPoint) return 'Please select a point type or mark as no-point event';
    if (isNonEvent && !pointType) return 'Please select a point type';
    
    return null;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false); // Reset loading before navigation
        Alert.alert('Authentication Error', 'User not authenticated. Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const { startDate, startTime, endDate, endTime, isMultiDay, title, description, location, pointType, isNonEvent, isNoPoint, isRegisterable, availableToPledges } = formData;

      // Validate dates before processing
      if (isNaN(startDate.getTime()) || isNaN(startTime.getTime()) || 
          isNaN(endDate.getTime()) || isNaN(endTime.getTime())) {
        Alert.alert('Date Error', 'Invalid date or time selected. Please check your date and time selections.');
        setLoading(false);
        return;
      }

      // Consolidated date processing with single try-catch
      try {
        const combinedStart = combineDateAndTime(startDate, startTime);
        const finalEndDate = isMultiDay ? endDate : startDate;
        const combinedEnd = combineDateAndTime(finalEndDate, endTime);
        
        // Validate end time is after start time
        if (combinedEnd <= combinedStart) {
          Alert.alert('Time Error', 'End time must be after start time.');
          setLoading(false);
          return;
        }

        // Round and format in one flow
        const roundedStart = roundToNearestMinute(combinedStart);
        const roundedEnd = roundToNearestMinute(combinedEnd);
        const startTimeString = getESTISOString(roundedStart);
        const endTimeString = getESTISOString(roundedEnd);

        const { error } = await supabase.from('events').insert({
          title,
          description,
          location: isNonEvent ? '' : location,
          point_type: isNonEvent ? pointType : (isNoPoint ? 'No Point' : pointType),
          point_value: isNonEvent ? 1 : (isNoPoint ? 0 : 1),
          start_time: startTimeString,
          end_time: endTimeString,
          created_by: user.id,
          is_registerable: isNonEvent ? false : isRegisterable,
          available_to_pledges: availableToPledges,
          is_non_event: isNonEvent,
          status: 'pending',
        });

        if (error) {
          console.error('Event creation error:', error);
          Alert.alert('Submission Error', `Failed to create event: ${error.message}\n\nDetails: ${error.details || 'None'}\nHint: ${error.hint || 'None'}`);
        } else {
          Alert.alert('Success', 'Event created successfully and is pending approval');
          // Single state update instead of 13 separate calls
          setFormData(INITIAL_FORM_STATE);
        }
      } catch (dateError) {
        console.error('Date processing error:', dateError);
        Alert.alert('Date Error', 'Failed to process the event dates and times. Please try again.');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, router]);

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Register New Event</Text>
        <Text style={styles.subtitle}>Create a new event for member participation</Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Is this a Non-Event? (Points only)</Text>
          <Switch 
            value={formData.isNonEvent} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, isNonEvent: value }))}
            thumbColor={formData.isNonEvent ? '#8b5cf6' : '#f4f3f4'}
            trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
          />
        </View>

        <Text style={styles.label}>Event Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter event title"
          placeholderTextColor="#9ca3af"
          value={formData.title}
          onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
        />

        {!formData.isNonEvent && (
          <>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter event location"
              placeholderTextColor="#9ca3af"
              value={formData.location}
              onChangeText={(value) => setFormData(prev => ({ ...prev, location: value }))}
            />
          </>
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter event description"
          placeholderTextColor="#9ca3af"
          value={formData.description}
          multiline
          numberOfLines={3}
          onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
        />

        {formData.isNonEvent ? (
          <>
            {/* Non-Event: Only show Point Type and Available to Pledges */}
            <CustomDropdown
              label="Point Type *"
              value={formData.pointType}
              options={POINT_TYPE_OPTIONS}
              onValueChange={(value) => setFormData(prev => ({ ...prev, pointType: value }))}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Available to Pledges?</Text>
              <Switch 
                value={formData.availableToPledges} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, availableToPledges: value }))}
                thumbColor={formData.availableToPledges ? '#8b5cf6' : '#f4f3f4'}
                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              />
            </View>
          </>
        ) : (
          <>
            {/* Regular Event: Show all options */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>No Point Event?</Text>
              <Switch 
                value={formData.isNoPoint} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, isNoPoint: value }))}
                thumbColor={formData.isNoPoint ? '#8b5cf6' : '#f4f3f4'}
                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              />
            </View>

            {!formData.isNoPoint && (
              <CustomDropdown
                label="Point Type *"
                value={formData.pointType}
                options={POINT_TYPE_OPTIONS}
                onValueChange={(value) => setFormData(prev => ({ ...prev, pointType: value }))}
                disabled={formData.isNoPoint}
              />
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Registerable Event?</Text>
              <Switch 
                value={formData.isRegisterable} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, isRegisterable: value }))}
                thumbColor={formData.isRegisterable ? '#8b5cf6' : '#f4f3f4'}
                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Available to Pledges?</Text>
              <Switch 
                value={formData.availableToPledges} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, availableToPledges: value }))}
                thumbColor={formData.availableToPledges ? '#8b5cf6' : '#f4f3f4'}
                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Is this a multi-day event?</Text>
              <Switch 
                value={formData.isMultiDay} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, isMultiDay: value }))}
                thumbColor={formData.isMultiDay ? '#8b5cf6' : '#f4f3f4'}
                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              />
            </View>
          </>
        )}

        {!formData.isNonEvent ? (
          <>
            {/* Regular Event Date/Time Fields */}
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>{formData.startDate.toDateString()}</Text>
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={formData.startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, date) => {
                  setShowStartDatePicker(false);
                  if (date) setFormData(prev => ({ ...prev, startDate: date }));
                }}
              />
            )}

            {formData.isMultiDay && (
              <>
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.pickerButton}>
                  <Text style={styles.pickerButtonText}>{formData.endDate.toDateString()}</Text>
                </TouchableOpacity>
                {showEndDatePicker && (
                  <DateTimePicker
                    value={formData.endDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(_, date) => {
                      setShowEndDatePicker(false);
                      if (date) setFormData(prev => ({ ...prev, endDate: date }));
                    }}
                  />
                )}
              </>
            )}

            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity onPress={() => setShowStartTimePicker(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>{formData.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>
            {showStartTimePicker && (
              <DateTimePicker
                value={formData.startTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, time) => {
                  setShowStartTimePicker(false);
                  if (time) setFormData(prev => ({ ...prev, startTime: time }));
                }}
              />
            )}

            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity onPress={() => setShowEndTimePicker(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>{formData.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>
            {showEndTimePicker && (
              <DateTimePicker
                value={formData.endTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, time) => {
                  setShowEndTimePicker(false);
                  if (time) setFormData(prev => ({ ...prev, endTime: time }));
                }}
              />
            )}
          </>
        ) : (
          <>
            {/* Non-Event: Only show Deadline */}
            <Text style={styles.label}>Deadline</Text>
            <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>{formData.endDate.toDateString()}</Text>
            </TouchableOpacity>
            {showEndDatePicker && (
              <DateTimePicker
                value={formData.endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, date) => {
                  setShowEndDatePicker(false);
                  if (date) setFormData(prev => ({ ...prev, endDate: date }));
                }}
              />
            )}
          </>
        )}

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating Event...' : 'Submit Event'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
    paddingBottom: 80,
    backgroundColor: '#f9fafb',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderColor: '#d1d5db',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginVertical: 10,
    fontSize: 16,
    color: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
    marginTop: 15,
  },
  picker: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  pickerItem: {
    fontSize: 16,
    color: '#000',
  },
  pickerButton: {
    height: 50,
    borderColor: '#d1d5db',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  dropdown: {
    borderColor: '#d1d5db',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 10,
  },
  dropdownContainer: {
    position: 'relative',
    marginVertical: 10,
  },
  dropdownButton: {
    height: 50,
    paddingHorizontal: 15,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#d1d5db',
    borderWidth: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButtonDisabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  dropdownButtonTextDisabled: {
    color: '#9ca3af',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  dropdownArrowDisabled: {
    color: '#d1d5db',
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '70%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  optionItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  checkmark: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedOption: {
    backgroundColor: '#f3f4f6',
  },
  selectedOptionText: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 15,
  },
  modalCloseButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
