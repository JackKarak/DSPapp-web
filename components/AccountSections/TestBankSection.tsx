/**
 * TestBankSection Component
 * 
 * Displays user's test bank submissions and allows new uploads
 * Follows modern patterns:
 * - Clean component composition
 * - Icon-enhanced UI
 * - Purple theme consistency
 * - Expandable/collapsible
 * - Modern card design
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface TestBankSubmission {
  id: string;
  class_code: string;
  file_type: 'test' | 'notes' | 'materials';
  original_file_name: string;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface TestBankSectionProps {
  submissions: TestBankSubmission[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onUploadPress: () => void;
}

export const TestBankSection: React.FC<TestBankSectionProps> = ({
  submissions,
  expanded,
  onToggleExpanded,
  onUploadPress,
}) => {

  // Get status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          bg: '#dcfce7',
          border: '#16a34a',
          text: '#15803d',
          emoji: '✅',
        };
      case 'rejected':
        return {
          bg: '#fee2e2',
          border: '#dc2626',
          text: '#991b1b',
          emoji: '❌',
        };
      case 'pending':
      default:
        return {
          bg: '#fef3c7',
          border: '#f59e0b',
          text: '#92400e',
          emoji: '⏳',
        };
    }
  };

  // Get file type styling
  const getFileTypeStyle = (fileType: string) => {
    switch (fileType) {
      case 'test':
        return {
          emoji: '📝',
          label: 'Test',
          color: '#8b5cf6',
        };
      case 'notes':
        return {
          emoji: '📓',
          label: 'Notes',
          color: '#3b82f6',
        };
      case 'materials':
        return {
          emoji: '📚',
          label: 'Assignment',
          color: '#10b981',
        };
      default:
        return {
          emoji: '📄',
          label: 'File',
          color: '#6b7280',
        };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Stats
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const totalCount = submissions.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <Pressable
        onPress={onToggleExpanded}
        accessibilityRole="button"
        accessibilityLabel="Toggle test bank section"
        accessibilityState={{ expanded }}
      >
        {({ pressed }) => (
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, pressed && styles.headerPressed]}
          >
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Text style={styles.headerIcon}>📚</Text>
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Test Bank</Text>
                <Text style={styles.headerSubtitle}>
                  {totalCount} submission{totalCount !== 1 ? 's' : ''} • {approvedCount} approved
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {pendingCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                </View>
              )}
              <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
            </View>
          </LinearGradient>
        )}
      </Pressable>

      {/* Content */}
      {expanded && (
        <View style={styles.content}>
          {/* Upload Button */}
          <Pressable
            onPress={onUploadPress}
            accessibilityRole="button"
            accessibilityLabel="Upload to test bank"
          >
            {({ pressed }) => (
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.uploadButton, pressed && styles.uploadButtonPressed]}
              >
                <View style={styles.uploadIconContainer}>
                  <Text style={styles.uploadIcon}>📤</Text>
                </View>
                <Text style={styles.uploadText}>Upload New Material</Text>
              </LinearGradient>
            )}
          </Pressable>

          {/* Submissions List */}
          {totalCount === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyText}>No submissions yet</Text>
              <Text style={styles.emptySubtext}>
                Share your study materials to help the chapter!
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.submissionsList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {submissions.map((submission) => {
                const statusStyle = getStatusStyle(submission.status);
                const fileTypeStyle = getFileTypeStyle(submission.file_type);

                return (
                  <View key={submission.id} style={styles.submissionCard}>
                    {/* File Type Badge */}
                    <View style={styles.submissionHeader}>
                      <View
                        style={[
                          styles.fileTypeBadge,
                          { 
                            borderColor: fileTypeStyle.color,
                            backgroundColor: `${fileTypeStyle.color}08`,
                          },
                        ]}
                      >
                        <Text style={styles.fileTypeEmoji}>{fileTypeStyle.emoji}</Text>
                        <Text
                          style={[
                            styles.fileTypeText,
                            { color: fileTypeStyle.color },
                          ]}
                        >
                          {fileTypeStyle.label}
                        </Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: statusStyle.bg,
                            borderColor: statusStyle.border,
                          },
                        ]}
                      >
                        <Text style={styles.statusEmoji}>{statusStyle.emoji}</Text>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                          {submission.status.charAt(0).toUpperCase() +
                            submission.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    {/* File Info */}
                    <View style={styles.submissionBody}>
                      <Text style={styles.classCode}>{submission.class_code}</Text>
                      <Text style={styles.fileName} numberOfLines={2} ellipsizeMode="middle">
                        {submission.original_file_name}
                      </Text>
                      <Text style={styles.uploadDate}>
                        Uploaded {formatDate(submission.uploaded_at)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Info Footer */}
          <View style={styles.infoFooter}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Submissions are reviewed by scholarship chairs. Approved materials earn you points!
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  headerPressed: {
    opacity: 0.9,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7c3aed',
  },
  expandIcon: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    padding: 18,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 20,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  uploadButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  uploadIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  uploadIcon: {
    fontSize: 18,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  submissionsList: {
    maxHeight: 420,
  },
  submissionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  fileTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 2,
    gap: 6,
  },
  fileTypeEmoji: {
    fontSize: 16,
  },
  fileTypeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 2,
    gap: 6,
  },
  statusEmoji: {
    fontSize: 14,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  submissionBody: {
    gap: 6,
  },
  classCode: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  fileName: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    lineHeight: 20,
  },
  uploadDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 2,
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#0c4a6e',
    fontWeight: '500',
    lineHeight: 20,
  },
});
