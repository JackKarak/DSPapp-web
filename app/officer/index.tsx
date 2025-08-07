import React from 'react';
import { View } from 'react-native';
import OfficerDashboard from '../../components/officer/OfficerDashboard';
import PermissionGuard from '../../components/PermissionGuard';

export default function OfficerIndex() {
  return (
    <View style={{ flex: 1 }}>
      <PermissionGuard>
        <OfficerDashboard />
      </PermissionGuard>
    </View>
  );
}
