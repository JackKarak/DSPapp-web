import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { supabase } from '../../lib/supabase';

// Custom Dropdown Component for Point Types
interface DropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

const CustomDropdown: React.FC<DropdownProps> = ({ label, value, options, onValueChange, disabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdownButton, disabled && styles.dropdownButtonDisabled]}
        onPress={() => !disabled && setIsVisible(true)}
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
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
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
                  onPress={() => {
                    onValueChange(option.value);
                    setIsVisible(false);
                  }}
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

export default function OfficerRegisterEvent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [pointType, setPointType] = useState('none');
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [isRegisterable, setIsRegisterable] = useState(true);
  const [availableToPledges, setAvailableToPledges] = useState(true);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [isNoPoint, setIsNoPoint] = useState(false);
  const [isNonEvent, setIsNonEvent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function roundToNearestMinute(date: Date) {
    const rounded = new Date(date);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
  }

  const handleSubmit = async () => {
    // For non-events: only need title and point type
    // For regular events: need title, location, and either point type or no-point flag
    if (!title || (!isNonEvent && !location) || (!isNonEvent && !pointType && !isNoPoint) || (isNonEvent && !pointType)) {
      Alert.alert('Validation Error', 'Please fill out all required fields');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Authentication Error', 'User not authenticated. Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      const combinedStart = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes()
      );

      const finalEndDate = isMultiDay ? endDate : startDate;

      const combinedEnd = new Date(
        finalEndDate.getFullYear(),
        finalEndDate.getMonth(),
        finalEndDate.getDate(),
        endTime.getHours(),
        endTime.getMinutes()
      );

      const roundedStart = roundToNearestMinute(combinedStart);
      const roundedEnd = roundToNearestMinute(combinedEnd);

      // iOS-compatible timezone handling - format as local datetime string for Supabase
      const getLocalISOString = (date: Date) => {
        if (Platform.OS === 'ios') {
          // Use native iOS date formatting for better compatibility
          const formatter = new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
          return formatter.format(date).replace(',', '');
        } else {
          // Android fallback with manual formatting
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          
          // Return in format YYYY-MM-DD HH:MM:SS (local time, no timezone conversion)
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
      };

      const { error } = await supabase.from('events').insert({
        title,
        description,
        location: isNonEvent ? '' : location,
        point_type: isNonEvent ? pointType : (isNoPoint ? 'No Point' : pointType),
        point_value: isNonEvent ? 1 : (isNoPoint ? 0 : 1),
        start_time: getLocalISOString(roundedStart),
        end_time: getLocalISOString(roundedEnd),
        created_by: user.id, // Using user.id from auth, which maps to user_id in users table
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
        setTitle('');
        setDescription('');
        setLocation('');
        setPointType('none');
        setStartDate(new Date());
        setStartTime(new Date());
        setEndDate(new Date());
        setEndTime(new Date());
        setIsRegisterable(true);
        setAvailableToPledges(true);
        setIsMultiDay(false);
        setIsNoPoint(false);
        setIsNonEvent(false);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Register New Event</Text>
        <Text style={styles.subtitle}>Create a new event for member participation</Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Is this a Non-Event? (Points only)</Text>
          <Switch 
            value={isNonEvent} 
            onValueChange={setIsNonEvent}
            thumbColor={isNonEvent ? '#8b5cf6' : '#f4f3f4'}
            trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
          />
        </View>

        <Text style={styles.label}>Event Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter event title"
          placeholderTextColor="#9ca3af"
          value={title}
          onChangeText={setTitle}
        />

        {!isNonEvent && (
          <>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter event location"
              placeholderTextColor="#9ca3af"
              value={location}
              onChangeText={setLocation}
            />
          </>
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter event description"
          placeholderTextColor="#9ca3af"
          value={description}
          multiline
          numberOfLines={3}
          onChangeText={setDescription}
        />

        {isNonEvent ? (
          <>
            {/* Non-Event: Only show Point Type and Available to Pledges */}
            <CustomDropdown
              label="Point Type *"
              value={pointType}
              options={[
                { label: 'Select point type', value: 'none' },
                { label: 'Brotherhood', value: 'brotherhood' },
                { label: 'Professional', value: 'professional' },
                { label: 'Service', value: 'service' },
                { label: 'Scholarship', value: 'scholarship' },
                { label: 'Health & Wellness', value: 'h&w' },
                { label: 'Fundraising', value: 'fundraising' },
                { label: 'DEI', value: 'dei' }
              ]}
              onValueChange={(value) => setPointType(value)}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Available to Pledges?</Text>
              <Switch 
                value={availableToPledges} 
                onValueChange={setAvailableToPledges}
                thumbColor={availableToPledges ? '#8b5cf6' : '#f4f3f4'}
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
                value={isNoPoint} 
                onValueChange={setIsNoPoint}
                thumbColor={isNoPoint ? '#8b5cf6' : '#f4f3f4'}
                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              />
            </View>

            {!isNoPoint && (
              <CustomDropdown
                label="Point Type *"
                value={pointType}
                options={[
                  { label: 'Select point type', value: 'none' },
                  { label: 'Brotherhood', value: 'brotherhood' },
                  { label: 'Professional', value: 'professional' },
                  { label: 'Service', value: 'service' },
                  { label: 'Scholarship', value: 'scholarship' },
                  { label: 'Health & Wellness', value: 'h&w' },
                  { label: 'Fundraising', value: 'fundraising' },
                  { label: 'DEI', value: 'dei' }
                ]}
                onValueChange={(value) => setPointType(value)}
                disabled={isNoPoint}
              />
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Registerable Event?</Text>
              <Switch 
                value={isRegisterable} 
                onValueChange={setIsRegisterable}
                thumbColor={isRegisterable ? '#8b5cf6' : '#f4f3f4'}
                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Available to Pledges?</Text>
              <Switch 
                value={availableToPledges} 
                onValueChange={setAvailableToPledges}
                thumbColor={availableToPledges ? '#8b5cf6' : '#f4f3f4'}
                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Is this a multi-day event?</Text>
              <Switch 
                value={isMultiDay} 
                onValueChange={setIsMultiDay}
                thumbColor={isMultiDay ? '#8b5cf6' : '#f4f3f4'}
                trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              />
            </View>
          </>
        )}

        {!isNonEvent ? (
          <>
            {/* Regular Event Date/Time Fields */}
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>{startDate.toDateString()}</Text>
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, date) => {
                  setShowStartDatePicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}

            {isMultiDay && (
              <>
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.pickerButton}>
                  <Text style={styles.pickerButtonText}>{endDate.toDateString()}</Text>
                </TouchableOpacity>
                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(_, date) => {
                      setShowEndDatePicker(false);
                      if (date) setEndDate(date);
                    }}
                  />
                )}
              </>
            )}

            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity onPress={() => setShowStartTimePicker(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>
            {showStartTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, time) => {
                  setShowStartTimePicker(false);
                  if (time) setStartTime(time);
                }}
              />
            )}

            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity onPress={() => setShowEndTimePicker(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, time) => {
                  setShowEndTimePicker(false);
                  if (time) setEndTime(time);
                }}
              />
            )}
          </>
        ) : (
          <>
            {/* Non-Event: Only show Deadline */}
            <Text style={styles.label}>Deadline</Text>
            <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>{endDate.toDateString()}</Text>
            </TouchableOpacity>
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(_, date) => {
                  setShowEndDatePicker(false);
                  if (date) setEndDate(date);
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
