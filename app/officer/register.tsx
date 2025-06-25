import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';

function generateRandomCode(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function OfficerRegisterEvent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [pointValue, setPointValue] = useState('');
  const [code, setCode] = useState('');
  const [isPledgeAvailable, setIsPledgeAvailable] = useState(false);

  useEffect(() => {
    setCode(generateRandomCode());
  }, []);

  const handleSubmit = async () => {
    const eventDate = new Date(date);
    const startDateTime = new Date(eventDate);
    const endDateTime = new Date(eventDate);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes());
    endDateTime.setHours(endTime.getHours(), endTime.getMinutes());

    const { error } = await supabase.from('events').insert([
      {
        title,
        description,
        location,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        point_value: parseInt(pointValue),
        code,
        available_to_pledges: isPledgeAvailable,
        status: 'pending',
      },
    ]);

    if (error) {
      console.error(error);
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Event created and pending approval.');
      setTitle('');
      setDescription('');
      setLocation('');
      setDate(new Date());
      setStartTime(new Date());
      setEndTime(new Date());
      setPointValue('');
      setIsPledgeAvailable(false);
      setCode(generateRandomCode());
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.formWrapper}>
        <Text style={styles.heading}>📝 Register a New Event</Text>

        <TextInput
          placeholder="Event Title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <TextInput
          placeholder="Event Description"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
          multiline
        />

        <TextInput
          placeholder="Location"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
        />

        <Text style={styles.label}>Event Date:</Text>
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, d) => d && setDate(d)}
        />

        <Text style={styles.label}>Start Time:</Text>
        <DateTimePicker
          value={startTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, t) => t && setStartTime(t)}
        />

        <Text style={styles.label}>End Time:</Text>
        <DateTimePicker
          value={endTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, t) => t && setEndTime(t)}
        />

        <TextInput
          placeholder="Point Value"
          value={pointValue}
          onChangeText={setPointValue}
          keyboardType="numeric"
          style={styles.input}
        />

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Available to Pledges?</Text>
          <Switch
            value={isPledgeAvailable}
            onValueChange={setIsPledgeAvailable}
          />
        </View>

        <Text style={styles.label}>Attendance Code: <Text style={styles.code}>{code}</Text></Text>

        <Button title="Submit Event" color="#330066" onPress={handleSubmit} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  formWrapper: {
    backgroundColor: '#ffffffcc',
    padding: 20,
    borderRadius: 12,
    borderColor: '#ADAFAA',
    borderWidth: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#330066',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
    color: '#0038A8',
  },
  code: {
    color: '#F7B910',
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
