import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Event = {
  id: string;
  title: string;
  date: string;
  host_name?: string;
};

export default function AccountTab() {
  const [name, setName] = useState<string | null>(null);
  const [pledgeClass, setPledgeClass] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState(false);

  const toggleExpanded = () => setExpanded((prev) => !prev);

  const fetchAccountData = async () => {
    setLoading(true);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      Alert.alert('Error', 'Unable to load user session.');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('name, pledge_class, approved')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      Alert.alert('Error', 'Unable to fetch user profile.');
      setLoading(false);
      return;
    }

    if (!profile.approved) {
      Alert.alert('Pending Approval', 'Your account is awaiting approval.');
      setLoading(false);
      return;
    }

    setName(profile.name);
    setPledgeClass(profile.pledge_class);

    const { data: attendedEvents, error: eventError } = await supabase
      .from('event_attendance')
      .select('id, events(title, start_time, creator:created_by(name))')
      .eq('user_id', user.id);

    if (eventError) {
      console.error('Event fetch error:', eventError.message);
    } else {
      const formatted: Event[] = (attendedEvents || []).map((record: any) => ({
        id: record.id,
        title: record.events?.title,
        date: record.events?.start_time,
        host_name: record.events?.creator?.name ?? 'N/A',
      }));

      formatted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(formatted);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const saveProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('users')
      .update({ name, pledge_class: pledgeClass })
      .eq('user_id', user?.id);

    if (error) {
      Alert.alert('Error', 'Could not update profile.');
    } else {
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    }
  };

  const submitFeedback = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!feedback.trim()) return;

    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id,
      content: feedback,
    });

    if (error) {
      Alert.alert('Error', 'Could not send feedback.');
    } else {
      Alert.alert('Thanks!', 'Your feedback was submitted.');
      setFeedback('');
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout Failed', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeader}>Account Details</Text>

        {editing ? (
          <>
            <TextInput
              style={styles.input}
              value={name ?? ''}
              onChangeText={setName}
              placeholder="Name"
            />
            <TextInput
              style={styles.input}
              value={pledgeClass ?? ''}
              onChangeText={setPledgeClass}
              placeholder="Pledge Class"
            />
            <TouchableOpacity style={styles.button} onPress={saveProfile}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.meta}>Name: {name ?? '---'}</Text>
            <Text style={styles.meta}>Pledge Class: {pledgeClass ?? '---'}</Text>
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.link}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.meta}>Events Attended: {events.length}</Text>

        <Text style={styles.sectionHeader}>Event Attendance Log</Text>
        <TouchableOpacity onPress={toggleExpanded}>
          <Text style={styles.toggleText}>
            {expanded ? 'Hide Event Log ▲' : 'Show Event Log ▼'}
          </Text>
        </TouchableOpacity>

        {expanded && (
          loading ? (
            <ActivityIndicator size="large" color="#330066" />
          ) : events.length === 0 ? (
            <Text style={styles.noContent}>No attended events found.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableRowHeader}>
                <Text style={styles.cellHeader}>Title</Text>
                <Text style={styles.cellHeader}>Date</Text>
                <Text style={styles.cellHeader}>Organizer</Text>
              </View>
              {events.map((event) => (
                <View key={event.id} style={styles.tableRow}>
                  <Text style={styles.cell}>{event.title}</Text>
                  <Text style={styles.cell}>
                    {new Date(event.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.cell}>{event.host_name}</Text>
                </View>
              ))}
            </View>
          )
        )}

        <Text style={styles.sectionHeader}>Submit Feedback</Text>
        <TextInput
          style={styles.input}
          placeholder="Your suggestion or comment..."
          value={feedback}
          onChangeText={setFeedback}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={submitFeedback}>
          <Text style={styles.buttonText}>Send Feedback</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Help & Account</Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Alert.alert('Contact Tech Chair', 'Email techchair@fraternity.org')}
        >
          <Text style={styles.link}>Contact Tech Chair</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={handleLogout}>
          <Text style={[styles.link, { color: 'red' }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 100 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330066',
    marginTop: 20,
    marginBottom: 10,
  },
  meta: { fontSize: 16, color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#0038A8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { color: '#007AFF', fontSize: 15 },
  linkButton: { marginTop: 10 },
  toggleText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  noContent: { fontSize: 14, color: '#888', textAlign: 'center', marginVertical: 10 },
  table: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEF1FF',
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingVertical: 8,
  },
  cellHeader: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
    color: '#0038A8',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
  },
});
