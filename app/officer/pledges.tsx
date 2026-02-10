/**
 * Pledges Management Screen
 * 
 * Allows VP Pledge Ed to add and manage pledges (prospective members)
 * before they are registered as full users in the system.
 * 
 * @access VP Pledge Ed, Admin, President
 * @location app/officer/pledges.tsx
 * @route /officer/pledges
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Pledge {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  uid: string | null;
  dob: string | null;
  created_at: string;
}

export default function PledgesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [uid, setUid] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchPledges = async () => {
    try {
      const { data, error } = await supabase
        .from('pledges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPledges(data || []);
    } catch (error: any) {
      console.error('Error fetching pledges:', error);
      Alert.alert('Error', 'Failed to load pledges');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPledges();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPledges();
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhoneNumber('');
    setUid('');
    setDob(null);
  };

  const handleAddPledge = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (First Name, Last Name, Email)');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('pledges')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber.trim() || null,
          uid: uid.trim() || null,
          dob: dob ? dob.toISOString().split('T')[0] : null,
          created_by: user.id,
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('A pledge with this email already exists');
        }
        throw error;
      }

      Alert.alert('Success', 'Pledge added successfully');
      resetForm();
      setShowAddForm(false);
      fetchPledges();
    } catch (error: any) {
      console.error('Error adding pledge:', error);
      Alert.alert('Error', error.message || 'Failed to add pledge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePledge = (pledge: Pledge) => {
    Alert.alert(
      'Delete Pledge',
      `Are you sure you want to delete ${pledge.first_name} ${pledge.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('pledges')
                .delete()
                .eq('id', pledge.id);

              if (error) throw error;
              Alert.alert('Success', 'Pledge deleted successfully');
              fetchPledges();
            } catch (error: any) {
              console.error('Error deleting pledge:', error);
              Alert.alert('Error', 'Failed to delete pledge');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading pledges...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pledge Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Ionicons 
            name={showAddForm ? 'close' : 'add-circle'} 
            size={24} 
            color="white" 
          />
          <Text style={styles.addButtonText}>
            {showAddForm ? 'Cancel' : 'Add Pledge'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Add Form */}
        {showAddForm && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Add New Pledge</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor="#9980b3"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor="#9980b3"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor="#9980b3"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                placeholderTextColor="#9980b3"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>UID (University ID)</Text>
              <TextInput
                style={styles.input}
                value={uid}
                onChangeText={setUid}
                placeholder="Enter university ID"
                placeholderTextColor="#9980b3"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {dob ? dob.toLocaleDateString() : 'Select date of birth'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#330066" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dob || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setDob(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleAddPledge}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Add Pledge</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Pledges List */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            Current Pledges ({pledges.length})
          </Text>

          {pledges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#9980b3" />
              <Text style={styles.emptyText}>No pledges yet</Text>
              <Text style={styles.emptySubtext}>
                Add pledges to start tracking prospective members
              </Text>
            </View>
          ) : (
            pledges.map((pledge) => (
              <View key={pledge.id} style={styles.pledgeCard}>
                <View style={styles.pledgeHeader}>
                  <Text style={styles.pledgeName}>
                    {pledge.first_name} {pledge.last_name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeletePledge(pledge)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>

                <View style={styles.pledgeInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="mail-outline" size={16} color="#330066" />
                    <Text style={styles.infoText}>{pledge.email}</Text>
                  </View>

                  {pledge.phone_number && (
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={16} color="#330066" />
                      <Text style={styles.infoText}>{pledge.phone_number}</Text>
                    </View>
                  )}

                  {pledge.uid && (
                    <View style={styles.infoRow}>
                      <Ionicons name="card-outline" size={16} color="#330066" />
                      <Text style={styles.infoText}>UID: {pledge.uid}</Text>
                    </View>
                  )}

                  {pledge.dob && (
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={16} color="#330066" />
                      <Text style={styles.infoText}>
                        DOB: {new Date(pledge.dob).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color="#9980b3" />
                    <Text style={styles.infoTextSecondary}>
                      Added {new Date(pledge.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3f7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f3f7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#330066',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#330066',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#F7B910',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F7B910',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7B910',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#330066',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#330066',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f3f7',
    borderWidth: 2,
    borderColor: '#d8d0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#330066',
  },
  dateButton: {
    backgroundColor: '#f5f3f7',
    borderWidth: 2,
    borderColor: '#d8d0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#330066',
  },
  submitButton: {
    backgroundColor: '#330066',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#330066',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d8d0e0',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#330066',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9980b3',
    marginTop: 4,
  },
  pledgeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d8d0e0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pledgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d8d0e0',
  },
  pledgeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#330066',
  },
  deleteButton: {
    padding: 8,
  },
  pledgeInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#330066',
    fontWeight: '500',
  },
  infoTextSecondary: {
    fontSize: 13,
    color: '#9980b3',
    fontWeight: '500',
  },
});
