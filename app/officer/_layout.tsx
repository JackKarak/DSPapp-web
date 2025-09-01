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
    
    // Define tabs for each specific role
    switch (position) {
      // Executive Leadership - Full Access
      case 'svp':
      case 'chancellor':
        return ['index', 'analytics', 'events', 'register'];
        
      // VP Scholarship - Unique Testbank Access ONLY
      case 'vp_scholarship':
        return ['index', 'analytics', 'events', 'register', 'scholarship'];
        
      // Marketing - Unique Marketing Tools ONLY
      case 'marketing':
        return ['index', 'analytics', 'events', 'register'];
        
      // Historian - Unique Marketing Tools Access
      case 'historian':
        return ['index', 'analytics', 'events', 'historian'];
        
      // Event-Creating VPs
      case 'vp_professional':
      case 'vp_service':
      case 'vp_dei':
      case 'vp_pledge_ed':
      case 'brotherhood':
      case 'vp_branding':
        return ['index', 'analytics', 'events', 'register'];
        
      // Event-Creating Chairs (when their files are created)
      case 'social':
        return ['index', 'analytics', 'events', 'register']; // Add 'social' when file exists
      case 'wellness':
        return ['index', 'analytics', 'events', 'register']; // Add 'wellness' when file exists
      case 'fundraising':
        return ['index', 'analytics', 'events', 'register']; // Add 'fundraising' when file exists
        
      // Administrative Roles - View Only
      case 'vp_operations':
      case 'vp_finance':
      case 'risk':
        return ['index', 'analytics', 'events'];
        
      // Default fallback for unrecognized roles
      default:
        return ['index'];
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('index') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('analytics') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('events') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="register"
        options={{
          title: 'Register',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('register') ? undefined : null,
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
        name="historian"
        options={{
          title: 'Marketing',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone-outline" size={size} color={color} />
          ),
          href: accessibleTabs.includes('historian') ? '/officer/historian' : null,
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
