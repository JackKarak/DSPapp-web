// app/signup.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { supabase } from '../../lib/supabase';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const router = useRouter();

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data?.user?.id) {
      Alert.alert('Error', error?.message || 'Could not sign up.');
      return;
    }

    // Determine initial role based on known emails
    let role = 'pending';
    let approved = false;

    if (email === 'president@yourdomain.com') {
      role = 'president';
      approved = true;
    } else if (email === 'officer@yourdomain.com') {
      role = 'officer';
      approved = true;
    }

    const { error: profileError } = await supabase.from('profiles').insert([
      {
        id: data.user.id,
        full_name: fullName,
        approved,
        role,
      },
    ]);

    if (profileError) {
      console.error(profileError);
    }

    Alert.alert(
      'Registration Submitted',
      'Your account has been created. You will be able to log in once approved.'
    );

    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Button mode="contained" onPress={handleSignUp} style={styles.button}>
        Submit for Approval
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { marginBottom: 16 },
  button: { marginTop: 8 },
});
