import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useOfficerRole } from '../../hooks/useOfficerRole';

export default function SpecsScreen() {
  const router = useRouter();
  const { role, loading } = useOfficerRole();

  // Mapping of officer positions to their corresponding officer_control pages
  const positionToControlPage: Record<string, string> = {
    'vp_scholarship': 'scholarship',
    'marketing': 'marketing',
    'brotherhood': 'brotherhood',
    'vp_professional': 'professional',
    'vp_service': 'service',
  };

  const handleRoleAccess = () => {
    if (!role?.position) return;
    
    const controlPage = positionToControlPage[role.position.toLowerCase()];
    
    if (controlPage) {
      router.push(`/officer_control/${controlPage}` as any);
    }
  };

  const getRoleIcon = (position: string | null): keyof typeof Ionicons.glyphMap => {
    if (!position) return 'person-outline';
    
    const pos = position.toLowerCase();
    switch (pos) {
      case 'vp_scholarship':
        return 'library-outline';
      case 'marketing':
      case 'vp_branding':
        return 'megaphone-outline';
      case 'brotherhood':
        return 'people-outline';
      case 'vp_professional':
        return 'briefcase-outline';
      case 'vp_service':
        return 'heart-outline';
      case 'vp_operations':
        return 'settings-outline';
      case 'vp_finance':
        return 'card-outline';
      case 'vp_pledge_ed':
        return 'school-outline';
      case 'svp':
        return 'star-outline';
      case 'social':
        return 'happy-outline';
      case 'wellness':
        return 'fitness-outline';
      case 'fundraising':
        return 'cash-outline';
      case 'risk':
        return 'shield-outline';
      case 'historian':
        return 'camera-outline';
      case 'chancellor':
        return 'hammer-outline';
      default:
        return 'person-outline';
    }
  };

  const getPositionLabel = (position: string | null): string => {
    if (!position) return 'No Position';
    
    const pos = position.toLowerCase();
    switch (pos) {
      case 'vp_scholarship':
        return 'VP Scholarship';
      case 'marketing':
        return 'Marketing Chair';
      case 'vp_branding':
        return 'VP Branding';
      case 'brotherhood':
        return 'Brotherhood Chair';
      case 'vp_professional':
        return 'VP Professional';
      case 'vp_service':
        return 'VP Community Service';
      case 'president':
        return 'President';
      case 'vp_operations':
        return 'VP Operations';
      case 'vp_finance':
        return 'VP Finance';
      case 'vp_pledge_ed':
        return 'VP Pledge Education';
      case 'svp':
        return 'SVP';
      case 'vp_dei':
        return 'VP DEI';
      case 'social':
        return 'Social Chair';
      case 'wellness':
        return 'Wellness Chair';
      case 'fundraising':
        return 'Fundraising Chair';
      case 'risk':
        return 'Risk Manager';
      case 'historian':
        return 'Historian';
      case 'chancellor':
        return 'Chancellor';
      default:
        return position.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#330066" />
      </SafeAreaView>
    );
  }

  if (!role?.is_officer || !role?.position) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="alert-circle-outline" size={64} color="#999" />
          <Text style={styles.errorText}>No officer position assigned</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasControlPage = positionToControlPage[role.position.toLowerCase()];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.roleHeader}>
          <Ionicons 
            name={getRoleIcon(role.position)} 
            size={80} 
            color="#330066" 
          />
          <Text style={styles.roleTitle}>
            {getPositionLabel(role.position)}
          </Text>
          <Text style={styles.roleSubtitle}>
            Officer Dashboard
          </Text>
        </View>

        <View style={styles.actionContainer}>
          {hasControlPage ? (
            <TouchableOpacity
              style={styles.accessButton}
              onPress={handleRoleAccess}
              activeOpacity={0.7}
            >
              <Ionicons name="enter-outline" size={24} color="white" />
              <Text style={styles.accessButtonText}>
                Access Role Controls
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={48} color="#999" />
              <Text style={styles.emptyText}>Such Empty</Text>
              <Text style={styles.emptySubtext}>
                No specific controls available for this role
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Role Information</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Position:</Text>
            <Text style={styles.infoValue}>{getPositionLabel(role.position)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[styles.infoValue, styles.activeStatus]}>Active Officer</Text>
          </View>
          {hasControlPage && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Special Access:</Text>
              <Text style={styles.infoValue}>Control Panel Available</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  roleHeader: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330066',
    marginTop: 16,
    textAlign: 'center',
  },
  roleSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  actionContainer: {
    marginBottom: 40,
  },
  accessButton: {
    backgroundColor: '#330066',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  accessButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
    marginTop: 8,
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330066',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  activeStatus: {
    color: '#28a745',
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});
