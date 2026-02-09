/**
 * Privacy Policy Screen
 * 
 * Displays the privacy policy within the app for Apple compliance
 * Apple requires privacy policy to be accessible from within the app
 */

import React from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const openFullPolicy = () => {
    Linking.openURL('https://sites.google.com/terpmail.umd.edu/dspapp/privacy-policy?authuser=0');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#330066" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: October 23, 2025</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          The DSP App collects the following information to provide fraternity management services:
        </Text>
        <Text style={styles.bullet}>• Account Information: Name, email, password</Text>
        <Text style={styles.bullet}>• Profile Information: Pledge class, graduation year, major, role</Text>
        <Text style={styles.bullet}>• Event Data: RSVPs, attendance, check-ins</Text>
        <Text style={styles.bullet}>• Points & Performance: Point totals, appeals, achievements</Text>
        <Text style={styles.bullet}>• Optional Diversity Data: Gender, pronouns, race, sexual orientation (only if you provide it)</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to:
        </Text>
        <Text style={styles.bullet}>• Manage fraternity membership and activities</Text>
        <Text style={styles.bullet}>• Track event attendance and points</Text>
        <Text style={styles.bullet}>• Generate analytics for chapter improvement (aggregated only)</Text>
        <Text style={styles.bullet}>• Send notifications about events and updates</Text>
        <Text style={styles.bullet}>• Ensure chapter diversity and inclusion (optional data)</Text>

        <Text style={styles.sectionTitle}>3. Data Security</Text>
        <Text style={styles.paragraph}>
          Your data is protected using:
        </Text>
        <Text style={styles.bullet}>• Encrypted storage on device</Text>
        <Text style={styles.bullet}>• Secure HTTPS connections</Text>
        <Text style={styles.bullet}>• Industry-standard authentication</Text>
        <Text style={styles.bullet}>• Regular security audits</Text>

        <Text style={styles.sectionTitle}>4. Data Sharing</Text>
        <Text style={styles.paragraph}>
          We do NOT sell your data. We only share information with:
        </Text>
        <Text style={styles.bullet}>• Chapter officers (for management purposes)</Text>
        <Text style={styles.bullet}>• Other members (limited profile information)</Text>
        <Text style={styles.bullet}>• Service providers (Supabase for hosting)</Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to:
        </Text>
        <Text style={styles.bullet}>• Access your personal data</Text>
        <Text style={styles.bullet}>• Correct inaccurate data</Text>
        <Text style={styles.bullet}>• Delete your account and data</Text>
        <Text style={styles.bullet}>• Opt out of optional data collection</Text>
        <Text style={styles.bullet}>• Export your data</Text>

        <Text style={styles.sectionTitle}>6. Optional Information</Text>
        <Text style={styles.paragraph}>
          Diversity and demographic information is completely optional. You can:
        </Text>
        <Text style={styles.bullet}>• Skip any or all fields</Text>
        <Text style={styles.bullet}>• Remove this data anytime from your profile</Text>
        <Text style={styles.bullet}>• Your information is only used for aggregate statistics</Text>

        <Text style={styles.sectionTitle}>7. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your data while you're an active member. After account deletion:
        </Text>
        <Text style={styles.bullet}>• Personal data is deleted within 30 days</Text>
        <Text style={styles.bullet}>• Aggregated statistics (anonymous) may be retained</Text>
        <Text style={styles.bullet}>• Event history may be retained for chapter records</Text>

        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          This app is intended for college students 18 years or older. We do not knowingly collect 
          information from children under 18.
        </Text>

        <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this policy periodically. You'll be notified of significant changes within 
          the app.
        </Text>

        <Text style={styles.sectionTitle}>10. Contact Us</Text>
        <Text style={styles.paragraph}>
          Questions about privacy? Contact us at:
        </Text>
        <Text style={styles.bullet}>• Email: privacy@deltasigmapi.org</Text>
        <Text style={styles.bullet}>• Chapter: Delta Sigma Pi - Gamma Sigma Chapter</Text>

        <TouchableOpacity style={styles.linkButton} onPress={openFullPolicy}>
          <Text style={styles.linkText}>View Full Policy Online</Text>
          <Ionicons name="open-outline" size={20} color="#4285F4" />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using this app, you agree to this Privacy Policy and our Terms of Service.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : (Platform.OS === 'web' ? 20 : 16),
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330066',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330066',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginLeft: 16,
    marginBottom: 4,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  linkText: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: '600',
    marginRight: 8,
  },
  footer: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F7B910',
    marginTop: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
