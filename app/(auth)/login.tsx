import { useRouter } from 'expo-router';
import React, { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { logger, sanitizeForLog } from '../../lib/logger';
import { validateInput, checkRateLimit } from '../../lib/secureAuth';
import { getSecureItem, setSecureItem, deleteSecureItem, STORAGE_KEYS } from '../../lib/secureStorage';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // Load saved credentials on mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedRememberMe = await getSecureItem<boolean>(STORAGE_KEYS.REMEMBER_ME);
      
      if (savedRememberMe) {
        const savedEmail = await getSecureItem<string>(STORAGE_KEYS.SAVED_EMAIL);
        const savedPassword = await getSecureItem<string>(STORAGE_KEYS.SAVED_PASSWORD);
        
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
      // Silently fail - user can still login manually
    }
  };

  const saveCredentials = async (email: string, password: string) => {
    try {
      if (rememberMe) {
        await setSecureItem(STORAGE_KEYS.SAVED_EMAIL, email);
        await setSecureItem(STORAGE_KEYS.SAVED_PASSWORD, password);
        await setSecureItem(STORAGE_KEYS.REMEMBER_ME, true);
      } else {
        // Clear saved credentials if remember me is unchecked
        await deleteSecureItem(STORAGE_KEYS.SAVED_EMAIL);
        await deleteSecureItem(STORAGE_KEYS.SAVED_PASSWORD);
        await deleteSecureItem(STORAGE_KEYS.REMEMBER_ME);
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      // Don't block login on save failure
    }
  };

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

    try {
      // Authenticate first - NEVER check user table before auth (prevents user enumeration)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData?.user) {
        logger.error('Login authentication failed', sanitizeForLog(authError));
        // ALWAYS use generic message - don't reveal if user exists
        throw new Error('Invalid email or password. Please try again.');
      }

      // Wait for session to be fully established for RLS policies
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        logger.error('Session error after login', sanitizeForLog(sessionError));
        throw new Error('Login failed. Please try again.');
      }

      // Now fetch user data (only for authenticated users)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (userError || !userData) {
        // User authenticated but not in users table - edge case
        logger.error('User fetch error', { 
          userId: authData.user.id, 
          error: userError,
          errorCode: userError?.code,
          errorMessage: userError?.message,
          errorDetails: userError?.details
        });
        throw new Error('Account setup incomplete. Please contact support.');
      }

      // Save credentials if login successful and remember me is checked
      await saveCredentials(email, password);

      // Everyone goes to member tabs by default
      // Officers and admins can switch views using the header button
      router.replace('/(tabs)');
    } catch (error: any) {
      // Handle Error objects properly - extract message
      const errorInfo = error instanceof Error 
        ? { message: error.message, name: error.name }
        : error;
      logger.error('Login error', sanitizeForLog(errorInfo));
      // Always show generic error to prevent user enumeration
      Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, router, rememberMe]);

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
        redirectTo: 'dspapp://(auth)/reset-password',
      });

      if (error) {
        throw new Error(error.message);
      }

      Alert.alert(
        'Reset Email Sent',
        'Check your email for a password reset link. Click the link in the email to reset your password.',
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

            {/* Remember Me Checkbox */}
            <View style={styles.rememberMeContainer}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: '#d1d5db', true: '#F7B910' }}
                thumbColor={rememberMe ? '#330066' : '#f3f4f6'}
                ios_backgroundColor="#d1d5db"
                disabled={loading || resetLoading}
              />
              <Text style={styles.rememberMeText}>Remember me</Text>
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
            
            {/* Legal Links */}
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => router.push('/(auth)/privacy' as any)}>
                <Text style={styles.legalLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}> • </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/terms-of-service' as any)}>
                <Text style={styles.legalLinkText}>Terms of Service</Text>
              </TouchableOpacity>
            </View>
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
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  rememberMeText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 12,
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
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  legalLinkText: {
    fontSize: 14,
    color: '#8b5cf6',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 14,
    color: '#6b7280',
  },
});
