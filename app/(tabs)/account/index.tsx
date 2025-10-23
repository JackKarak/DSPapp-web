/**
 * Account Tab - Refactored (< 500 lines)
 * 
 * Minimal presentation layer - all logic in useAccountData hook
 */

import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { Colors } from '../../../constants/colors';
import * as DocumentPicker from 'expo-document-picker';
import { AccountDeletionService } from '../../../lib/accountDeletion';

// Components
import { ProfileSection } from '../../../components/AccountSections/ProfileSection';
import { UserHeader } from '../../../components/AccountSections/UserHeader';
import { AnalyticsSection } from '../../../components/AccountSections/AnalyticsSection';
import { EventsSection } from '../../../components/AccountSections/EventsSection';
import { AppealsSection } from '../../../components/AccountSections/AppealsSection';
import { TestBankSection } from '../../../components/AccountSections/TestBankSection';
import { SettingsSection } from '../../../components/AccountSections/SettingsSection';
import { TestBankModal } from '../../../components/AccountModals/TestBankModal';
import { PointAppealModal } from '../../../components/AccountModals/PointAppealModal';
import { EventFeedbackModal } from '../../../components/AccountModals/EventFeedbackModal';
import { DataConsentModal } from '../../../components/DataConsentModal';
import { AccountDeletionModal } from '../../../components/AccountModals/AccountDeletionModal';

// Hook
import { useAccountData } from './hooks/useAccountData';

export default function AccountTab() {
  const account = useAccountData();
  const [deletionModalVisible, setDeletionModalVisible] = useState(false);
  const [deletionConfirmText, setDeletionConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Account deletion handler
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to permanently delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => setDeletionModalVisible(true) }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (deletionConfirmText.toLowerCase() !== 'delete my account') {
      Alert.alert('Error', 'Please type "DELETE MY ACCOUNT" to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const result = await AccountDeletionService.deleteAccount(user.id);

      if (result.success) {
        Alert.alert('Success', 'Your account has been deleted successfully.');
        await supabase.auth.signOut();
      } else {
        Alert.alert('Error', result.error || 'Failed to delete account. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeletionModalVisible(false);
      setDeletionConfirmText('');
    }
  };

  // File picker for test bank
  const handleTestBankFilePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
    });
    
    if (!result.canceled && result.assets[0]) {
      account.setTestBankSelectedFile(result.assets[0]);
    }
  };

  // File picker for appeal
  const handleAppealFilePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
    });
    
    if (!result.canceled && result.assets[0]) {
      account.setAppealPictureUrl(result.assets[0].uri);
    }
  };

  // Loading state
  if (account.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading account...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (account.error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{account.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={account.fetchAccountData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={account.refreshing}
            onRefresh={account.handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* User Header with Name and Tags */}
        <UserHeader
          profile={account.profile}
          analytics={account.analytics}
        />

        {/* Analytics Section */}
        <AnalyticsSection
          analytics={account.analytics}
        />

        {/* Profile Section */}
        <ProfileSection
          profile={account.profile}
          isEditing={account.isEditing}
          formData={account.formData}
          userConsent={account.userConsent}
          canEdit={account.canEdit}
          nextEditDate={account.nextEditDate}
          daysUntilEdit={account.daysUntilEdit}
          onUpdate={account.updateField}
          onSave={account.saveProfile}
          onCancel={account.cancelEdit}
          onStartEdit={account.startEditing}
          saving={account.saving}
        />

        {/* Events Section */}
        <EventsSection
          events={account.events}
          submittedFeedback={account.submittedFeedback}
          expanded={account.eventsExpanded}
          onToggleExpanded={() => account.setEventsExpanded(!account.eventsExpanded)}
          onFeedbackPress={account.handleFeedbackPress}
        />

        {/* Appeals Section */}
        {account.profile?.role !== 'pledge' && (
          <AppealsSection
            userAppeals={account.appeals}
            appealableEvents={account.appealableEvents}
            onAppealPress={account.handleAppealPress}
            userRole={account.profile?.role}
          />
        )}

        {/* Test Bank Section */}
        <TestBankSection
          submissions={account.testBankSubmissions}
          expanded={account.testBankExpanded}
          onToggleExpanded={() => account.setTestBankExpanded(!account.testBankExpanded)}
          onUploadPress={account.handleOpenTestBankModal}
        />

        {/* Settings Section */}
        <SettingsSection
          onManageDataPreferences={() => account.setConsentModalVisible(true)}
          onDeleteAccount={handleDeleteAccount}
        />

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://sites.google.com/terpmail.umd.edu/dspapp/privacy-policy?authuser=0')}
            style={styles.footerLink}
          >
            <Text style={styles.footerLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>•</Text>
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://sites.google.com/terpmail.umd.edu/dspapp/terms-of-service?authuser=0')}
            style={styles.footerLink}
          >
            <Text style={styles.footerLinkText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>•</Text>
          <TouchableOpacity 
            onPress={handleLogout}
            style={styles.footerLink}
          >
            <Text style={styles.footerLinkText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Data Consent Modal */}
      <DataConsentModal
        visible={account.consentModalVisible}
        onAccept={account.handleConsentAccept}
        onDecline={account.handleConsentDecline}
        onClose={() => account.setConsentModalVisible(false)}
      />

      {/* Test Bank Modal */}
      <TestBankModal
        visible={account.testBankModalVisible}
        onClose={() => account.setTestBankModalVisible(false)}
        onSubmit={account.handleTestBankSubmit}
        classCode={account.testBankClassCode}
        fileType={account.testBankFileType}
        selectedFile={account.testBankSelectedFile}
        onUpdateClassCode={account.setTestBankClassCode}
        onUpdateFileType={account.setTestBankFileType}
        onPickFile={handleTestBankFilePick}
      />

      {/* Point Appeal Modal */}
      <PointAppealModal
        visible={account.appealModalVisible}
        event={account.selectedAppealEvent}
        onClose={() => account.setAppealModalVisible(false)}
        onSubmit={account.handleSubmitAppeal}
        appealReason={account.appealReason}
        appealPictureUrl={account.appealPictureUrl}
        onUpdateReason={account.setAppealReason}
        onUpdatePictureUrl={account.setAppealPictureUrl}
        submitting={account.submittingAppeal}
      />

      {/* Event Feedback Modal */}
      <EventFeedbackModal
        visible={account.feedbackModalVisible}
        event={account.selectedFeedbackEvent}
        onClose={() => account.setFeedbackModalVisible(false)}
        onSubmit={account.handleSubmitFeedback}
        feedbackData={account.feedbackData}
        onUpdateFeedback={account.handleUpdateFeedback}
        submitting={account.submittingFeedback}
      />

      {/* Account Deletion Modal */}
      <AccountDeletionModal
        visible={deletionModalVisible}
        onClose={() => {
          setDeletionModalVisible(false);
          setDeletionConfirmText('');
        }}
        onConfirm={confirmDeleteAccount}
        confirmationText={deletionConfirmText}
        onUpdateConfirmationText={setDeletionConfirmText}
        deleting={isDeleting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  footerLink: {
    paddingHorizontal: 8,
  },
  footerLinkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  footerSeparator: {
    color: '#999',
    fontSize: 14,
  },
});
