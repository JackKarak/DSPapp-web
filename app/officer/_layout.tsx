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
    switch (position) {
      // Executive Board (Full Access)
      case 'svp':
      case 'chancellor':
        return ['officerindex', 'analytics', 'events', 'register', 'scholarship'];

      // Academic VPs
      case 'vp_scholarship':
        return ['officerindex', 'analytics', 'events', 'register', 'scholarship'];
        
      // Administrative VPs (Analytics + Events)
      case 'vp_operations':
      case 'vp_finance':
      case 'historian':
      case 'risk':
        return ['officerindex', 'analytics', 'events'];

      // Event-Creating VPs
      case 'vp_professional':
      case 'vp_service':
      case 'vp_dei':
      case 'vp_pledge_ed':
      case 'social':
      case 'marketing':
      case 'wellness':
      case 'fundraising':
      case 'brotherhood':
      case 'vp_branding':
        return ['officerindex', 'analytics', 'events', 'register'];

      // Default access - just home page
      default:
        return ['officerindex']; // Fallback for safety
    }
  };

  const accessibleTabs = getAccessibleTabs();

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
      {/* Home tab - always visible */}
      {accessibleTabs.includes('officerindex') && (
        <Tabs.Screen
          name="officerindex"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      {/* Analytics tab - most officers */}
      {accessibleTabs.includes('analytics') && (
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      {/* Events tab - all officers */}
      {accessibleTabs.includes('events') && (
        <Tabs.Screen
          name="events"
          options={{
            title: 'Events',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      {/* Register tab - VPs only */}
      {accessibleTabs.includes('register') && (
        <Tabs.Screen
          name="register"
          options={{
            title: 'Register',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-add-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      {/* Scholarship tab - VP Scholarship and President only */}
      {accessibleTabs.includes('scholarship') && (
        <Tabs.Screen
          name="scholarship"
          options={{
            title: 'Testbank',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="library-outline" size={size} color={color} />
            ),
          }}
        />
      )}
    </Tabs>
  );
}
