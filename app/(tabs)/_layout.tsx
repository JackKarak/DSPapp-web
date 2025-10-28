import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Colors } from '../../constants/colors';

export default function BrotherLayout() {
  const router = useRouter();

  // Memoized sign out handler - prevents recreation on every render
  const handleSignOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Sign Out Failed', error.message);
    } else {
      router.replace('/(auth)/login');
    }
  }, [router]);

  // Memoized header right component - prevents recreation on every render
  const HeaderRightComponent = useCallback(() => (
    <TouchableOpacity onPress={handleSignOut} style={styles.headerButton}>
      <Ionicons name="log-out-outline" size={24} color="#fff" />
    </TouchableOpacity>
  ), [handleSignOut]);

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
        <Tabs.Screen name="index" options={calendarOptions} />
        <Tabs.Screen name="attendance" options={attendanceOptions} />
        <Tabs.Screen name="points/index" options={pointsOptions} />
        <Tabs.Screen name="newsletter" options={newsOptions} />
        <Tabs.Screen name="account/index" options={accountOptions} />
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
