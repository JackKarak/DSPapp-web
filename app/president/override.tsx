import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  Button,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';

// Type definitions
type User = {
  id: string;
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
  const [pointType, setPointType] = useState('brotherhood');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    // Fetch users
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('id, name');
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

    const { error } = await supabase.from('points').insert([
      {
        user_id: selectedUser,
        point_type: pointType,
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
      setPointType('brotherhood');
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
        style={styles.input}
      >
        <Picker.Item label="Select a User" value="" />
        {users.map((u) => (
          <Picker.Item key={u.id} label={u.name} value={u.id} />
        ))}
      </Picker>

      <Text style={styles.label}>Select Event:</Text>
      <Picker
        selectedValue={selectedEvent}
        onValueChange={setSelectedEvent}
        style={styles.input}
      >
        <Picker.Item label="Select an Event" value="" />
        {events.map((e) => (
          <Picker.Item key={e.id} label={e.title} value={e.id} />
        ))}
      </Picker>

      <Text style={styles.label}>Point Type:</Text>
      <Picker
        selectedValue={pointType}
        onValueChange={setPointType}
        style={styles.input}
      >
        <Picker.Item label="Brotherhood" value="brotherhood" />
        <Picker.Item label="Service" value="service" />
        <Picker.Item label="Professionalism" value="professionalism" />
        <Picker.Item label="Scholarship" value="scholarship" />
        <Picker.Item label="DEI" value="dei" />
        <Picker.Item label="Health & Wellness" value="h&w" />
        <Picker.Item label="Fundraising" value="fundraising" />
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
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#330066',
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    color: '#0038A8',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
});
