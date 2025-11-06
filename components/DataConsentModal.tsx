/**
 * Data Consent Modal
 * 
 * Displays consent form before collecting optional diversity/demographic data
 * 
 * Apple Compliance:
 * - Clearly explains what data is collected
 * - Explains why data is needed
 * - Makes it clear data is optional
 * - Provides granular consent options
 * - Allows users to skip or opt-out
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const dspPurple = Colors.primary; // Use DSP Purple for consistency

interface DataConsentModalProps {
  visible: boolean;
  onAccept: (consent: ConsentOptions) => void;
  onDecline: () => void;
  onClose: () => void;
}

export interface ConsentOptions {
  demographics: boolean;  // Gender, pronouns, race, sexual orientation
  academic: boolean;      // Major, minor, graduation year details
  housing: boolean;       // Living situation, house membership
  analytics: boolean;     // Allow aggregated analytics
}

export function DataConsentModal({
  visible,
  onAccept,
  onDecline,
  onClose,
}: DataConsentModalProps) {
  const [consent, setConsent] = useState<ConsentOptions>({
    demographics: false,
    academic: false,
    housing: false,
    analytics: false,
  });

  const toggleConsent = (key: keyof ConsentOptions) => {
    setConsent(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAccept = () => {
    onAccept(consent);
  };

  const handleDecline = () => {
    // All false
    onAccept({
      demographics: false,
      academic: false,
      housing: false,
      analytics: false,
    });
  };

  const allSelected = Object.values(consent).every(v => v);
  const noneSelected = Object.values(consent).every(v => !v);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="shield-checkmark" size={32} color="dspPurple" />
            <Text style={styles.title}>Your Privacy Matters</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close"
            accessibilityHint="Double tap to close this consent form"
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Optional Information</Text>
            <Text style={styles.description}>
              To help us build a more inclusive fraternity, we'd like to collect some
              optional demographic information. This data helps us:
            </Text>
            <Text style={styles.bullet}>• Ensure diversity and inclusion</Text>
            <Text style={styles.bullet}>• Identify areas for improvement</Text>
            <Text style={styles.bullet}>• Track progress toward our goals</Text>
            <Text style={styles.bullet}>• Make data-driven decisions</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Your Data Rights</Text>
            <Text style={styles.description}>
              All information below is completely optional:
            </Text>
            <Text style={styles.bullet}>• You can skip any or all fields</Text>
            <Text style={styles.bullet}>• You can change your mind anytime</Text>
            <Text style={styles.bullet}>• You can delete your data anytime</Text>
            <Text style={styles.bullet}>• Data is only used for aggregate statistics</Text>
            <Text style={styles.bullet}>• Individual responses are confidential</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.consentTitle}>Choose what to share:</Text>

          {/* Demographics Consent */}
          <View style={styles.consentItem}>
            <View style={styles.consentHeader}>
              <View style={styles.consentInfo}>
                <Text style={styles.consentLabel}>Demographics & Identity</Text>
                <Text style={styles.consentDescription}>
                  Gender, pronouns, race/ethnicity, sexual orientation
                </Text>
              </View>
              <Switch
                value={consent.demographics}
                onValueChange={() => toggleConsent('demographics')}
                trackColor={{ false: '#d1d5db', true: 'dspPurple' }}
                thumbColor="#ffffff"
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel="Share demographics and identity information"
                accessibilityHint="Toggle to allow sharing of gender, pronouns, race, ethnicity, and sexual orientation"
                accessibilityState={{ checked: consent.demographics }}
              />
            </View>
          </View>

          {/* Academic Consent */}
          <View style={styles.consentItem}>
            <View style={styles.consentHeader}>
              <View style={styles.consentInfo}>
                <Text style={styles.consentLabel}>Academic Details</Text>
                <Text style={styles.consentDescription}>
                  Major, minor, specific graduation date
                </Text>
              </View>
              <Switch
                value={consent.academic}
                onValueChange={() => toggleConsent('academic')}
                trackColor={{ false: '#d1d5db', true: 'dspPurple' }}
                thumbColor="#ffffff"
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel="Share academic details"
                accessibilityHint="Toggle to allow sharing of major, minor, and graduation date"
                accessibilityState={{ checked: consent.academic }}
              />
            </View>
          </View>

          {/* Housing Consent */}
          <View style={styles.consentItem}>
            <View style={styles.consentHeader}>
              <View style={styles.consentInfo}>
                <Text style={styles.consentLabel}>Housing Information</Text>
                <Text style={styles.consentDescription}>
                  Living situation, house membership
                </Text>
              </View>
              <Switch
                value={consent.housing}
                onValueChange={() => toggleConsent('housing')}
                trackColor={{ false: '#d1d5db', true: 'dspPurple' }}
                thumbColor="#ffffff"
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel="Share housing information"
                accessibilityHint="Toggle to allow sharing of living situation and house membership"
                accessibilityState={{ checked: consent.housing }}
              />
            </View>
          </View>

          {/* Analytics Consent */}
          <View style={styles.consentItem}>
            <View style={styles.consentHeader}>
              <View style={styles.consentInfo}>
                <Text style={styles.consentLabel}>Analytics & Insights</Text>
                <Text style={styles.consentDescription}>
                  Use my data for aggregated chapter analytics
                </Text>
              </View>
              <Switch
                value={consent.analytics}
                onValueChange={() => toggleConsent('analytics')}
                trackColor={{ false: '#d1d5db', true: 'dspPurple' }}
                thumbColor="#ffffff"
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel="Allow analytics and insights"
                accessibilityHint="Toggle to allow use of your data for aggregated chapter analytics"
                accessibilityState={{ checked: consent.analytics }}
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="dspPurple" />
            <Text style={styles.infoText}>
              Tip: You can select "Continue" even if you don't enable anything. 
              All required information is collected separately.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.smallText}>
              By continuing, you agree to our{' '}
              <Text 
                style={styles.link}
                onPress={() => Linking.openURL('https://sites.google.com/terpmail.umd.edu/dspapp/privacy-policy?authuser=0')}
              >
                Privacy Policy
              </Text> and{' '}
              <Text 
                style={styles.link}
                onPress={() => Linking.openURL('https://sites.google.com/terpmail.umd.edu/dspapp/terms-of-service?authuser=0')}
              >
                Terms of Service
              </Text>. You can manage your
              data preferences anytime from your account settings.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.skipButton]}
            onPress={handleDecline}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Skip all data sharing"
            accessibilityHint="Double tap to continue without sharing any optional information"
          >
            <Text style={styles.skipButtonText}>Skip All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.continueButton]}
            onPress={handleAccept}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={noneSelected ? 'Continue without sharing' : allSelected ? 'Share all selected information' : 'Continue with selected preferences'}
            accessibilityHint="Double tap to save your preferences and continue"
          >
            <Text style={styles.continueButtonText}>
              {noneSelected ? 'Continue Without Sharing' : allSelected ? 'Share All' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  bullet: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    marginLeft: 8,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 24,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  consentItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  consentInfo: {
    flex: 1,
    marginRight: 12,
  },
  consentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  consentDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  smallText: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
    textAlign: 'center',
  },
  link: {
    color: 'dspPurple',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  continueButton: {
    backgroundColor: '#330066',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
