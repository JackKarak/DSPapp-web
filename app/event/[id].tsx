import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function EventDetail() {
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(error);
        Alert.alert('Error', 'Could not load event.');
      } else {
        setEvent(data);
      }

      setLoading(false);
    };

    if (id) fetchEvent();
  }, [id]);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 50 }} size="large" />;
  }

  if (!event) {
    return <Text style={styles.message}>Event not found</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.detail}>🗓 {new Date(event.start_time).toLocaleString()} — {new Date(event.end_time).toLocaleString()}</Text>
      <Text style={styles.detail}>📍 {event.location}</Text>
      <Text style={styles.detail}>🎯 Points: {event.point_value}</Text>
      <Text style={styles.description}>{event.description}</Text>

      <Button
        title="Register (coming soon)"
        onPress={() => Alert.alert('👍', 'Registration will be added soon!')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  detail: { fontSize: 16, marginBottom: 6 },
  description: { fontSize: 16, marginVertical: 12, lineHeight: 22 },
  message: { padding: 20, fontSize: 18 },
});
