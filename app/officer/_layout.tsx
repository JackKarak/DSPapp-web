import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import { useOfficerRole } from '../../hooks/useOfficerRole';
import { supabase } from '../../lib/supabase';
import { ErrorBoundary } from '../../components/ErrorBoundary';

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

  // Memoize accessible tabs - MUST be before any conditional returns
  const accessibleTabs = useMemo(() => {
    const position = role?.position?.toLowerCase() ?? '';
    const baseTabs = ['index', 'analytics', 'events', 'register'];
    
    // Define additional tabs for specific roles
    switch (position) {
      // VP Scholarship gets additional scholarship tab
      case 'vp_scholarship':
        return new Set([...baseTabs, 'scholarship']);
        
      // Historian gets additional historian tab
      case 'historian':
        return new Set([...baseTabs, 'historian']);
        
      // All other officers get base tabs
      default:
        return new Set(baseTabs);
    }
  }, [role?.position]);

  // Define tab configuration once
  const tabConfig = useMemo(() => [
    { name: 'index', title: 'Home', icon: 'home-outline' },
    { name: 'analytics', title: 'Analytics', icon: 'bar-chart-outline' },
    { name: 'events', title: 'Events', icon: 'calendar-outline' },
    { name: 'register', title: 'Register', icon: 'person-add-outline' },
    { name: 'scholarship', title: 'Testbank', icon: 'library-outline', path: '/officer/scholarship' },
    { name: 'historian', title: 'Marketing', icon: 'megaphone-outline', path: '/officer/historian' },
    { name: 'officerspecs', title: 'Officer Control', icon: 'settings-outline', hidden: true },
  ], []);

  useEffect(() => {
    if (!loading && (!role?.is_officer || !role?.position)) {
      router.replace('/');
    }
  }, [role, loading, router]);

  // Conditional render AFTER all hooks
  if (loading || !role?.is_officer || !role?.position) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#330066" />
      </View>
    );
  }
  
  return (
    <ErrorBoundary>
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
      {tabConfig.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon as any} size={size} color={color} />
            ),
            href: tab.hidden ? null : (accessibleTabs.has(tab.name) ? (tab.path ?? undefined) : null),
          }}
        />
      ))}
    </Tabs>
    </ErrorBoundary>
  );
}
