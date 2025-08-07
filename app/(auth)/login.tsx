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
      
      // Check if user exists in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!userData) {
        throw new Error('User not found. Please contact an administrator or complete the signup process.');
      }

      console.log('✅ User found in users table - proceeding with authentication');
      
      // Proceed with normal authentication
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData?.user) {
        console.error('Auth error:', authError);
        console.error('Auth error details:', {
          message: authError?.message,
          status: authError?.status,
          code: authError?.code
        });
        
        // Provide more specific error messages
        if (authError?.message?.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (authError?.message?.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before logging in.');
        } else {
          throw new Error(authError?.message || 'Unable to sign in.');
        }
      }

      const userId = authData.user.id;
      console.log('Successfully authenticated user:', userId);
      console.log('User role:', userData.role);

      // Navigate based on role from users table data
      switch (userData.role) {
        case 'officer':
          router.replace('/officer/index');
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

  // Debug function to check user status
  const checkUserStatus = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter an email address first.');
      return;
    }

    try {
      // Check in brother table
      const { data: brotherData } = await supabase
        .from('brother')
        .select('*')
        .eq('email', email)
        .single();

      // Check in users table
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      let message = `Email: ${email}\n\n`;
      
      if (brotherData) {
        message += `✅ Found in brother table:\n`;
        message += `- Name: ${brotherData.first_name} ${brotherData.last_name}\n`;
        message += `- Status: Needs to complete signup\n\n`;
      } else {
        message += `❌ Not found in brother table\n\n`;
      }

      if (userData) {
        message += `✅ Found in users table:\n`;
        message += `- Name: ${userData.first_name} ${userData.last_name}\n`;
        message += `- Role: ${userData.role}\n`;
        message += `- Status: Account active\n`;
      } else {
        message += `❌ Not found in users table\n`;
      }

      Alert.alert('User Status Check', message);
    } catch (error: any) {
      Alert.alert('Check Error', 'Unable to check user status.');
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

      <Button
        onPress={checkUserStatus}
        mode="outlined"
        disabled={loading || resetLoading}
        style={styles.debugButton}
      >
        Debug: Check User Status
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
  debugButton: {
    marginTop: 8,
    marginBottom: 8,
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
