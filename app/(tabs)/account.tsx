import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Event } from '../../types/account';

const EventRow: React.FC<{ event: Event }> = React.memo(({ event }) => (
  <View style={styles.tableRow}>
    <Text style={styles.cell}>{event.title}</Text>
    <Text style={styles.cell}>
      {new Date(event.date).toLocaleDateString()}
    </Text>
    <Text style={styles.cell}>{event.host_name}</Text>
  </View>
));

export default function AccountTab() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [pledgeClass, setPledgeClass] = useState<string | null>(null);
  const [major, setMajor] = useState<string | null>(null);
  const [graduationYear, setGraduationYear] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTestBankForm, setShowTestBankForm] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [fileType, setFileType] = useState<'test' | 'notes' | 'materials'>('test');
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  const fetchAccountData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unable to load user session.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name, pledge_class, major, graduation_year')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Unable to fetch user profile.');
      }

      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setPledgeClass(profile.pledge_class);
      setMajor(profile.major);
      setGraduationYear(profile.graduation_year?.toString() || '');

      const { data: attendedEvents, error: eventError } = await supabase
        .from('event_attendance')
        .select('id, events(title, start_time, creator:created_by(name))')
        .eq('user_id', user.id);

      if (eventError) {
        console.error('Event fetch error:', eventError.message);
        throw new Error('Failed to fetch events');
      }

      const formatted: Event[] = (attendedEvents || []).map((record: any) => ({
        id: record.id,
        title: record.events?.title,
        date: record.events?.start_time,
        host_name: record.events?.creator?.name ?? 'N/A',
      }));

      formatted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      Alert.alert('Error', err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  const saveProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
        pledge_class: pledgeClass,
        major,
        graduation_year: graduationYear
      })
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

    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      Alert.alert('Error', 'Please fill in both subject and message.');
      return;
    }

    const { error } = await supabase.from('admin_feedback').insert({
      user_id: user?.id,
      subject: feedbackSubject,
      message: feedbackMessage,
      submitted_at: new Date().toISOString()
    });

    if (error) {
      Alert.alert('Error', 'Could not send feedback.');
    } else {
      Alert.alert('Thanks!', 'Your feedback was submitted.');
      setFeedbackSubject('');
      setFeedbackMessage('');
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout Failed', error.message);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const handleTestBankSubmission = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      if (!classCode || !fileType || !selectedFile) {
        Alert.alert('Error', 'Please fill in all required fields and select a file');
        return;
      }

      // In a real implementation, you would upload the file to Supabase Storage here
      // For now, we'll just create the database entry with the file name
      const storedFileName = `${classCode}_${fileType}_${Date.now()}_${selectedFile.name}`;

      const { error } = await supabase
        .from('test_bank')
        .insert({
          submitted_by: user.id,
          class_code: classCode.toUpperCase(),
          file_type: fileType,
          original_file_name: selectedFile.name,
          stored_file_name: storedFileName,
          status: 'pending',
          uploaded_at: new Date().toISOString()
        });

      if (error) throw error;

      Alert.alert('Success', 'Your submission has been received and is pending review');
      setShowTestBankForm(false);
      setClassCode('');
      setFileType('test');
      setSelectedFile(null);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit');
    }
  };

  const renderProfileSection = useMemo(() => (
    editing ? (
      <>
        <TextInput
          style={styles.input}
          value={firstName ?? ''}
          onChangeText={setFirstName}
          placeholder="First Name"
        />
        <TextInput
          style={styles.input}
          value={lastName ?? ''}
          onChangeText={setLastName}
          placeholder="Last Name"
        />
        <TextInput
          style={styles.input}
          value={pledgeClass ?? ''}
          onChangeText={setPledgeClass}
          placeholder="Pledge Class"
        />
        <TextInput
          style={styles.input}
          value={major ?? ''}
          onChangeText={setMajor}
          placeholder="Major"
        />
        <TextInput
          style={styles.input}
          value={graduationYear ?? ''}
          onChangeText={setGraduationYear}
          placeholder="Graduation Year"
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.button} onPress={saveProfile}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </>
    ) : (
      <>
        <View style={styles.profileInfo}>
          <Text style={styles.meta}>Name: {firstName && lastName ? `${firstName} ${lastName}` : '---'}</Text>
          <Text style={styles.meta}>Pledge Class: {pledgeClass ?? '---'}</Text>
          <Text style={styles.meta}>Major: {major ?? '---'}</Text>
          <Text style={styles.meta}>Graduation Year: {graduationYear ?? '---'}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
          <Text style={styles.link}>Edit Profile</Text>
        </TouchableOpacity>
      </>
    )
  ), [editing, firstName, lastName, pledgeClass, major, graduationYear, saveProfile]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeader}>Account Details</Text>
        {renderProfileSection}

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
                <EventRow key={event.id} event={event} />
              ))}
            </View>
          )
        )}

        <Text style={styles.sectionHeader}>Submit Feedback</Text>
        <TextInput
          style={styles.input}
          placeholder="Subject"
          value={feedbackSubject}
          onChangeText={setFeedbackSubject}
        />
        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Your suggestion or comment..."
          value={feedbackMessage}
          onChangeText={setFeedbackMessage}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={submitFeedback}>
          <Text style={styles.buttonText}>Send Feedback</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Test Bank Submission</Text>
        {!showTestBankForm ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#4CAF50' }]}
            onPress={() => setShowTestBankForm(true)}
          >
            <Text style={styles.buttonText}>Add to Test Bank</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              value={classCode}
              onChangeText={setClassCode}
              placeholder="Course Code (e.g., BMGT402)"
              autoCapitalize="characters"
            />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={fileType}
                onValueChange={(value: 'test' | 'notes' | 'materials') => setFileType(value)}
                style={styles.picker}
              >
                <Picker.Item label="Test/Exam" value="test" />
                <Picker.Item label="Notes" value="notes" />
                <Picker.Item label="Course Materials" value="materials" />
              </Picker>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#888', marginBottom: 6 }]}
              onPress={handlePickFile}
            >
              <Text style={styles.buttonText}>{selectedFile ? 'Change File' : 'Choose File'}</Text>
            </TouchableOpacity>
            {selectedFile && (
              <Text style={{ marginBottom: 8, color: '#333', fontSize: 14 }}>Selected: {selectedFile.name}</Text>
            )}
            <TouchableOpacity
              style={[styles.button, { marginTop: 10 }]}
              onPress={handleTestBankSubmission}
            >
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#666' }]}
              onPress={() => { setShowTestBankForm(false); setSelectedFile(null); }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

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
  // Layout
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  content: { 
    padding: 16, 
    paddingBottom: 100 
  },
  profileInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  formContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  picker: {
    height: Platform.OS === 'ios' ? 200 : 50,
    width: '100%',
    color: '#000000', // Ensures text is visible
    backgroundColor: '#fff',
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  
  // Typography
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330066',
    marginTop: 20,
    marginBottom: 10,
  },
  meta: { fontSize: 16, color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginBottom: 10,
    color: '#000',
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