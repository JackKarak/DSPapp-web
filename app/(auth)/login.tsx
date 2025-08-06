import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting login for email:', email);
      
      // Step 1: Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData?.user) {
        console.error('Auth error:', authError);
        throw new Error(authError?.message || 'Unable to sign in.');
      }

      const userId = authData.user.id;
      console.log('Successfully authenticated user:', userId);

      // Step 2: Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('Profile query result:', { profile, profileError });

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          throw new Error('No user profile found. Please complete the signup process first.');
        } else {
          console.error('Profile fetch error:', profileError);
          throw new Error(`Profile fetch failed: ${profileError.message}`);
        }
      }

      if (!profile) {
        throw new Error('User profile is empty. Please contact support.');
      }

      const { role } = profile;
      console.log('User role:', role);

      // Step 3: Navigate based on role
      switch (role) {
        case 'officer':
          router.replace('/officer/officerindex');
          break;
        case 'admin':
          router.replace('/president/presidentindex');
          break;
        default:
          router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToSignUp = () => {
    router.push('/(auth)/signup');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first.');
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'your-app://reset-password', // You can customize this URL
      });

      if (error) {
        throw new Error(error.message);
      }

      Alert.alert(
        'Reset Email Sent',
        'Check your email for a password reset link. If you don\'t see it, check your spam folder.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Reset Error', error.message);
    } finally {
      setResetLoading(false);
    }
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
        disabled={loading || resetLoading}
        style={styles.button}
      >
        Log In
      </Button>

      <Button
        onPress={handleForgotPassword}
        mode="text"
        disabled={loading || resetLoading}
        loading={resetLoading}
        style={styles.forgotButton}
      >
        Forgot Password?
      </Button>

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account?</Text>
        <Button onPress={goToSignUp} mode="text" disabled={loading || resetLoading}>
          Sign Up
        </Button>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F7B910" />
        </View>
      )}
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
  forgotButton: {
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
