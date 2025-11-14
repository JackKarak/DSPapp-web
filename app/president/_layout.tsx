import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// Memoized tab icon components for optimal performance
const HomeIcon = memo(({ color, size }: { color: string; size: number }) => (
  <Ionicons name="home-outline" size={size} color={color} />
));
HomeIcon.displayName = 'HomeIcon';

const AnalyticsIcon = memo(({ color, size }: { color: string; size: number }) => (
  <Ionicons name="stats-chart-outline" size={size} color={color} />
));
AnalyticsIcon.displayName = 'AnalyticsIcon';

const ApproveIcon = memo(({ color, size }: { color: string; size: number }) => (
  <Ionicons name="checkmark-circle-outline" size={size} color={color} />
));
ApproveIcon.displayName = 'ApproveIcon';

const AppealsIcon = memo(({ color, size }: { color: string; size: number }) => (
  <Ionicons name="hand-right-outline" size={size} color={color} />
));
AppealsIcon.displayName = 'AppealsIcon';

const RegisterIcon = memo(({ color, size }: { color: string; size: number }) => (
  <Ionicons name="calendar-outline" size={size} color={color} />
));
RegisterIcon.displayName = 'RegisterIcon';

// Memoized header buttons component
const HeaderButtons = memo(({ 
  onSignOut, 
  onSwitchView, 
  isLoading 
}: { 
  onSignOut: () => void; 
  onSwitchView: () => void;
  isLoading: boolean;
}) => (
  <View style={{ flexDirection: 'row', gap: 10, marginRight: 16 }}>
    <TouchableOpacity 
      onPress={onSwitchView} 
      disabled={isLoading}
      accessibilityLabel="Switch to member view"
      accessibilityRole="button"
    >
      <Ionicons 
        name="people-outline" 
        size={24} 
        color={isLoading ? '#999' : '#fff'} 
      />
    </TouchableOpacity>
    <TouchableOpacity 
      onPress={onSignOut} 
      disabled={isLoading}
      accessibilityLabel="Sign out"
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Ionicons name="log-out-outline" size={24} color="#fff" />
      )}
    </TouchableOpacity>
  </View>
));
HeaderButtons.displayName = 'HeaderButtons';

function PresidentLayout() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Memoized sign out handler with proper error handling and loading state
  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    
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
  }, [isSigningOut, router]);

  // Memoized switch view handler
  const handleSwitchView = useCallback(() => {
    router.push('/(tabs)');
  }, [router]);

  // Memoized header right component
  const headerRight = useCallback(
    () => (
      <HeaderButtons 
        onSignOut={handleSignOut} 
        onSwitchView={handleSwitchView}
        isLoading={isSigningOut} 
      />
    ),
    [handleSignOut, handleSwitchView, isSigningOut]
  );

  // Memoized screen options to prevent recreation on every render
  const screenOptions = useMemo(
    () => ({
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: '#F7B910',
      tabBarInactiveTintColor: '#ADAFAA',
      headerStyle: styles.header,
      headerTintColor: 'white',
      tabBarLabelStyle: styles.tabBarLabel,
      headerRight,
    }),
    [headerRight]
  );

  // Memoized tab screen options with function wrappers
  const homeOptions = useMemo(
    () => ({
      title: 'Home',
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <HomeIcon color={color} size={size} />
      ),
    }),
    []
  );

  const analyticsOptions = useMemo(
    () => ({
      title: 'Analytics',
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <AnalyticsIcon color={color} size={size} />
      ),
    }),
    []
  );

  const approveOptions = useMemo(
    () => ({
      title: 'Approve',
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <ApproveIcon color={color} size={size} />
      ),
    }),
    []
  );

  const overrideOptions = useMemo(
    () => ({
      title: 'Appeals',
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <AppealsIcon color={color} size={size} />
      ),
    }),
    []
  );

  const registerOptions = useMemo(
    () => ({
      title: 'Register',
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <RegisterIcon color={color} size={size} />
      ),
    }),
    []
  );

  return (
    <ErrorBoundary>
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen name="presidentindex" options={homeOptions} />
        <Tabs.Screen 
          name="analytics/index" 
          options={analyticsOptions}
        />
        <Tabs.Screen name="approve" options={approveOptions} />
        <Tabs.Screen name="override" options={overrideOptions} />
        <Tabs.Screen name="register" options={registerOptions} />
      </Tabs>
    </ErrorBoundary>
  );
}

// Extract styles to StyleSheet for performance
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#330066',
  },
  header: {
    backgroundColor: '#330066',
  },
  tabBarLabel: {
    fontWeight: 'bold',
  },
  signOutButton: {
    marginRight: 16,
    padding: 4,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Export memoized component to prevent unnecessary re-renders from parent
export default memo(PresidentLayout);
