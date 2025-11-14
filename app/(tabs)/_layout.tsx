import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Colors } from '../../constants/colors';

export default function BrotherLayout() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Monitor auth state changes - auto logout if signed out elsewhere
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login');
      }
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []); // router.replace is stable, no need for dependency

  // Memoized sign out handler - prevents recreation on every render
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

  // Memoized header right component - prevents recreation on every render
  const HeaderRightComponent = useCallback(() => {
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
      async function fetchRole() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setUserRole(data.role);
        }
      }
      fetchRole();
    }, []);

    const canSwitchView = userRole === 'officer' || userRole === 'admin';

    return (
      <View style={{ flexDirection: 'row', gap: 10, marginRight: 16 }}>
        {canSwitchView && (
          <TouchableOpacity
            onPress={() => {
              if (userRole === 'admin') {
                router.push('/president/presidentindex' as any);
              } else {
                router.push('/officer/officerspecs' as any);
              }
            }}
            style={styles.headerButton}
            disabled={isSigningOut}
          >
            <Ionicons 
              name="swap-horizontal-outline" 
              size={24} 
              color={isSigningOut ? '#999' : '#fff'} 
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={handleSignOut} 
          style={styles.headerButton}
          disabled={isSigningOut}
        >
          <Ionicons 
            name="log-out-outline" 
            size={24} 
            color={isSigningOut ? '#999' : '#fff'} 
          />
        </TouchableOpacity>
      </View>
    );
  }, [handleSignOut, isSigningOut, router]);

  // Memoized screen options - prevents recreation on every render
  const screenOptions = useMemo(() => ({
    tabBarActiveTintColor: '#F7B910', // DSP Gold
    tabBarInactiveTintColor: '#ADAFAA', // Silver
    tabBarStyle: styles.tabBar,
    headerStyle: styles.header,
    headerTintColor: '#fff',
    tabBarLabelStyle: styles.tabBarLabel,
    headerRight: HeaderRightComponent,
  }), [HeaderRightComponent]);

  // Memoized tab icon renderers - prevents recreation on every render
  const renderCalendarIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <Ionicons name="calendar-outline" size={size} color={color} />
  ), []);

  const renderAttendanceIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <Ionicons name="checkbox-outline" size={size} color={color} />
  ), []);

  const renderPointsIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <Ionicons name="trophy-outline" size={size} color={color} />
  ), []);

  const renderNewsIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <Ionicons name="newspaper-outline" size={size} color={color} />
  ), []);

  const renderAccountIcon = useCallback(({ color, size }: { color: string; size: number }) => (
    <Ionicons name="person-outline" size={size} color={color} />
  ), []);

  // Memoized tab options - prevents recreation on every render
  const calendarOptions = useMemo(() => ({
    title: 'Calendar',
    tabBarIcon: renderCalendarIcon,
  }), [renderCalendarIcon]);

  const attendanceOptions = useMemo(() => ({
    title: 'Attendance',
    tabBarIcon: renderAttendanceIcon,
  }), [renderAttendanceIcon]);

  const pointsOptions = useMemo(() => ({
    title: 'Points',
    tabBarIcon: renderPointsIcon,
  }), [renderPointsIcon]);

  const newsOptions = useMemo(() => ({
    title: 'News',
    tabBarIcon: renderNewsIcon,
  }), [renderNewsIcon]);

  const accountOptions = useMemo(() => ({
    title: 'Account',
    tabBarIcon: renderAccountIcon,
    headerShown: true,
  }), [renderAccountIcon]);

  return (
    <ErrorBoundary>
      <Tabs screenOptions={screenOptions}>
        {/* Only these 5 screens will be visible */}
        <Tabs.Screen 
          name="index" 
          options={calendarOptions} 
        />
        <Tabs.Screen 
          name="attendance" 
          options={attendanceOptions} 
        />
        <Tabs.Screen 
          name="points" 
          options={pointsOptions}
        />
        <Tabs.Screen 
          name="newsletter" 
          options={newsOptions} 
        />
        <Tabs.Screen 
          name="account" 
          options={accountOptions}
        />
      </Tabs>
    </ErrorBoundary>
  );
}

// Static styles - created once, never recreated
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.primary, // '#330066' DSP Purple
    borderTopColor: '#ADAFAA', // Silver
  },
  header: {
    backgroundColor: Colors.primary, // '#330066' DSP Purple
  },
  tabBarLabel: {
    fontWeight: 'bold',
  },
  headerButton: {
    marginRight: 15,
  },
});
