import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ImageBackground, TouchableOpacity, Text } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import background from '@/assets/images/background.png'; // make sure this path is correct

export default function TabsLayout() {
  const router = useRouter();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error.message);
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <ImageBackground source={background} style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#F7B910', // Gold
          tabBarInactiveTintColor: '#ADAFAA', // Silver
          tabBarStyle: {
            backgroundColor: '#330066',
            borderTopColor: '#ADAFAA',
          },
          headerStyle: {
            backgroundColor: '#330066',
          },
          headerTintColor: '#fff',
          tabBarLabelStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => (
            <TouchableOpacity onPress={handleSignOut} style={{ marginRight: 16 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Sign Out</Text>
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: 'Attendance',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkbox-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="points"
          options={{
            title: 'Points',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="newsletter"
          options={{
            title: 'News',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="newspaper-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Account',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </ImageBackground>
  );
}
