import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData?.user) {
        throw new Error(authError?.message || 'Unable to sign in.');
      }

      const userId = authData.user.id;

      // 1. Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        // 2. Try to get stored values from AsyncStorage
        const name = await AsyncStorage.getItem('temp_name');
        const pledgeClass = await AsyncStorage.getItem('temp_pledge_class');

        if (name && pledgeClass) {
          const { error: insertError } = await supabase.from('users').insert({
            user_id: userId,
            email,
            name,
            pledge_class: pledgeClass,
            role: 'brother',
            approved: false,
          });

          if (insertError) {
            console.error('Insert failed:', insertError.message);
            throw new Error('Could not complete profile setup.');
          }

          // 3. Clean up temp data
          await AsyncStorage.removeItem('temp_name');
          await AsyncStorage.removeItem('temp_pledge_class');
        } else {
          throw new Error('Missing temporary profile information.');
        }
      }

      // 4. Now fetch the profile again to check approval
      const { data: finalProfile, error: finalProfileError } = await supabase
        .from('users')
        .select('approved')
        .eq('user_id', userId)
        .single();

      if (finalProfileError || !finalProfile) {
        throw new Error('Profile not found.');
      }

      if (!finalProfile.approved) {
        Alert.alert('Pending Approval', 'Your account is not approved yet.');
        return;
      }

      // 5. Navigate to the main app
      router.replace('/(tabs)/calendar');
    } catch (error: any) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToSignUp = () => {
    router.push('/(auth)/signup');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text variant="headlineMedium" style={styles.title}>
        DSP Login
      </Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        style={styles.input}
        disabled={loading}
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        style={styles.input}
        disabled={loading}
      />

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Log In
      </Button>

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account?</Text>
        <Button onPress={goToSignUp} mode="text" disabled={loading}>
          Sign Up
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  signupContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupText: {
    marginBottom: 4,
    color: '#666',
  },
});
