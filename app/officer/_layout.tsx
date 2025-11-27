import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import { useOfficerRole } from '../../hooks/shared';
import { supabase } from '../../lib/supabase';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function OfficerLayout() {
  const router = useRouter();
  const { role, loading } = useOfficerRole();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const hasRouted = useRef(false);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return; // Prevent duplicate requests
    
    setIsSigningOut(true);
    
    try {
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{ error: Error }>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ]);
      
      if (error) {
        throw error;
      }
      
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert(
        'Sign Out Failed', 
        error.message === 'Request timeout' 
          ? 'Network timeout. Please try again.'
          : error.message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: handleSignOut }
        ]
      );
    } finally {
      setIsSigningOut(false);
    }
  }, [router, isSigningOut]);

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
        
      // VP Operations gets additional members tab
      case 'vp_operations':
        return new Set([...baseTabs, 'members']);
        
      // All other officers get base tabs
      default:
        return new Set(baseTabs);
    }
  }, [role?.position]);

  // Define tab configuration once
  const tabConfig = useMemo(() => [
    { name: 'index', title: 'Home', icon: 'home-outline' as const },
    { name: 'analytics', title: 'Analytics', icon: 'bar-chart-outline' as const },
    { name: 'events', title: 'Events', icon: 'calendar-outline' as const },
    { name: 'register', title: 'Register', icon: 'person-add-outline' as const },
    { name: 'scholarship', title: 'Testbank', icon: 'library-outline' as const, path: '/officer/scholarship' },
    { name: 'historian', title: 'Marketing', icon: 'megaphone-outline' as const, path: '/officer/historian' },
    { name: 'members', title: 'Members', icon: 'people-outline' as const, path: '/officer/members' },
    { name: 'officerspecs', title: 'Officer Control', icon: 'settings-outline' as const, hidden: true },
  ], []);

  // Removed auto-redirect logic to allow officers to access both member and officer views

  // Show loading indicator while checking role
  if (loading) {
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
          <View style={{ flexDirection: 'row', gap: 10, marginRight: 16 }}>
            <TouchableOpacity 
              onPress={() => router.push('/(tabs)')} 
              disabled={isSigningOut}
            >
              <Ionicons 
                name="people-outline" 
                size={24} 
                color={isSigningOut ? '#999' : '#fff'} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSignOut} 
              disabled={isSigningOut}
            >
              <Ionicons 
                name="log-out-outline" 
                size={24} 
                color={isSigningOut ? '#999' : '#fff'} 
              />
            </TouchableOpacity>
          </View>
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
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
            href: tab.hidden ? null : (accessibleTabs.has(tab.name) ? (tab.path as any ?? undefined) : null),
          }}
        />
      ))}
    </Tabs>
    </ErrorBoundary>
  );
}
