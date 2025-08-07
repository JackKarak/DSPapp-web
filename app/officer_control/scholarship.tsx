import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type TestbankEntry = {
  id: string;
  submitted_by: string;
  class_code: string;
  file_type: string;
  original_file_name: string;
  stored_file_name: string;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  users?: { name: string };
};

export default function TestbankScreen() {
  const [entries, setEntries] = useState<TestbankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestbankEntries();
  }, []);

  const fetchTestbankEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('test_bank')
        .select(`*, users:submitted_by (name)`) // join user name
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: false });
      if (error) throw error;

      const formattedEntries = (data || []).map(entry => ({
        ...entry,
        submitted_by: entry.users?.name || 'Unknown',
      }));

      setEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching testbank entries:', error);
      Alert.alert('Error', 'Failed to load testbank entries');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('test_bank')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Entry approved');
      fetchTestbankEntries();
    } catch (error) {
      console.error('Error approving entry:', error);
      Alert.alert('Error', 'Failed to approve entry');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('test_bank')
        .delete()
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Entry deleted');
      fetchTestbankEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      Alert.alert('Error', 'Failed to delete entry');
    }
  };

  const renderItem = ({ item }: { item: TestbankEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.courseCode}>{item.class_code}</Text>
        <Text style={styles.date}>
          {new Date(item.uploaded_at).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.detail}>File Type: {item.file_type}</Text>
      <Text style={styles.detail}>Original File: {item.original_file_name}</Text>
      <Text style={styles.detail}>Submitted by: {item.submitted_by}</Text>
      <TouchableOpacity
        onPress={() => {
          // You may want to generate a public URL here if using Supabase Storage
          Alert.alert('File', item.stored_file_name);
        }}
      >
        <Text style={[styles.detail, { color: '#007AFF', textDecorationLine: 'underline' }]}>Download/View File</Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.approveButton]}
          onPress={() => handleApprove(item.id)}
        >
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.rejectButton]}
          onPress={() => handleReject(item.id)}
        >
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#330066" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Pending Test Bank Entries</Text>
      {entries.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No pending entries</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#330066',
    padding: 16,
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330066',
  },
  date: {
    color: '#666',
    fontSize: 14,
  },
  detail: {
    fontSize: 16,
    color: '#444',
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
