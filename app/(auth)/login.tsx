import { useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { logger, sanitizeForLog } from '../../lib/logger';
import { validateInput, checkRateLimit } from '../../lib/secureAuth';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = useCallback(async () => {
    // Input validation
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    if (!validateInput(email, 'email')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Rate limiting
    if (!checkRateLimit('login', 30000)) { // 30 seconds between attempts
      Alert.alert('Too Many Attempts', 'Please wait before trying to log in again.');
      return;
    }

    setLoading(true);

    try {      // Check if user exists in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error('User lookup error:', userError);
        throw new Error('User not found. Please contact an administrator or complete the signup process.');
      }      // Proceed with normal authentication
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

      const userId = authData.user.id;      // Navigate based on role from users table data
      switch (userData.role) {
        case 'officer':
          router.replace('/officer/officerspecs');
          break;
        case 'admin':
          router.replace('/president/presidentindex' as any);
          break;
        default:
          router.replace('/(tabs)');
      }
    } catch (error: any) {
      logger.error('Login error', sanitizeForLog(error));
      Alert.alert('Login Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

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
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        throw new Error(error.message);
      }

      Alert.alert(
        'Reset Email Sent',
        'Check your email for a password reset link. Follow the link to reset your password, then return to the app to log in.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Reset Error', error.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section with Background Image */}
          <View style={styles.headerContainer}>
            <ImageBackground 
              source={require('../../assets/images/COA.png')} 
              style={styles.backgroundImage}
              resizeMode="cover"
              imageStyle={styles.backgroundImageStyle}
            >
              <View style={styles.headerOverlay}>
                <Text style={styles.appTitle}>The DSP App</Text>
                <View style={styles.logoContainer}>
                  <Text style={styles.logoText}>ΔΣΠ</Text>
                </View>
                <Text style={styles.welcomeText}>Welcome Back</Text>
                <Text style={styles.subtitleText}>Sign in to your account</Text>
              </View>
            </ImageBackground>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
                accessible={true}
                accessibilityLabel="Email address"
                accessibilityHint="Enter your email address to sign in"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!loading}
                  accessible={true}
                  accessibilityLabel="Password"
                  accessibilityHint="Enter your password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  accessibilityHint="Double tap to toggle password visibility"
                >
                  <Text style={styles.eyeText}>{showPassword ? '👁️‍🗨️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, (loading || resetLoading) && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading || resetLoading}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityHint="Double tap to sign in to your account"
              accessibilityState={{ disabled: loading || resetLoading }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
              disabled={loading || resetLoading}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
              accessibilityHint="Double tap to reset your password"
            >
              {resetLoading ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : (
                <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Section */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <TouchableOpacity
              onPress={goToSignUp}
              disabled={loading || resetLoading}
              style={styles.signUpButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Sign up"
              accessibilityHint="Double tap to create a new account"
            >
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6', // Light gray background for the main container
  },
  backgroundImage: {
    width: '100%',
    height: 300, // Smaller height for the background image
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  backgroundImageStyle: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 30,
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dark overlay for better text readability
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8b5cf6',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderColor: '#d1d5db',
    borderWidth: 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#d1d5db',
    borderWidth: 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    height: 56,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    height: 56,
  },
  eyeButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 18,
  },
  loginButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 8,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  signUpButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signUpText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
