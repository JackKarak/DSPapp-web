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
  const [existingUser, setExistingUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [pledgeClass, setPledgeClass] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [major, setMajor] = useState('');
  const [officerPosition, setOfficerPosition] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleRoleSelection = async (selectedRole: string) => {
    setRole(selectedRole);
    if (selectedRole === 'brother' || selectedRole === 'pledge') {
      setStep(2); // Go to phone/UID collection
    } else if (selectedRole === 'officer' || selectedRole === 'admin') {
      setStep(3); // Go directly to form completion
    }
  };

  const handlePhoneUidSubmit = async () => {
    if (!phoneNumber || !uid) {
      Alert.alert('Missing Information', 'Please enter both phone number and UID.');
      return;
    }

    setLoading(true);
    try {
      console.log('Searching for brother with phone:', phoneNumber, 'and uid:', uid);
      
      // Convert to numbers for the query since they're NUMERIC columns
      const phoneNum = parseInt(phoneNumber);
      const uidNum = parseInt(uid);
      
      // Check if brother exists in the brother table
      const { data: brotherData, error } = await supabase
        .from('brother')
        .select('*')
        .eq('phone_number', phoneNum)
        .eq('uid', uidNum)
        .single();

      console.log('Brother query result:', { brotherData, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Brother query error:', error);
        throw error;
      }

      if (brotherData) {
        // Check if this brother already has a user account
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('phone_number', phoneNum)
          .eq('uid', uidNum)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          throw userError;
        }

        if (existingUser) {
          Alert.alert('Account Exists', 'You already have an account. Please try logging in instead.');
          router.replace('/(auth)/login');
          return;
        }

        // Brother found and no existing user account - proceed with signup
        setExistingUser(brotherData);
        setFirstName(brotherData.first_name || '');
        setLastName(brotherData.last_name || '');
        setEmail(brotherData.email || '');
        setPledgeClass(brotherData.pledge_class || '');
        setGraduationYear(brotherData.graduation_year?.toString() || '');
        setMajor(brotherData.major || '');
        setStep(4); // Brother confirmation step
      } else {
        Alert.alert('Not Found', 'No brother found with this phone number and UID. Please contact an officer if you believe this is an error.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to check brother information.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
  if (!firstName || !lastName || !email || !password || !role) {
    Alert.alert('Missing Fields', 'Please fill in all required fields.');
    return;
  }

  if ((role === 'brother' || role === 'pledge') && (!phoneNumber || !uid)) {
    Alert.alert('Missing Information', 'Phone number and UID are required.');
    return;
  }

  if (role === 'officer' && !officerPosition) {
    Alert.alert('Missing Officer Role', 'Please select an officer position.');
    return;
  }

  setLoading(true);

  try {
    let authUserId: string;

    if (existingUser) {
      // For existing brothers: handle auth account scenarios
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        // Handle case where user already exists in auth
        if (signUpError.message.includes('User already registered') || 
            signUpError.message.includes('already been taken') ||
            signUpError.message.includes('already registered')) {
          
          // For existing brothers with auth conflicts, we'll create a new auth account
          // by updating their email temporarily, then creating the account
          const tempEmail = `temp_${Date.now()}_${email}`;
          
          const { data: tempSignUpData, error: tempSignUpError } = await supabase.auth.signUp({
            email: tempEmail,
            password,
          });

          if (tempSignUpError) {
            throw new Error('Could not create account. Please contact support.');
          }

          if (!tempSignUpData?.user?.id) {
            throw new Error('Failed to create user account.');
          }

          authUserId = tempSignUpData.user.id;

          // Update the auth user's email back to the original
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            authUserId,
            { email: email }
          );

          if (updateError) {
            console.warn('Could not update email, using temporary email');
          }
        } else {
          throw new Error(signUpError.message);
        }
      } else if (signUpData?.user?.id) {
        // New auth user created successfully
        authUserId = signUpData.user.id;
      } else {
        throw new Error('Failed to create user account.');
      }

      // Transfer information from brother table to users table
      // User must stay signed in for RLS policy to work
      const { error: insertError } = await supabase.from('users').insert({
        user_id: authUserId, // must equal auth.uid()
        brother_id: existingUser.id, // Link to the brother record
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: parseInt(phoneNumber),
        uid: parseInt(uid),
        role,
        pledge_class: pledgeClass || null,
        graduation_year: graduationYear ? parseInt(graduationYear) : null,
        major: major || null,
        activated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('Insert Error:', insertError);
        throw new Error(insertError.message || 'Could not create user profile.');
      }

      // Delete the brother record since they're now in the users table
      const { error: deleteError } = await supabase
        .from('brother')
        .delete()
        .eq('id', existingUser.id);

      if (deleteError) {
        console.warn('Could not delete brother record:', deleteError);
        // Don't throw error here as the main operation succeeded
      }

      // Sign out after successful operations
      await supabase.auth.signOut();

    } else {
      // For officers/admin: create new auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
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
      const { error: insertError } = await supabase.from('users').insert({
        user_id: authUserId, // must equal auth.uid()
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phoneNumber ? parseInt(phoneNumber) : null,
        uid: uid ? parseInt(uid) : null,
        role,
        pledge_class: pledgeClass || null,
        graduation_year: graduationYear ? parseInt(graduationYear) : null,
        major: major || null,
        officer_position: role === 'officer' ? officerPosition : null,
        activated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('Insert Error:', insertError);
        throw new Error(insertError.message || 'Could not create user profile.');
      }

      // Sign out after successful operations
      await supabase.auth.signOut();
    }

    const successMessage = existingUser
      ? 'Welcome! Your information has been transferred and your account is ready. You can now login with your new password.'
      : 'Your account was created successfully.';

    Alert.alert('Success!', successMessage);
    router.replace('/(auth)/login');
  } catch (error: any) {
    Alert.alert('Signup Error', error.message || 'Something went wrong.');
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
              <Picker.Item label="Admin" value="admin" />
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
            <Text style={styles.stepTitle}>Complete Your Profile</Text>
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
                <Text style={styles.buttonText}>Yes, That's Me</Text>
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
