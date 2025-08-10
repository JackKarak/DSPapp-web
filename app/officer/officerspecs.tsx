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
        case 'vp_branding':
          router.replace('/officer/marketing');
          break;
        default:
          // All other officer positions use the main officer dashboard
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
