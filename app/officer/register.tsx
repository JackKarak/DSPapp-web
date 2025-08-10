import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import {
    Alert,
    Button,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function OfficerRegisterEvent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [pointType, setPointType] = useState('none');
  const [noPointEvent, setNoPointEvent] = useState(false);
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

  function roundToNearestMinute(date: Date) {
    const rounded = new Date(date);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
  }

  const handleSubmit = async () => {
    if (!title || !location || (!noPointEvent && !pointType)) {
      Alert.alert('Please fill out all required fields');
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('Error', 'User not authenticated');
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

    const eventPointType = noPointEvent ? 'No Point' : pointType;
    const eventPointValue = noPointEvent ? 0 : 1;

    const { error } = await supabase.from('events').insert({
      title,
      description,
      location,
      point_type: eventPointType,
      point_value: eventPointValue,
      start_time: roundedStart.toISOString(),
      end_time: roundedEnd.toISOString(),
      created_by: user.id, // Using user.id from auth, which maps to user_id in users table
      is_registerable: isRegisterable,
      available_to_pledges: availableToPledges,
      status: 'pending',
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Event created successfully');
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
      setNoPointEvent(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Register New Event</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter title"
          placeholderTextColor="#000"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter location"
          placeholderTextColor="#000"
          value={location}
          onChangeText={setLocation}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Enter description"
          placeholderTextColor="#000"
          value={description}
          multiline
          onChangeText={setDescription}
        />

        <View style={styles.switchRow}>
          <Text>No Point Event?</Text>
          <Switch value={noPointEvent} onValueChange={setNoPointEvent} />
        </View>

        {!noPointEvent && (
          <>
            <Text style={styles.label}>Point Type</Text>
            <Picker
              selectedValue={pointType}
              onValueChange={(itemValue) => setPointType(itemValue)}
              style={[styles.picker, Platform.OS === 'ios' && { height: 200 }]}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Select point type" value="none" />
              <Picker.Item label="Brotherhood" value="brotherhood" />
              <Picker.Item label="Professional" value="professional" />
              <Picker.Item label="Service" value="service" />
              <Picker.Item label="Scholarship" value="scholarship" />
              <Picker.Item label="Health" value="health" />
              <Picker.Item label="Fundraising" value="fundraising" />
              <Picker.Item label="DEI" value="dei" />
            </Picker>
          </>
        )}

        <View style={styles.switchRow}>
          <Text>Registerable Event?</Text>
          <Switch value={isRegisterable} onValueChange={setIsRegisterable} />
        </View>

        <View style={styles.switchRow}>
          <Text>Available to Pledges?</Text>
          <Switch value={availableToPledges} onValueChange={setAvailableToPledges} />
        </View>

        <View style={styles.switchRow}>
          <Text>Is this a multi-day event?</Text>
          <Switch value={isMultiDay} onValueChange={setIsMultiDay} />
        </View>

        <Text style={styles.label}>Start Date:</Text>
        <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.pickerButton}>
          <Text>{startDate.toDateString()}</Text>
        </TouchableOpacity>
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowStartDatePicker(false);
              if (date) setStartDate(date);
            }}
          />
        )}

        {isMultiDay && (
          <>
            <Text style={styles.label}>End Date:</Text>
            <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.pickerButton}>
              <Text>{endDate.toDateString()}</Text>
            </TouchableOpacity>
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={(_, date) => {
                  setShowEndDatePicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}
          </>
        )}

        <Text style={styles.label}>Start Time:</Text>
        <TouchableOpacity onPress={() => setShowStartTimePicker(true)} style={styles.pickerButton}>
          <Text>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </TouchableOpacity>
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            minuteInterval={15}
            is24Hour={false}
            display="default"
            onChange={(_, time) => {
              setShowStartTimePicker(false);
              if (time) setStartTime(time);
            }}
          />
        )}

        <Text style={styles.label}>End Time:</Text>
        <TouchableOpacity onPress={() => setShowEndTimePicker(true)} style={styles.pickerButton}>
          <Text>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </TouchableOpacity>
        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            minuteInterval={15}
            is24Hour={false}
            display="default"
            onChange={(_, time) => {
              setShowEndTimePicker(false);
              if (time) setEndTime(time);
            }}
          />
        )}

        <View style={{ marginVertical: 20 }}>
          <Button title="Submit Event" onPress={handleSubmit} color="#0038A8" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 60,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#330066',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderColor: '#ADAFAA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: '#000',
  },
  label: {
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    fontSize: 16,
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
    borderColor: '#ADAFAA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f1f1f1',
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
});
