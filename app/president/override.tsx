import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput
} from 'react-native';
import { supabase } from '../../lib/supabase';

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

  useEffect(() => {
    // Fetch users
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('user_id, name');
      if (error) Alert.alert('Error fetching users');
      else setUsers(data as User[]);
    };

    // Fetch events
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .order('start_time', { ascending: false });
      if (error) Alert.alert('Error fetching events');
      else setEvents(data as Event[]);
    };

    fetchUsers();
    fetchEvents();
  }, []);

  const handleOverride = async () => {
    const numericPoints = parseInt(points);
    if (!selectedUser || isNaN(numericPoints) || !selectedEvent) {
      return Alert.alert('Error', 'Please fill out all fields correctly.');
    }

    // Get current admin (officer) ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Error', 'You must be logged in.');

    // Get the event details to get the point type
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('point_type')
      .eq('id', selectedEvent)
      .single();

    if (eventError || !eventData) {
      return Alert.alert('Error', 'Could not fetch event details.');
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
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Admin Point Override</Text>

      <Text style={styles.label}>Select User:</Text>
      <Picker
        selectedValue={selectedUser}
        onValueChange={setSelectedUser}
        style={[styles.picker, Platform.OS === 'ios' && { height: 200 }]}
        itemStyle={styles.pickerItem}
      >
        <Picker.Item label="Select a User" value="" />
        {users.map((u) => (
          <Picker.Item key={u.user_id} label={u.name} value={u.user_id} />
        ))}
      </Picker>

      <Text style={styles.label}>Select Event:</Text>
      <Picker
        selectedValue={selectedEvent}
        onValueChange={setSelectedEvent}
        style={[styles.picker, Platform.OS === 'ios' && { height: 200 }]}
        itemStyle={styles.pickerItem}
      >
        <Picker.Item label="Select an Event" value="" />
        {events.map((e) => (
          <Picker.Item key={e.id} label={e.title} value={e.id} />
        ))}
      </Picker>

      <Text style={styles.label}>Point Amount:</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 5 or -2"
        keyboardType="numeric"
        value={points}
        onChangeText={setPoints}
      />

      <Text style={styles.label}>Reason:</Text>
      <TextInput
        style={styles.input}
        placeholder="Reason (optional)"
        multiline
        value={reason}
        onChangeText={setReason}
      />

      <Button title="Submit Override" color="#330066" onPress={handleOverride} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 60,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#330066',
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    fontSize: 16,
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#000',
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
});
