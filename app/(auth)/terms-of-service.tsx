/**
 * Terms of Service Screen
 * 
 * Displays the terms of service within the app for legal compliance
 */

import React from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  const openFullTerms = () => {
    Linking.openURL('https://sites.google.com/terpmail.umd.edu/dspapp/terms-of-service?authuser=0');
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
        <Text style={styles.title}>Terms of Service</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Effective Date: October 16, 2025</Text>
        <Text style={styles.lastUpdated}>Last Updated: October 16, 2025</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By downloading, installing, or using The DSP App ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the App.
        </Text>
        
        <Text style={styles.subsectionTitle}>1.1 Eligibility</Text>
        <Text style={styles.paragraph}>To use the App, you must:</Text>
        <Text style={styles.bullet}>• Be a current member, pledge, officer, or other authorized user of the Delta Sigma Pi Gamma Sigma Chapter</Text>
        <Text style={styles.bullet}>• Be at least 13 years of age (typically 18+ as a college student)</Text>
        <Text style={styles.bullet}>• Have the authority to enter into this agreement</Text>
        <Text style={styles.bullet}>• Use the App in compliance with all applicable laws, university policies, and fraternity regulations</Text>

        <Text style={styles.subsectionTitle}>1.2 Account Registration</Text>
        <Text style={styles.paragraph}>You agree to:</Text>
        <Text style={styles.bullet}>• Provide accurate and complete information during registration</Text>
        <Text style={styles.bullet}>• Maintain the confidentiality of your login credentials</Text>
        <Text style={styles.bullet}>• Notify us immediately of any unauthorized access or security breach</Text>
        <Text style={styles.bullet}>• Maintain only one active account per individual</Text>
        <Text style={styles.paragraph}>
          You are solely responsible for all activity conducted under your account.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        
        <Text style={styles.subsectionTitle}>2.1 Purpose</Text>
        <Text style={styles.paragraph}>
          The DSP App is a platform designed to enhance member engagement and professional development within the Delta Sigma Pi Gamma Sigma Chapter through features such as:
        </Text>
        <Text style={styles.bullet}>• Member Engagement: Event attendance tracking and point management</Text>
        <Text style={styles.bullet}>• Professional Networking: Chapter connections and career-related communication</Text>
        <Text style={styles.bullet}>• Communication: Chapter announcements, push notifications, and updates</Text>
        <Text style={styles.bullet}>• Event Management: Calendar integration and attendance verification</Text>
        <Text style={styles.bullet}>• Administrative Tools: Officer-level tools for event and membership management</Text>
        <Text style={styles.bullet}>• Achievement Tracking: Recognition of points, milestones, and rankings</Text>

        <Text style={styles.subsectionTitle}>2.2 Availability</Text>
        <Text style={styles.paragraph}>
          The App is provided on an "as-is" and "as-available" basis. While we strive for reliable performance, uninterrupted service cannot be guaranteed. Access may be temporarily limited during maintenance or updates, and features may change with or without notice.
        </Text>

        <Text style={styles.sectionTitle}>3. User Responsibilities and Conduct</Text>
        
        <Text style={styles.subsectionTitle}>3.1 Acceptable Use</Text>
        <Text style={styles.paragraph}>You agree to use the App only for its intended purposes and in accordance with:</Text>
        <Text style={styles.bullet}>• The values and principles of Delta Sigma Pi</Text>
        <Text style={styles.bullet}>• Your university's code of conduct</Text>
        <Text style={styles.bullet}>• Applicable laws and regulations</Text>

        <Text style={styles.subsectionTitle}>3.2 Prohibited Activities</Text>
        <Text style={styles.paragraph}>You may not:</Text>
        <Text style={styles.bullet}>• Harass or Discriminate: Engage in bullying, hate speech, or discriminatory conduct</Text>
        <Text style={styles.bullet}>• Spread Misinformation: Post false or misleading event or member information</Text>
        <Text style={styles.bullet}>• Violate Privacy: Share another member's personal information without consent</Text>
        <Text style={styles.bullet}>• Disrupt the App: Attempt to hack, reverse-engineer, or damage the App's functionality</Text>
        <Text style={styles.bullet}>• Impersonate Others: Misrepresent your identity or role within the fraternity</Text>
        <Text style={styles.bullet}>• Share Illegal Content: Post or promote illegal or inappropriate materials</Text>
        <Text style={styles.bullet}>• Spam Users: Send unsolicited or excessive communications</Text>

        <Text style={styles.subsectionTitle}>3.3 Content Standards</Text>
        <Text style={styles.paragraph}>All user content must:</Text>
        <Text style={styles.bullet}>• Reflect Delta Sigma Pi's core values of service, scholarship, and brotherhood</Text>
        <Text style={styles.bullet}>• Maintain professionalism suitable for a business and educational environment</Text>
        <Text style={styles.bullet}>• Respect privacy, dignity, and intellectual property rights</Text>
        <Text style={styles.bullet}>• Comply with all copyright and fair use laws</Text>

        <Text style={styles.sectionTitle}>4. Privacy and Data Protection</Text>
        
        <Text style={styles.subsectionTitle}>4.1 Data Collection and Use</Text>
        <Text style={styles.paragraph}>
          Your use of the App is governed by our Privacy Policy, incorporated by reference into these Terms. Key data practices include:
        </Text>
        <Text style={styles.bullet}>• Collecting membership and academic information for verification</Text>
        <Text style={styles.bullet}>• Tracking attendance and participation data</Text>
        <Text style={styles.bullet}>• Securing all personal data using encryption and restricted access</Text>
        <Text style={styles.bullet}>• Sharing information only for legitimate fraternity and administrative purposes</Text>

        <Text style={styles.subsectionTitle}>4.2 Communications</Text>
        <Text style={styles.paragraph}>By using the App, you consent to receive:</Text>
        <Text style={styles.bullet}>• Chapter and event notifications</Text>
        <Text style={styles.bullet}>• Administrative communications from officers</Text>
        <Text style={styles.bullet}>• Achievement and technical updates</Text>
        <Text style={styles.paragraph}>
          You may opt out of non-essential communications via your account settings.
        </Text>

        <Text style={styles.sectionTitle}>5. Intellectual Property Rights</Text>
        
        <Text style={styles.subsectionTitle}>5.1 Ownership</Text>
        <Text style={styles.paragraph}>
          The DSP App, including its software, content, design, and features, is the exclusive property of the Delta Sigma Pi Gamma Sigma Chapter and its licensors, protected under intellectual property laws.
        </Text>

        <Text style={styles.subsectionTitle}>5.2 User Content</Text>
        <Text style={styles.paragraph}>
          You retain ownership of your content but grant the fraternity a limited, non-exclusive, royalty-free license to:
        </Text>
        <Text style={styles.bullet}>• Display and process your data for App functionality</Text>
        <Text style={styles.bullet}>• Share achievements and participation data with authorized officers</Text>
        <Text style={styles.bullet}>• Archive historical records for chapter documentation</Text>

        <Text style={styles.subsectionTitle}>5.3 Trademarks</Text>
        <Text style={styles.paragraph}>
          All Delta Sigma Pi logos, marks, and branding are protected property. You may not use them without prior written authorization.
        </Text>

        <Text style={styles.sectionTitle}>6. Account Management and Termination</Text>
        
        <Text style={styles.subsectionTitle}>6.1 Suspension</Text>
        <Text style={styles.paragraph}>Your account may be suspended if you:</Text>
        <Text style={styles.bullet}>• Violate these Terms or Community Guidelines</Text>
        <Text style={styles.bullet}>• Engage in misconduct or harassment</Text>
        <Text style={styles.bullet}>• Pose a security risk</Text>
        <Text style={styles.bullet}>• Lose membership or enrollment eligibility</Text>

        <Text style={styles.subsectionTitle}>6.2 Termination</Text>
        <Text style={styles.paragraph}>Your account may be terminated for:</Text>
        <Text style={styles.bullet}>• Serious or repeated violations of these Terms</Text>
        <Text style={styles.bullet}>• Fraudulent or unauthorized activity</Text>
        <Text style={styles.bullet}>• Official request by chapter leadership or the university</Text>

        <Text style={styles.subsectionTitle}>6.3 Data Handling</Text>
        <Text style={styles.paragraph}>Upon termination:</Text>
        <Text style={styles.bullet}>• Your personal data will be managed in accordance with the Privacy Policy</Text>
        <Text style={styles.bullet}>• Historical records may be retained for chapter archives</Text>
        <Text style={styles.bullet}>• You may request full data deletion, subject to legal and recordkeeping requirements</Text>
        <Text style={styles.bullet}>• All App access will be revoked immediately</Text>

        <Text style={styles.sectionTitle}>7. Disclaimers and Limitations of Liability</Text>
        
        <Text style={styles.subsectionTitle}>7.1 Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>
          The App is provided "as is," without warranties of any kind. Delta Sigma Pi Gamma Sigma Chapter does not guarantee uninterrupted service, error-free operation, or specific results.
        </Text>

        <Text style={styles.subsectionTitle}>7.2 Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          To the fullest extent permitted by law, the fraternity shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.
        </Text>

        <Text style={styles.sectionTitle}>8. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these Terms at any time. Continued use of the App after changes constitutes acceptance of the modified Terms. You will be notified of significant changes within the app.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact Information</Text>
        <Text style={styles.paragraph}>
          For questions about these Terms, please contact:
        </Text>
        <Text style={styles.bullet}>• Email: support@deltasigmapi.org</Text>
        <Text style={styles.bullet}>• Chapter: Delta Sigma Pi - Gamma Sigma Chapter</Text>

        <TouchableOpacity style={styles.linkButton} onPress={openFullTerms}>
          <Text style={styles.linkText}>View Full Terms Online</Text>
          <Ionicons name="open-outline" size={20} color="#4285F4" />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using this app, you agree to these Terms of Service and our Privacy Policy.
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
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330066',
    marginTop: 24,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330066',
    marginTop: 16,
    marginBottom: 8,
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
