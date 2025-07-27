import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [pledgeClass, setPledgeClass] = useState('rho');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('brother');
  const [graduationYear, setGraduationYear] = useState('');
  const [major, setMajor] = useState('');
  const [officerPosition, setOfficerPosition] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignup = async () => {
    if (!name || !pledgeClass || !email || !password || !role || !graduationYear || !major) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    if (role === 'officer' && !officerPosition) {
      Alert.alert('Missing Officer Role', 'Please select an officer position.');
      return;
    }

    setLoading(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError || !signUpData?.user?.id) {
        throw new Error(signUpError?.message || 'Signup failed.');
      }

      const userId = signUpData.user.id;

      const { error: insertError } = await supabase.from('users').insert({
        user_id: userId,
        email,
        name,
        pledge_class: pledgeClass,
        role,
        major,
        graduation_year: graduationYear,
        officer_position: role === 'officer' ? officerPosition : null,
        approved: false,
      });

      if (insertError) {
        console.error('Insert failed:', insertError.message);
        throw new Error('Could not create user profile.');
      }

      if (!signUpData.session) {
        Alert.alert('Success!', 'Check your email to confirm your signup.');
      } else {
        Alert.alert('Success!', 'Your account was created.');
      }

      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Signup Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create an Account</Text>

        <TextInput
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Pledge Class</Text>
        <Picker
          selectedValue={pledgeClass}
          onValueChange={setPledgeClass}
          style={[styles.picker, Platform.OS === 'ios' && { height: 200 }]}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Rho" value="rho" />
          <Picker.Item label="Sigma" value="sigma" />
          <Picker.Item label="Tau" value="tau" />
          <Picker.Item label="Upsilon" value="upsilon" />
          <Picker.Item label="Phi" value="phi" />
          <Picker.Item label="Chi" value="chi" />
        </Picker>

        <Text style={styles.label}>Role</Text>
        <Picker
          selectedValue={role}
          onValueChange={setRole}
          style={[styles.picker, Platform.OS === 'ios' && { height: 200 }]}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Brother" value="brother" />
          <Picker.Item label="Officer" value="officer" />
          <Picker.Item label="Admin" value="admin" />
        </Picker>

        <Text style={styles.label}>Graduation Year</Text>
        <TextInput
          placeholder="e.g. 2026"
          value={graduationYear}
          onChangeText={setGraduationYear}
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Major</Text>
        <TextInput
          placeholder="e.g. Finance"
          value={major}
          onChangeText={setMajor}
          style={styles.input}
          placeholderTextColor="#999"
        />

        {role === 'officer' && (
          <>
            <Text style={styles.label}>Officer Position</Text>
            <Picker
              selectedValue={officerPosition}
              onValueChange={setOfficerPosition}
              style={[styles.picker, Platform.OS === 'ios' && { height: 200 }]}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Select Position" value="" />
              <Picker.Item label="Social" value="social" />
              <Picker.Item label="Marketing" value="marketing" />
              <Picker.Item label="Wellness" value="wellness" />
              <Picker.Item label="Fundraising" value="fundraising" />
              <Picker.Item label="Brotherhood" value="brotherhood" />
              <Picker.Item label="Risk" value="risk" />
              <Picker.Item label="Historian" value="historian" />
              <Picker.Item label="Chancellor" value="chancellor" />
              <Picker.Item label="SVP" value="svp" />
              <Picker.Item label="Operations" value="vp_operations" />
              <Picker.Item label="Finance" value="vp_finance" />
              <Picker.Item label="Pledge Ed" value="vp_pledge_ed" />
              <Picker.Item label="Scholarship" value="vp_scholarship" />
              <Picker.Item label="Branding" value="vp_branding" />
              <Picker.Item label="Community Service" value="vp_service" />
              <Picker.Item label="DEI" value="vp_dei" />
              <Picker.Item label="Professional" value="vp_professional" />
            </Picker>
          </>
        )}

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          onPress={handleSignup}
          style={[styles.button, loading && styles.buttonDisabled]}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing Up...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'stretch',
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 16,
    color: '#330066',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#000',
  },
  label: {
    marginBottom: 6,
    marginTop: 6,
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
  },
  picker: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  pickerItem: {
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#330066',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
