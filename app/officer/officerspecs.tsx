import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useOfficerRole } from '../../hooks/useOfficerRole';

export default function OfficerSpecs() {
  const router = useRouter();
  const { role, loading } = useOfficerRole();

  useEffect(() => {
    if (!loading && role?.is_officer && role?.position) {
      const position = role.position.toLowerCase();
      
      // Route to specific officer control file based on position
      switch (position) {
        case 'vp_scholarship':
          router.replace('/officer/scholarship');
          break;
        case 'marketing':
          router.replace('/officer/marketing');
          break;
        case 'svp':
        case 'chancellor':
          router.replace('/officer/officerindex');
          break;
        case 'vp_professional':
        case 'vp_service':
        case 'vp_dei':
        case 'vp_pledge_ed':
        case 'brotherhood':
        case 'vp_branding':
          router.replace('/officer/officerindex');
          break;
        case 'social':
          router.replace('/officer/social');
          break;
        case 'wellness':
          router.replace('/officer/wellness');
          break;
        case 'fundraising':
          router.replace('/officer/fundraising');
          break;
        case 'vp_operations':
        case 'vp_finance':
        case 'historian':
        case 'risk':
          router.replace('/officer/officerindex');
          break;
        default:
          router.replace('/officer/officerindex');
      }
    } else if (!loading && !role?.is_officer) {
      // Not an officer, redirect to main tabs
      router.replace('/(tabs)');
    }
  }, [role, loading, router]);

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
