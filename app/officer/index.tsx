import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function OfficerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOfficerRoleAndRoute();
  }, []);

  const checkOfficerRoleAndRoute = async () => {
    try {
      setLoading(true);

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        Alert.alert('Authentication Error', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Fetch user's officer information from Supabase
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('is_officer, officer_position, role')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        Alert.alert('Error', 'Unable to load your profile. Please contact support.');
        router.replace('/(tabs)');
        return;
      }

      // Check if user is an officer
      if (!profile?.is_officer || !profile?.officer_position) {
        Alert.alert('Access Denied', 'You do not have officer access.');
        router.replace('/(tabs)');
        return;
      }

      // Route to appropriate officer control file based on position
      const position = profile.officer_position.toLowerCase();
      
      switch (position) {
        case 'vp_scholarship':
          router.replace('/officer/officer_control/scholarship');
          break;
        case 'marketing':
          router.replace('/officer/officer_control/marketing');
          break;
        case 'svp':
        case 'chancellor':
          router.replace('/officer/officer_control/executive');
          break;
        case 'vp_professional':
        case 'vp_service':
        case 'vp_dei':
        case 'vp_pledge_ed':
        case 'brotherhood':
        case 'vp_branding':
          router.replace('/officer/officer_control/event_manager');
          break;
        case 'social':
          router.replace('/officer/officer_control/social');
          break;
        case 'wellness':
          router.replace('/officer/officer_control/wellness');
          break;
        case 'fundraising':
          router.replace('/officer/officer_control/fundraising');
          break;
        case 'vp_operations':
        case 'vp_finance':
        case 'historian':
        case 'risk':
          router.replace('/officer/officer_control/administrative');
          break;
        default:
          console.warn('Unknown officer position:', position);
          router.replace('/officer/officer_control/general');
      }
      
    } catch (error) {
      console.error('Error checking officer role:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while determining where to route
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
      <ActivityIndicator size="large" color="#330066" />
      <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280', fontWeight: '500' }}>
        Redirecting to your officer controls...
      </Text>
    </View>
  );
}
