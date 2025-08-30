import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// Custom Dropdown Component
interface DropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => void;
}

const CustomDropdown: React.FC<DropdownProps> = ({ label, value, options, onValueChange }) => {
  const [isVisible, setIsVisible] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownButtonText} numberOfLines={1}>
          {selectedOption?.label || 'Select...'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
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

// Type definitions
type User = {
  user_id: string;
  name: string;
};

type Event = {
  id: string;
  title: string;
};

export default function AdminPointOverride() {
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Check authentication first
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .eq('approved', true);

      if (usersError) {
        Alert.alert('Users Error', 'Unable to load users. Please try again.');
      } else {
        const formattedUsers = usersData.map((u: any) => ({
          user_id: u.user_id,
          name: u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : 'Unknown User'
        }));
        setUsers(formattedUsers);
      }

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title')
        .order('start_time', { ascending: false });

      if (eventsError) {
        Alert.alert('Events Error', 'Unable to load events. Please try again.');
      } else {
        setEvents(eventsData as Event[]);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    }
  };

  const handleOverride = async () => {
    const numericPoints = parseInt(points);
    if (!selectedUser || isNaN(numericPoints) || !selectedEvent || !reason.trim()) {
      return Alert.alert('Error', 'Please fill out all fields correctly.');
    }

    setLoading(true);

    try {
      // Get current admin (officer) ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Authentication Error', 'You must be logged in.');
        return;
      }

      // Get the event details to get the point type
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('point_type')
        .eq('id', selectedEvent)
        .single();

      if (eventError || !eventData) {
        Alert.alert('Error', 'Could not fetch event details.');
        return;
      }

      const { error } = await supabase.from('points').insert([
        {
          user_id: selectedUser,
          point_type: eventData.point_type,
          value: numericPoints,
          reason,
          event_id: selectedEvent,
          admin_id: user.id,
        },
      ]);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Points successfully overridden.');
        setSelectedUser('');
        setSelectedEvent('');
        setPoints('');
        setReason('');
      }
    } catch (error) {
      console.error('Error in handleOverride:', error);
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Admin Point Override</Text>
      <Text style={styles.subtitle}>Manually adjust points for members</Text>

      <CustomDropdown
        label="Select User"
        value={selectedUser}
        options={[
          { label: 'Select a User', value: '' },
          ...users.map((u) => ({
            label: u.name,
            value: u.user_id
          }))
        ]}
        onValueChange={(value) => setSelectedUser(value)}
      />

      <CustomDropdown
        label="Select Event"
        value={selectedEvent}
        options={[
          { label: 'Select an Event', value: '' },
          ...events.map((e) => ({
            label: e.title,
            value: e.id
          }))
        ]}
        onValueChange={(value) => setSelectedEvent(value)}
      />

      <Text style={styles.label}>Point Amount</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 5 or -2 (negative for deduction)"
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
        value={points}
        onChangeText={setPoints}
      />

      <Text style={styles.label}>Reason</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Explain the reason for this point adjustment..."
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={3}
        value={reason}
        onChangeText={setReason}
      />

      <TouchableOpacity 
        style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
        onPress={handleOverride}
        disabled={loading}
        activeOpacity={0.7}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Processing...' : 'Submit Override'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 20,
    paddingBottom: 60,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  // Custom Dropdown Styles
  dropdownContainer: {
    marginBottom: 20,
  },
  dropdownButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedOption: {
    backgroundColor: '#f0f9ff',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  selectedOptionText: {
    color: '#0369a1',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#0369a1',
    fontWeight: '700',
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    color: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowColor: '#000',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
