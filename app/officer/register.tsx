import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../lib/supabase';

function generateRandomCode(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function OfficerRegisterEvent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [pointValue, setPointValue] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    setCode(generateRandomCode());
  }, []);

  const handleSubmit = async () => {
    const { error } = await supabase.from('events').insert([
      {
        title,
        description,
        location,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        point_value: parseInt(pointValue),
        code,
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
      setStartTime(new Date());
      setEndTime(new Date());
      setPointValue('');
      setCode(generateRandomCode());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>📝 Register a New Event</Text>
      <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={styles.input} />
      <TextInput placeholder="Location" value={location} onChangeText={setLocation} style={styles.input} />
      <Text style={styles.label}>Start Time:</Text>
      <DateTimePicker value={startTime} mode="datetime" display="default" onChange={(e, date) => date && setStartTime(date)} />
      <Text style={styles.label}>End Time:</Text>
      <DateTimePicker value={endTime} mode="datetime" display="default" onChange={(e, date) => date && setEndTime(date)} />
      <TextInput
        placeholder="Point Value"
        value={pointValue}
        onChangeText={setPointValue}
        keyboardType="numeric"
        style={styles.input}
      />
      <Text style={styles.label}>Attendance Code: {code}</Text>
      <Button title="Submit Event" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '600',
  },
});
