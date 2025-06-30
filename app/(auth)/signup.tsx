import { useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [pledgeClass, setPledgeClass] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignup = async () => {
    if (!name || !pledgeClass || !email || !password) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !signUpData?.user) {
      setLoading(false);
      Alert.alert('Signup Error', signUpError?.message || 'Signup failed.');
      return;
    }

    // Store temporary info for post-confirmation profile insert
    await AsyncStorage.setItem('temp_name', name);
    await AsyncStorage.setItem('temp_pledge_class', pledgeClass);

    setLoading(false);

    Alert.alert('Success!', 'Check your email to confirm your signup.');
    router.replace('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Back Button */}
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

        <TextInput
          placeholder="Pledge Class (e.g., Fall 2024)"
          value={pledgeClass}
          onChangeText={setPledgeClass}
          style={styles.input}
          placeholderTextColor="#999"
        />

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
