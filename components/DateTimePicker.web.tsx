/**
 * Web-compatible DateTimePicker Component
 * 
 * Provides native HTML5 date/time inputs for web platform
 * Falls back to @react-native-community/datetimepicker on mobile
 */

import * as React from 'react';
import { Platform, View, StyleSheet } from 'react-native';

interface DateTimePickerProps {
  value: Date;
  mode: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'calendar' | 'clock' | 'compact';
  minuteInterval?: number;
  onChange: (event: any, selectedDate?: Date) => void;
}

// Web implementation using HTML5 inputs
const WebDateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  mode,
  onChange,
  minuteInterval = 1,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    if (!newValue) return;

    let date: Date;
    if (mode === 'date') {
      date = new Date(newValue);
    } else if (mode === 'time') {
      const [hours, minutes] = newValue.split(':').map(Number);
      date = new Date(value);
      date.setHours(hours, minutes, 0, 0);
    } else {
      date = new Date(newValue);
    }

    onChange({ type: 'set', nativeEvent: {} }, date);
  };

  const formatValue = () => {
    if (mode === 'date') {
      return value.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (mode === 'time') {
      const hours = value.getHours().toString().padStart(2, '0');
      const minutes = value.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`; // HH:MM
    } else {
      return value.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    }
  };

  const inputType = mode === 'datetime' ? 'datetime-local' : mode;
  const inputProps: any = {
    type: inputType,
    value: formatValue(),
    onChange: handleChange,
    style: {
      padding: 12,
      fontSize: 16,
      borderRadius: 8,
      border: '1px solid #d1d5db',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      width: '100%',
    },
  };

  if (mode === 'time') {
    inputProps.step = minuteInterval * 60;
  }

  return (
    <View style={styles.webPickerContainer}>
      {React.createElement('input', inputProps)}
    </View>
  );
};

// Export platform-specific component
export const DateTimePicker: React.FC<DateTimePickerProps> = (props) => {
  if (Platform.OS === 'web') {
    return <WebDateTimePicker {...props} />;
  }

  // Use native DateTimePicker on mobile
  const NativeDateTimePicker = require('@react-native-community/datetimepicker').default;
  return <NativeDateTimePicker {...props} />;
};

const styles = StyleSheet.create({
  webPickerContainer: {
    marginTop: 8,
  },
});
