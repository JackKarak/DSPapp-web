import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useOfficer } from '../contexts/OfficerContext';

interface PermissionGuardProps {
  permissions?: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showFallback?: boolean;
}

export default function PermissionGuard({ 
  permissions, 
  fallback, 
  children, 
  showFallback = true 
}: PermissionGuardProps) {
  const { hasPermission, loading, isOfficer } = useOfficer();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If no permissions specified, just check if user is an officer
  if (!permissions) {
    return isOfficer ? <>{children}</> : (showFallback ? renderFallback() : null);
  }

  // Check single permission
  if (typeof permissions === 'string') {
    return hasPermission(permissions) ? <>{children}</> : (showFallback ? renderFallback() : null);
  }

  // Check multiple permissions (user needs at least one)
  const hasAnyPermission = permissions.some(permission => hasPermission(permission));
  return hasAnyPermission ? <>{children}</> : (showFallback ? renderFallback() : null);

  function renderFallback() {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <View style={styles.noPermissionContainer}>
        <Text style={styles.noPermissionText}>
          You don't have permission to access this feature.
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#687076',
    fontSize: 16,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPermissionText: {
    color: '#687076',
    fontSize: 16,
    textAlign: 'center',
  },
});
