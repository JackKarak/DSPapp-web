// OfficerRegisterEvent.tsx
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
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';

function generateRandomCode(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function OfficerRegisterEvent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date());
  const [pointType, setPointType] = useState('brotherhood');
  const [code, setCode] = useState('');
  const [isPledgeAvailable, setIsPledgeAvailable] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    setCode(generateRandomCode());
  }, []);

  const handleSubmit = async () => {
    const { error } = await supabase.from('events').insert([
      {
        title,
        description,
        location,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        point_type: pointType,
        code,
        available_to_pledges: isPledgeAvailable,
        status: 'pending',
      },
    ]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Event created and pending approval.');
      setTitle('');
      setDescription('');
      setLocation('');
      setStartDateTime(new Date());
      setEndDateTime(new Date());
      setPointType('brotherhood');
      setIsPledgeAvailable(false);
      setCode(generateRandomCode());
    }
  };

  const showPicker = (type: 'start' | 'end', mode: 'date' | 'time') => {
    setMode(mode);
    type === 'start' ? setShowStartPicker(true) : setShowEndPicker(true);
  };

  const onDateChange = (
    selectedDate: Date | undefined,
    type: 'start' | 'end'
  ) => {
    const currentDate = selectedDate || (type === 'start' ? startDateTime : endDateTime);
    if (type === 'start') {
      const updated = new Date(startDateTime);
      mode === 'date'
        ? updated.setFullYear(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
        : updated.setHours(currentDate.getHours(), currentDate.getMinutes());
      setStartDateTime(updated);
      setShowStartPicker(Platform.OS === 'ios');
    } else {
      const updated = new Date(endDateTime);
      mode === 'date'
        ? updated.setFullYear(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
        : updated.setHours(currentDate.getHours(), currentDate.getMinutes());
      setEndDateTime(updated);
      setShowEndPicker(Platform.OS === 'ios');
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
          placeholderTextColor="#666"
        />

        <TextInput
          placeholder="Event Description"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
          multiline
          placeholderTextColor="#666"
        />

        <TextInput
          placeholder="Location"
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Start Date & Time:</Text>
        <TouchableOpacity onPress={() => showPicker('start', 'date')} style={styles.dateButton}>
          <Text style={styles.dateText}>{startDateTime.toLocaleDateString()}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => showPicker('start', 'time')} style={styles.dateButton}>
          <Text style={styles.dateText}>
            {startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>End Date & Time:</Text>
        <TouchableOpacity onPress={() => showPicker('end', 'date')} style={styles.dateButton}>
          <Text style={styles.dateText}>{endDateTime.toLocaleDateString()}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => showPicker('end', 'time')} style={styles.dateButton}>
          <Text style={styles.dateText}>
            {endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {(showStartPicker || showEndPicker) && (
          <DateTimePicker
            value={showStartPicker ? startDateTime : endDateTime}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) =>
              onDateChange(selectedDate, showStartPicker ? 'start' : 'end')
            }
            textColor={Platform.OS === 'ios' ? '#000' : undefined}
          />
        )}

        <Text style={styles.label}>Point Type:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={pointType}
            onValueChange={setPointType}
            dropdownIconColor="#330066"
            style={{ color: '#000' }}
            itemStyle={{ color: '#000' }}
          >
            <Picker.Item label="Brotherhood" value="brotherhood" />
            <Picker.Item label="Service" value="service" />
            <Picker.Item label="Professionalism" value="professionalism" />
            <Picker.Item label="Scholarship" value="scholarship" />
            <Picker.Item label="DEI" value="dei" />
            <Picker.Item label="Health & Wellness" value="h&w" />
            <Picker.Item label="Fundraising" value="fundraising" />
          </Picker>
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Available to Pledges?</Text>
          <Switch value={isPledgeAvailable} onValueChange={setIsPledgeAvailable} />
        </View>

        <Text style={styles.label}>
          Attendance Code: <Text style={styles.code}>{code}</Text>
        </Text>

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
    color: '#000',
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
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  dateButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  dateText: {
    color: '#000',
    fontSize: 16,
  },
});
