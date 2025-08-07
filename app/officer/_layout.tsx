import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, useLocalSearchParams } from 'expo-router';
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
        return ['officerindex', 'analytics', 'events', 'register'];
        
      // VP Scholarship - Unique Testbank Access ONLY
      case 'vp_scholarship':
        console.log('Access: VP Scholarship');
        return ['officerindex', 'analytics', 'events', 'register', 'scholarship'];
        
      // Marketing - Unique Marketing Tools ONLY
      case 'marketing':
        console.log('Access: Marketing');
        return ['officerindex', 'analytics', 'events', 'register', 'marketing'];
        
      // Event-Creating VPs
      case 'vp_professional':
      case 'vp_service':
      case 'vp_dei':
      case 'vp_pledge_ed':
      case 'brotherhood':
      case 'vp_branding':
        console.log('Access: Event-creating VP');
        return ['officerindex', 'analytics', 'events', 'register'];
        
      // Event-Creating Chairs (when their files are created)
      case 'social':
        console.log('Access: Social chair');
        return ['officerindex', 'analytics', 'events', 'register']; // Add 'social' when file exists
      case 'wellness':
        console.log('Access: Wellness chair');
        return ['officerindex', 'analytics', 'events', 'register']; // Add 'wellness' when file exists
      case 'fundraising':
        console.log('Access: Fundraising chair');
        return ['officerindex', 'analytics', 'events', 'register']; // Add 'fundraising' when file exists
        
      // Administrative Roles - View Only
      case 'vp_operations':
      case 'vp_finance':
      case 'historian':
      case 'risk':
        console.log('Access: Administrative role');
        return ['officerindex', 'analytics', 'events'];
        
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
      {/* Scholarship tab - VP Scholarship only */}
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
      {/* Marketing tab - Marketing officer only */}
      {accessibleTabs.includes('marketing') && (
        <Tabs.Screen
          name="marketing"
          options={{
            title: 'Marketing',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="megaphone-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      {/* Uncomment these when the corresponding files are created:
      
      {accessibleTabs.includes('wellness') && (
        <Tabs.Screen
          name="wellness"
          options={{
            title: 'Wellness',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      
      {accessibleTabs.includes('fundraising') && (
        <Tabs.Screen
          name="fundraising"
          options={{
            title: 'Fundraising',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      
      {accessibleTabs.includes('social') && (
        <Tabs.Screen
          name="social"
          options={{
            title: 'Social',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      
      {accessibleTabs.includes('branding') && (
        <Tabs.Screen
          name="branding"
          options={{
            title: 'Branding',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="color-palette-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      */}
    </Tabs>
  );
}
