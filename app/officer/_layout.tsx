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
    switch (role.position) {
      case 'vp_scholarship':
        return ['analytics', 'events', 'register', 'scholarship'];
      case 'vp_professional':
        return ['analytics', 'events', 'register'];
      case 'vp_pledge':
        return ['analytics', 'events', 'register'];
      case 'vp_operations':
        return ['analytics', 'events'];
      case 'president':
        return ['analytics', 'events', 'register'];
      default:
        return ['events']; // Default access
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
    </Tabs>
  );
}
