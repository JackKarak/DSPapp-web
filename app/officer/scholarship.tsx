import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ScholarshipTab() {
  const [loading, setLoading] = useState(true);
  const [testBankItems, setTestBankItems] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('User authentication failed:', userError);
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      console.log('User authenticated:', user.id);

      // Check if user is VP Scholarship
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('is_officer, officer_position')
        .eq('user_id', user.id)
        .single();

      console.log('User role data:', userData, 'Error:', roleError);

      if (roleError) {
        console.error('Role check error:', roleError);
        Alert.alert('Error', 'Failed to verify your permissions. Please try again.');
        setLoading(false);
        return;
      }

      if (!userData) {
        Alert.alert('Error', 'User data not found. Please contact support.');
        setLoading(false);
        return;
      }

      if (!userData.is_officer) {
        Alert.alert('Access Denied', 'You do not have officer permissions.');
        router.replace('/officer/officerindex');
        return;
      }

      // Allow access for VP Scholarship or scholarship officers
      if (userData.officer_position !== 'scholarship' && userData.officer_position !== 'vp_scholarship') {
        console.log('Position mismatch:', userData.officer_position);
        Alert.alert('Access Denied', 'You do not have permission to access the scholarship test bank.');
        router.replace('/officer/officerindex');
        return;
      }

      fetchTestBankItems();
    } catch (error) {
      console.error('Authentication check failed:', error);
      Alert.alert('Error', 'Authentication check failed. Please try again.');
      setLoading(false);
    }
  };

  const fetchTestBankItems = async () => {
    try {
      console.log('Fetching test bank items...');
      
      const { data, error } = await supabase
        .from('test_bank')
        .select(`
          id,
          class_code,
          file_type,
          file_name,
          uploaded_at,
          users(first_name, last_name)
        `)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching test bank:', error);
        Alert.alert('Error', `Failed to load test bank items: ${error.message}`);
        setTestBankItems([]);
      } else {
        console.log('Test bank items loaded:', data?.length || 0, 'items');
        setTestBankItems(data || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading test bank items.');
      setTestBankItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading test bank...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      <Text style={styles.header}>📚 Scholarship Test Bank</Text>
      <Text style={styles.subtitle}>Manage study materials and test resources</Text>

      {testBankItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No test bank items yet</Text>
          <Text style={styles.emptySubtext}>Submissions from members will appear here</Text>
        </View>
      ) : (
        <View style={styles.itemsContainer}>
          {testBankItems.map((item: any) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.classCode}>{item.class_code}</Text>
                <Text style={styles.fileType}>{item.file_type}</Text>
              </View>
              <Text style={styles.fileName}>{item.file_name}</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.uploadedBy}>
                  Uploaded by: {item.users?.first_name} {item.users?.last_name}
                </Text>
                <Text style={styles.uploadDate}>
                  {new Date(item.uploaded_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  itemsContainer: {
    gap: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  classCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  fileType: {
    fontSize: 14,
    color: '#8b5cf6',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '600',
  },
  fileName: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '500',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadedBy: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  uploadDate: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
