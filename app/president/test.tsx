import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function TestPresident() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      console.log('🔍 Testing president access...');
      
      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('❌ Not authenticated');
        Alert.alert('Not Authenticated', 'Please log in first.');
        router.replace('/(auth)/login');
        return;
      }

      console.log('✅ User authenticated:', user.id);

      // Check user role in database
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('user_id, email, role, officer_position, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      console.log('👤 User data from DB:', userData);
      console.log('❌ DB Error:', dbError);

      if (dbError) {
        Alert.alert('Database Error', `Could not fetch user data: ${dbError.message}`);
        setLoading(false);
        return;
      }

      if (!userData) {
        Alert.alert('User Not Found', 'User record not found in database.');
        setLoading(false);
        return;
      }

      if (userData.role !== 'admin') {
        Alert.alert('Access Denied', `Your role is: ${userData.role}. Admin role required.`);
        router.replace('/(tabs)');
        return;
      }

      setUserInfo(userData);
      console.log('✅ Access granted to admin user');

    } catch (error) {
      console.error('🔥 Error in checkUserAccess:', error);
      Alert.alert('Error', `Access check failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testTableAccess = async () => {
    try {
      console.log('🔍 Testing table access...');
      
      // Test admin_feedback table
      const { data, error } = await supabase
        .from('admin_feedback')
        .select('id, subject, submitted_at')
        .limit(5);

      if (error) {
        console.log('❌ Table access error:', error);
        Alert.alert('Table Access Error', `Cannot access admin_feedback table: ${error.message}\n\nError Code: ${error.code}`);
      } else {
        console.log('✅ Table access successful:', data);
        Alert.alert('Table Access Success', `Found ${data?.length || 0} feedback records`);
      }
    } catch (error) {
      console.error('🔥 Error testing table access:', error);
      Alert.alert('Error', `Table test failed: ${error}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Testing President Access...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>President Access Test</Text>
      
      {userInfo && (
        <View style={styles.userInfo}>
          <Text style={styles.text}>✅ Access Granted!</Text>
          <Text style={styles.text}>Name: {userInfo.first_name} {userInfo.last_name}</Text>
          <Text style={styles.text}>Email: {userInfo.email}</Text>
          <Text style={styles.text}>Role: {userInfo.role}</Text>
          <Text style={styles.text}>Position: {userInfo.officer_position || 'N/A'}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={testTableAccess}>
        <Text style={styles.buttonText}>Test Table Access</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.push('/president/presidentindex')}
      >
        <Text style={styles.buttonText}>Go to Main Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#330066',
  },
  userInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#330066',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
