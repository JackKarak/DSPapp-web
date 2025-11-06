import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
  const [step, setStep] = useState(1); // Track signup steps
  const [role, setRole] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [uid, setUid] = useState('');
  interface ExistingUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    pledge_class?: string;
    phone_number?: number;
  }
  const [existingUser, setExistingUser] = useState<ExistingUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [pledgeClass, setPledgeClass] = useState('');
  const [officerPosition, setOfficerPosition] = useState('');
  const [expectedGraduation, setExpectedGraduation] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // Helper function to create role-specific user data
  const createUserData = (authUserId: string) => {
    const baseData = {
      user_id: authUserId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.toLowerCase().trim(),
      role,
    };

    // Add role-specific fields
    if (role === 'brother' || role === 'pledge') {
      return {
        ...baseData,
        phone_number: parseInt(phoneNumber),
        uid: parseInt(uid),
        pledge_class: pledgeClass || null,
        expected_graduation: expectedGraduation ? parseInt(expectedGraduation) : null,
      };
    } else if (role === 'officer') {
      return {
        ...baseData,
        officer_position: officerPosition || null,
      };
    } else {
      // Admin only needs basic fields
      return baseData;
    }
    
  };

  const handleRoleSelection = async (selectedRole: string) => {
    // Block admin self-registration - admins must be created by existing admins
    if (selectedRole === 'admin') {
      Alert.alert(
        'Admin Access Restricted',
        'Admin accounts must be created by existing administrators. Please contact chapter leadership for admin access.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setRole(selectedRole);
    if (selectedRole === 'brother' || selectedRole === 'pledge') {
      setStep(2); // Go to phone/UID collection
    } else if (selectedRole === 'officer') {
      setStep(3); // Go directly to form completion
    }
  };

  const handlePhoneUidSubmit = async () => {
    if (!phoneNumber || !uid) {
      Alert.alert('Missing Information', 'Please enter both phone number and UID.');
      return;
    }

    setLoading(true);
    try {      // Convert to numbers for the query since they're NUMERIC columns
      const phoneNum = parseInt(phoneNumber);
      const uidNum = parseInt(uid);      // Check if conversion was successful
      if (isNaN(phoneNum) || isNaN(uidNum)) {
        Alert.alert(
          'Invalid Input',
          'Please enter valid numbers for phone number and UID.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Basic validation for phone number length
      if (phoneNumber.length < 10 || phoneNumber.length > 15) {
        Alert.alert(
          'Invalid Phone Number',
          'Please enter a valid phone number (10-15 digits).',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Check if user already exists in the users table
      const { data: existingUserData, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNum)
        .eq('uid', uidNum)
        .single();      if (error && error.code !== 'PGRST116') {
        console.error('User query error:', error);
        throw error;
      }

      if (existingUserData) {
        Alert.alert(
          'Account Already Exists', 
          'An account with this information already exists. Would you like to sign in instead?',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)/login')
            }
          ]
        );
        return;
      }

      // Check the appropriate table based on role
      if (role === 'pledge') {
        // Check pledge table for pledges
        const { data: pledgeData, error: pledgeError } = await supabase
          .from('pledge')
          .select('*')
          .eq('phone_number', phoneNum)
          .eq('UID', uidNum)
          .single();

        if (pledgeError && pledgeError.code !== 'PGRST116') {
          console.error('Pledge query error:', pledgeError);
          Alert.alert(
            'Verification Error',
            'We encountered an issue while verifying your information. Please try again later or contact support.',
            [{ text: 'OK' }]
          );
          return;
        }

        if (!pledgeData) {
          Alert.alert(
            'Verification Required',
            'We couldn\'t verify your information. Please ensure your phone number and UID are correct, or contact chapter leadership for assistance.',
            [
              {
                text: 'Try Again',
                onPress: () => {
                  setPhoneNumber('');
                  setUid('');
                }
              },
              {
                text: 'Contact Support',
                onPress: () => {
                  Alert.alert(
                    'Contact Information',
                    'Please reach out to chapter leadership or officers for assistance with account verification.',
                    [{ text: 'OK' }]
                  );
                }
              }
            ]
          );
          return;
        }

        // Show confirmation with pledge information (without exposing sensitive data)
        const displayName = `${pledgeData.first_name || ''} ${pledgeData.last_name || ''}`.trim() || 'N/A';
        const maskedPhone = pledgeData.phone_number ? `***-***-${pledgeData.phone_number.toString().slice(-4)}` : 'N/A';
        
        Alert.alert(
          'Account Found',
          `We found a matching record for:\n\nName: ${displayName}\nPhone: ${maskedPhone}\nPledge Class: ${pledgeData.pledge_class || 'Not specified'}\n\nIs this you?`,
          [
            {
              text: 'Not Me',
              style: 'cancel',
              onPress: () => {
                Alert.alert(
                  'Verification Failed',
                  'If this information doesn\'t match, please double-check your phone number and UID, or contact chapter leadership for assistance.',
                  [
                    {
                      text: 'Try Again',
                      onPress: () => {
                        setPhoneNumber('');
                        setUid('');
                      }
                    }
                  ]
                );
              }
            },
            {
              text: 'Yes, That\'s Me',
              onPress: () => {
                setExistingUser(pledgeData);
                // Pre-fill name fields if available
                if (pledgeData.first_name) setFirstName(pledgeData.first_name);
                if (pledgeData.last_name) setLastName(pledgeData.last_name);
                if (pledgeData.email) setEmail(pledgeData.email);
                if (pledgeData.pledge_class) setPledgeClass(pledgeData.pledge_class);
                setStep(3);
              }
            }
          ]
        );
      } else if (role === 'brother') {
        // Check brother table for brothers
        const { data: brotherData, error: brotherError } = await supabase
          .from('brother')
          .select('*')
          .eq('phone_number', phoneNum)
          .eq('uid', uidNum)
          .single();

        if (brotherError && brotherError.code !== 'PGRST116') {
          console.error('Brother query error:', brotherError);
          Alert.alert(
            'Verification Error',
            'We encountered an issue while verifying your information. Please try again later or contact support.',
            [{ text: 'OK' }]
          );
          return;
        }

        if (!brotherData) {
          Alert.alert(
            'Verification Required',
            'We couldn\'t verify your information. Please ensure your phone number and UID are correct, or contact chapter leadership for assistance.',
            [
              {
                text: 'Try Again',
                onPress: () => {
                  setPhoneNumber('');
                  setUid('');
                }
              },
              {
                text: 'Contact Support',
                onPress: () => {
                  Alert.alert(
                    'Contact Information',
                    'Please reach out to chapter leadership or officers for assistance with account verification.',
                    [{ text: 'OK' }]
                  );
                }
              }
            ]
          );
          return;
        }

        // Show confirmation with brother information (without exposing sensitive data)
        const displayName = `${brotherData.first_name || ''} ${brotherData.last_name || ''}`.trim() || 'N/A';
        const maskedPhone = brotherData.phone_number ? `***-***-${brotherData.phone_number.toString().slice(-4)}` : 'N/A';
        
        Alert.alert(
          'Account Found',
          `We found a matching record for:\n\nName: ${displayName}\nPhone: ${maskedPhone}\nPledge Class: ${brotherData.pledge_class || 'Not specified'}\n\nIs this you?`,
          [
            {
              text: 'Not Me',
              style: 'cancel',
              onPress: () => {
                Alert.alert(
                  'Verification Failed',
                  'If this information doesn\'t match, please double-check your phone number and UID, or contact chapter leadership for assistance.',
                  [
                    {
                      text: 'Try Again',
                      onPress: () => {
                        setPhoneNumber('');
                        setUid('');
                      }
                    }
                  ]
                );
              }
            },
            {
              text: 'Yes, That\'s Me',
              onPress: () => {
                setExistingUser(brotherData);
                // Pre-fill name fields if available
                if (brotherData.first_name) setFirstName(brotherData.first_name);
                if (brotherData.last_name) setLastName(brotherData.last_name);
                if (brotherData.email) setEmail(brotherData.email);
                if (brotherData.pledge_class) setPledgeClass(brotherData.pledge_class);
                setStep(3);
              }
            }
          ]
        );
      } else {
        // No existing user account - proceed with signup
        setStep(3);
      }
    } catch (error: any) {
      console.error('User verification error:', error);
      Alert.alert(
        'Verification Error', 
        'We encountered an issue while verifying your information. Please try again or contact support if the problem persists.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setPhoneNumber('');
              setUid('');
            }
          },
          {
            text: 'OK'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
  // Basic validation for all roles
  if (!firstName || !lastName || !email || !password || !role) {
    const missingFields = [];
    if (!firstName) missingFields.push('First Name');
    if (!lastName) missingFields.push('Last Name');
    if (!email) missingFields.push('Email');
    if (!password) missingFields.push('Password');
    
    Alert.alert('Missing Fields', `Please fill in: ${missingFields.join(', ')}`);
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    Alert.alert('Invalid Email', 'Please enter a valid email address.');
    return;
  }

  // Password strength validation
  if (password.length < 8) {
    Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
    return;
  }

  // Block admin role (double-check in case UI is bypassed)
  if (role === 'admin') {
    Alert.alert('Access Denied', 'Admin accounts cannot be created through self-registration.');
    return;
  }

  // Role-specific validation
  if (role === 'brother' || role === 'pledge') {
    if (!phoneNumber || !uid) {
      Alert.alert('Missing Information', 'Phone number and UID are required for brothers and pledges.');
      return;
    }
  }
  
  if (role === 'officer') {
    if (!officerPosition) {
      Alert.alert('Missing Information', 'Officer position is required for officers.');
      return;
    }
  }
  // Admin role only needs basic fields (no additional validation needed)

  setLoading(true);

  try {
    let authUserId: string;

    if (existingUser) {
      // For existing brothers: create auth account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signUpError) {
        // Handle case where email is already in use
        if (signUpError.message.includes('User already registered') || 
            signUpError.message.includes('already been taken') ||
            signUpError.message.includes('already registered')) {
          Alert.alert(
            'Email Already Registered',
            'This email is already registered. Would you like to sign in instead?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign In', onPress: () => router.replace('/(auth)/login') }
            ]
          );
          return;
        }
        throw new Error(signUpError.message);
      }

      if (!signUpData?.user?.id) {
        throw new Error('Failed to create user account.');
      }

      authUserId = signUpData.user.id;

      // Transfer information from brother table to users table
      // User must stay signed in for RLS policy to work
      const userData = createUserData(authUserId);
      const { error: insertError } = await supabase.from('users').insert(userData);

      if (insertError) {
        console.error('Insert Error:', insertError);
        throw new Error(insertError.message || 'Could not create user profile.');
      }

      // Delete the brother/pledge record since they're now in the users table
      const tableName = role === 'pledge' ? 'pledge' : 'brother';
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', existingUser.id);

      if (deleteError) {
        console.warn('Cleanup warning:', deleteError);
        // Don't throw error here as the main operation succeeded
      }

      // Sign out after successful operations
      await supabase.auth.signOut();

    } else {
      // For officers: create new auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered') || 
            signUpError.message.includes('already been taken') ||
            signUpError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please try logging in instead.');
        } else {
          throw new Error(signUpError.message);
        }
      }

      if (!signUpData?.user?.id) {
        throw new Error('Failed to create user account.');
      }

      authUserId = signUpData.user.id;

      // Create new user entry while user is still signed in for RLS
      const userData = createUserData(authUserId);
      const { error: insertError } = await supabase.from('users').insert(userData);

      if (insertError) {
        console.error('Insert Error:', insertError);
        throw new Error(insertError.message || 'Could not create user profile.');
      }

      // Sign out after successful operations
      await supabase.auth.signOut();
    }

    // Role-specific success messages
    let successMessage = '';
    if (existingUser) {
      successMessage = 'Welcome! Your information has been transferred and your account is ready. You can now login with your new password.';
    } else {
      switch (role) {
        case 'officer':
          successMessage = 'Officer account created successfully! You can now login and access officer features.';
          break;
        case 'brother':
        case 'pledge':
          successMessage = 'Your account was created successfully! Welcome to the brotherhood.';
          break;
        default:
          successMessage = 'Your account was created successfully.';
      }
    }

    Alert.alert('Success!', successMessage);
    router.replace('/(auth)/login');
  } catch (error: any) {
    console.error('Signup error:', error);
    Alert.alert(
      'Registration Error', 
      'We encountered an issue creating your account. Please try again or contact support if the problem persists.',
      [{ text: 'OK' }]
    );
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
        <TouchableOpacity onPress={() => {
          if (step === 1) {
            router.back();
          } else if (step === 2) {
            setStep(1);
          } else if (step === 3) {
            if (role === 'brother' || role === 'pledge') {
              setStep(existingUser ? 4 : 2);
            } else {
              setStep(1);
            }
          } else if (step === 4) {
            setStep(2);
          } else if (step === 5) {
            setStep(4);
          }
        }} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create an Account</Text>

        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>What is your role?</Text>
            <Text style={styles.label}>Select Your Role</Text>
            <Picker
              selectedValue={role}
              onValueChange={handleRoleSelection}
              style={[styles.picker, Platform.OS === 'ios' && { height: 200 }]}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Select Role" value="" />
              <Picker.Item label="Brother" value="brother" />
              <Picker.Item label="Pledge" value="pledge" />
              <Picker.Item label="Officer" value="officer" />
            </Picker>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>Verify Your Identity</Text>
            <TextInput
              placeholder="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              style={styles.input}
              placeholderTextColor="#999"
            />
            <TextInput
              placeholder="UID"
              value={uid}
              onChangeText={setUid}
              style={styles.input}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              onPress={handlePhoneUidSubmit}
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Checking...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>
              {role === 'officer' ? 'Officer Registration' : 'Complete Your Profile'}
            </Text>
            <TextInput
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              placeholderTextColor="#999"
            />
            <TextInput
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
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
                  <Picker.Item label="Chancellor" value="chancellor" />
                  <Picker.Item label="Senior Vice President" value="svp" />
                  <Picker.Item label="VP Operations" value="vp_operations" />
                  <Picker.Item label="VP Finance" value="vp_finance" />
                  <Picker.Item label="VP Pledge Education" value="vp_pledgeed" />
                  <Picker.Item label="VP Scholarship" value="vp_scholarship" />
                  <Picker.Item label="VP Media" value="vp_media" />
                  <Picker.Item label="VP Service" value="vp_service" />
                  <Picker.Item label="VP DEI" value="vp_dei" />
                  <Picker.Item label="Fundraising Chair" value="fundraising" />
                  <Picker.Item label="Social Chair" value="social" />
                  <Picker.Item label="Historian" value="historian" />
                  <Picker.Item label="Wellness Chair" value="wellness" />
                  <Picker.Item label="Brotherhood Chair" value="brotherhood" />
                  <Picker.Item label="Risk Management" value="risk" />
                  <Picker.Item label="Marketing Chair" value="marketing" />
                </Picker>
              </>
            )}

            {(role === 'brother' || role === 'pledge') && (
              <>
                <Text style={styles.label}>Pledge Class</Text>
                <Picker
                  selectedValue={pledgeClass}
                  onValueChange={setPledgeClass}
                  style={[styles.picker, Platform.OS === 'ios' && { height: 200 }]}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Select Pledge Class" value="" />
                  <Picker.Item label="Rho" value="rho" />
                  <Picker.Item label="Sigma" value="sigma" />
                  <Picker.Item label="Tau" value="tau" />
                  <Picker.Item label="Upsilon" value="upsilon" />
                  <Picker.Item label="Phi" value="phi" />
                  <Picker.Item label="Chi" value="chi" />
                </Picker>
              </>
            )}

            {(role === 'brother' || role === 'pledge') && (
              <>
                <Text style={styles.label}>Expected Graduation</Text>
                <TextInput
                  placeholder="e.g. 2026"
                  value={expectedGraduation}
                  onChangeText={setExpectedGraduation}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholderTextColor="#999"
                />
              </>
            )}

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
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 4 && existingUser && (
          <>
            <Text style={styles.stepTitle}>Is this you?</Text>
            <View style={styles.confirmationCard}>
              <Text style={styles.confirmationText}>
                <Text style={styles.bold}>Name:</Text> {existingUser.first_name} {existingUser.last_name}
              </Text>
              <Text style={styles.confirmationText}>
                <Text style={styles.bold}>Email:</Text> {existingUser.email}
              </Text>
              <Text style={styles.confirmationText}>
                <Text style={styles.bold}>Pledge Class:</Text> {existingUser.pledge_class}
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => {
                  // Reset phone/UID and go back to step 2
                  setPhoneNumber('');
                  setUid('');
                  setExistingUser(null);
                  setStep(2);
                }}
                style={[styles.button, styles.secondaryButton]}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  No, Not Me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  // Keep existing info but allow updates, go to form
                  setStep(3);
                }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Yes, That&apos;s Me</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 5 && (
          <>
            <Text style={styles.stepTitle}>Create Your Password</Text>
            <Text style={styles.subtitle}>
              Welcome back, {existingUser?.first_name}! Just create a password to complete your account.
            </Text>
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
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#330066',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  confirmationText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#374151',
  },
  bold: {
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
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
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#330066',
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
  secondaryButtonText: {
    color: '#330066',
  },
});
