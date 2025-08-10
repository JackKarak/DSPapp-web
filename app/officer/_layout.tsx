import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import { useOfficerRole } from '../../hooks/useOfficerRole';
import { supabase } from '../../lib/supabase';

export default function OfficerLayout() {
  const router = useRouter();
  const { role, loading } = useOfficerRole();

  const handleSignOut: () => Promise<void> = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Sign Out Failed', error.message);
    } else {
      router.replace('/(auth)/login');
    }
  };

  useEffect(() => {
    if (!loading && (!role?.is_officer || !role?.position)) {
      router.replace('/');
    }
  }, [role, loading, router]);

  if (loading || !role?.is_officer || !role?.position) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#330066" />
      </View>
    );
  }

  // Define which tabs each officer role can access
  const getAccessibleTabs = () => {
    const position = role?.position?.toLowerCase() ?? '';
    
    // Debug: Log the position to see what we're getting
    console.log('Officer position:', position);
    
    // Define tabs for each specific role
    switch (position) {
      // Executive Leadership - Full Access
      case 'svp':
      case 'chancellor':
        console.log('Access: Executive leadership');
        return ['officerindex', 'shared/analytics', 'shared/events', 'shared/register'];
        
      // VP Scholarship - Unique Testbank Access ONLY
      case 'vp_scholarship':
        console.log('Access: VP Scholarship');
        return ['officerindex', 'shared/analytics', 'shared/events', 'shared/register', 'scholarship'];
        
      // Marketing - Unique Marketing Tools ONLY
      case 'marketing':
        console.log('Access: Marketing');
        return ['officerindex', 'shared/analytics', 'shared/events', 'shared/register', 'marketing'];
        
      // Event-Creating VPs
      case 'vp_professional':
      case 'vp_service':
      case 'vp_dei':
      case 'vp_pledge_ed':
      case 'brotherhood':
      case 'vp_branding':
        console.log('Access: Event-creating VP');
        return ['officerindex', 'shared/analytics', 'shared/events', 'shared/register'];
        
      // Event-Creating Chairs (when their files are created)
      case 'social':
        console.log('Access: Social chair');
        return ['officerindex', 'shared/analytics', 'shared/events', 'shared/register']; // Add 'social' when file exists
      case 'wellness':
        console.log('Access: Wellness chair');
        return ['officerindex', 'shared/analytics', 'shared/events', 'shared/register']; // Add 'wellness' when file exists
      case 'fundraising':
        console.log('Access: Fundraising chair');
        return ['officerindex', 'shared/analytics', 'shared/events', 'shared/register']; // Add 'fundraising' when file exists
        
      // Administrative Roles - View Only
      case 'vp_operations':
      case 'vp_finance':
      case 'historian':
      case 'risk':
        console.log('Access: Administrative role');
        return ['officerindex', 'shared/analytics', 'shared/events'];
        
      // Default fallback for unrecognized roles
      default:
        console.log('Access: Default fallback for position:', position);
        return ['officerindex'];
    }
  };

  const accessibleTabs = getAccessibleTabs();
  
  // Debug: Log the accessible tabs
  console.log('Accessible tabs for role:', role?.position, ':', accessibleTabs);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#330066' },
        tabBarActiveTintColor: '#F7B910',
        tabBarInactiveTintColor: '#ADAFAA',
        headerStyle: { backgroundColor: '#330066' },
        headerTintColor: 'white',
        tabBarLabelStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity onPress={handleSignOut} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="officerindex"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('officerindex') ? '/officer/officerindex' : null,
        }}
      />
      <Tabs.Screen
        name="shared/analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('shared/analytics') ? '/officer/shared/analytics' : null,
        }}
      />
      <Tabs.Screen
        name="shared/events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('shared/events') ? '/officer/shared/events' : null,
        }}
      />
      <Tabs.Screen
        name="shared/register"
        options={{
          title: 'Register',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('shared/register') ? '/officer/shared/register' : null,
        }}
      />
      <Tabs.Screen
        name="scholarship"
        options={{
          title: 'Testbank',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('scholarship') ? '/officer/scholarship' : null,
        }}
      />
      <Tabs.Screen
        name="marketing"
        options={{
          title: 'Marketing',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('marketing') ? '/officer/marketing' : null,
        }}
      />
      <Tabs.Screen
        name="officerspecs"
        options={{
          title: 'Officer Control',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
          href: null, // Hidden tab - used for routing only
        }}
      />
    </Tabs>
  );
}
