/**
 * MemberDetailsModal Component
 * 
 * Displays comprehensive member information for VP Operations
 * Shows all data from users table including sensitive fields
 * Allows VP Operations to edit officer positions and key data
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface Member {
  user_id: string;
  uid: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  officer_position: string | null;
  pledge_class: string | null;
  majors: string | null;
  minors: string | null;
  expected_graduation: string | null;
  house_membership: string | null;
  living_type: string | null;
  pronouns: string | null;
  gender: string | null;
  race: string | null;
  sexual_orientation: string | null;
  approved: boolean;
  last_profile_update: string | null;
  total_points: number;
  events_attended: number;
  consent_analytics: boolean;
  consent_demographics: boolean;
  consent_academic: boolean;
  consent_housing: boolean;
}

interface MemberDetailsModalProps {
  visible: boolean;
  member: Member;
  onClose: () => void;
  onUpdate?: () => void; // Callback to refresh member list after update
}

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  visible,
  member,
  onClose,
  onUpdate,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState({
    role: member.role,
    officer_position: member.officer_position || '',
    approved: member.approved,
  });

  // Reset editedData when member changes
  React.useEffect(() => {
    setEditedData({
      role: member.role,
      officer_position: member.officer_position || '',
      approved: member.approved,
    });
    setEditMode(false);
  }, [member.user_id, member.role, member.officer_position, member.approved]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving member data:', {
        user_id: member.user_id,
        updates: {
          role: editedData.role,
          officer_position: editedData.officer_position || null,
          approved: editedData.approved,
        }
      });

      const { data, error } = await supabase
        .from('users')
        .update({
          role: editedData.role,
          officer_position: editedData.officer_position || null,
          approved: editedData.approved,
        })
        .eq('user_id', member.user_id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update successful:', data);
      Alert.alert('Success', 'Member information updated successfully');
      setEditMode(false);
      if (onUpdate) onUpdate(); // Refresh the member list
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message || 'Failed to update member information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData({
      role: member.role,
      officer_position: member.officer_position || '',
      approved: member.approved,
    });
    setEditMode(false);
  };

  const handleCall = () => {
    if (member.phone_number) {
      Linking.openURL(`tel:${member.phone_number}`);
    }
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${member.email}`);
  };

  const InfoRow = ({ 
    icon, 
    label, 
    value, 
    sensitive = false 
  }: { 
    icon: string; 
    label: string; 
    value: string | null | undefined | number | boolean; 
    sensitive?: boolean;
  }) => {
    if (value === null || value === undefined || value === '') return null;

    return (
      <View style={styles.infoRow}>
        <View style={styles.infoLabel}>
          <Ionicons name={icon as any} size={18} color="#64748b" />
          <Text style={styles.labelText}>{label}</Text>
        </View>
        <Text style={[styles.valueText, sensitive && styles.sensitiveText]}>
          {value}
        </Text>
      </View>
    );
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </Text>
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {member.first_name} {member.last_name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  {member.officer_position && ` • ${member.officer_position.replace(/_/g, ' ')}`}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {!editMode ? (
                <>
                  <TouchableOpacity onPress={() => setEditMode(true)} style={styles.editButton}>
                    <Ionicons name="pencil" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleSave} 
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
            {/* Quick Actions */}
            <View style={styles.actionsContainer}>
              {member.phone_number && (
                <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                  <Ionicons name="call" size={20} color="#ffffff" />
                  <Text style={styles.actionText}>Call</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
                <Ionicons name="mail" size={20} color="#ffffff" />
                <Text style={styles.actionText}>Email</Text>
              </TouchableOpacity>
            </View>

            {/* Contact Information */}
            <Section title="📞 Contact Information">
              <InfoRow icon="mail" label="Email" value={member.email} />
              <InfoRow icon="call" label="Phone" value={member.phone_number || 'Not provided'} />
            </Section>

            {/* Fraternity Status */}
            <Section title="🏛️ Fraternity Status">
              <InfoRow icon="person" label="UID" value={`#${member.uid}`} />
              
              {editMode ? (
                <>
                  {/* Editable Role */}
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>Role *</Text>
                    <View style={styles.roleButtons}>
                      {['brother', 'pledge', 'officer', 'admin', 'alumni', 'abroad'].map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleButton,
                            editedData.role === role && styles.roleButtonActive,
                          ]}
                          onPress={() => {
                            const newData = { ...editedData, role };
                            // Clear officer_position if role is not 'officer'
                            if (role !== 'officer') {
                              newData.officer_position = '';
                            }
                            setEditedData(newData);
                          }}
                        >
                          <Text
                            style={[
                              styles.roleButtonText,
                              editedData.role === role && styles.roleButtonTextActive,
                            ]}
                          >
                            {role.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Editable Officer Position */}
                  {editedData.role === 'officer' && (
                    <View style={styles.editRow}>
                      <Text style={styles.editLabel}>Officer Position</Text>
                      <View style={styles.roleButtons}>
                        {['vp_operations', 'vp_scholarship', 'historian', 'other'].map((position) => (
                          <TouchableOpacity
                            key={position}
                            style={[
                              styles.positionButton,
                              editedData.officer_position === position && styles.roleButtonActive,
                            ]}
                            onPress={() => setEditedData({ ...editedData, officer_position: position })}
                          >
                            <Text
                              style={[
                                styles.roleButtonText,
                                editedData.officer_position === position && styles.roleButtonTextActive,
                              ]}
                            >
                              {position.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Editable Approved Status */}
                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>Approved Status *</Text>
                    <View style={styles.roleButtons}>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          editedData.approved && styles.approvedButtonActive,
                        ]}
                        onPress={() => setEditedData({ ...editedData, approved: true })}
                      >
                        <Ionicons 
                          name="checkmark-circle" 
                          size={20} 
                          color={editedData.approved ? '#10b981' : '#64748b'} 
                        />
                        <Text
                          style={[
                            styles.roleButtonText,
                            editedData.approved && styles.approvedTextActive,
                          ]}
                        >
                          APPROVED
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          !editedData.approved && styles.deniedButtonActive,
                        ]}
                        onPress={() => setEditedData({ ...editedData, approved: false })}
                      >
                        <Ionicons 
                          name="close-circle" 
                          size={20} 
                          color={!editedData.approved ? '#ef4444' : '#64748b'} 
                        />
                        <Text
                          style={[
                            styles.roleButtonText,
                            !editedData.approved && styles.deniedTextActive,
                          ]}
                        >
                          NOT APPROVED
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <InfoRow icon="ribbon" label="Role" value={member.role.toUpperCase()} />
                  {member.officer_position && (
                    <InfoRow 
                      icon="star" 
                      label="Officer Position" 
                      value={member.officer_position.replace(/_/g, ' ').toUpperCase()} 
                    />
                  )}
                  <InfoRow 
                    icon={member.approved ? "checkmark-circle" : "close-circle"} 
                    label="Approved" 
                    value={member.approved ? 'Yes' : 'No'} 
                  />
                </>
              )}
              
              <InfoRow icon="school" label="Pledge Class" value={member.pledge_class || 'N/A'} />
            </Section>

            {/* Performance Metrics */}
            <Section title="📊 Performance">
              <InfoRow icon="trophy" label="Total Points" value={`${member.total_points.toFixed(1)} points`} />
              <InfoRow icon="calendar" label="Events Attended" value={`${member.events_attended} events`} />
            </Section>

            {/* Academic Information */}
            {(member.consent_academic || member.majors || member.minors || member.expected_graduation) && (
              <Section title="🎓 Academic Information">
                <InfoRow 
                  icon="book" 
                  label="Major(s)" 
                  value={member.majors || 'Not provided'} 
                  sensitive={!member.consent_academic}
                />
                <InfoRow 
                  icon="bookmark" 
                  label="Minor(s)" 
                  value={member.minors || 'Not provided'} 
                  sensitive={!member.consent_academic}
                />
                <InfoRow 
                  icon="calendar" 
                  label="Expected Graduation" 
                  value={member.expected_graduation || 'Not provided'} 
                  sensitive={!member.consent_academic}
                />
                {!member.consent_academic && (
                  <Text style={styles.consentNote}>
                    ⓘ Member has not consented to share detailed academic info
                  </Text>
                )}
              </Section>
            )}

            {/* Housing Information */}
            {(member.consent_housing || member.house_membership || member.living_type) && (
              <Section title="🏠 Housing">
                <InfoRow 
                  icon="home" 
                  label="House Membership" 
                  value={member.house_membership || 'Not provided'} 
                  sensitive={!member.consent_housing}
                />
                <InfoRow 
                  icon="location" 
                  label="Living Type" 
                  value={member.living_type || 'Not provided'} 
                  sensitive={!member.consent_housing}
                />
                {!member.consent_housing && (
                  <Text style={styles.consentNote}>
                    ⓘ Member has not consented to share housing info
                  </Text>
                )}
              </Section>
            )}

            {/* Demographics */}
            {(member.consent_demographics || member.pronouns || member.gender || member.race || member.sexual_orientation) && (
              <Section title="👤 Demographics">
                <InfoRow 
                  icon="chatbubble" 
                  label="Pronouns" 
                  value={member.pronouns || 'Not provided'} 
                  sensitive={!member.consent_demographics}
                />
                <InfoRow 
                  icon="male-female" 
                  label="Gender" 
                  value={member.gender || 'Not provided'} 
                  sensitive={!member.consent_demographics}
                />
                <InfoRow 
                  icon="people" 
                  label="Race/Ethnicity" 
                  value={member.race || 'Not provided'} 
                  sensitive={!member.consent_demographics}
                />
                <InfoRow 
                  icon="heart" 
                  label="Sexual Orientation" 
                  value={member.sexual_orientation || 'Not provided'} 
                  sensitive={!member.consent_demographics}
                />
                {!member.consent_demographics && (
                  <Text style={styles.consentNote}>
                    ⓘ Member has not consented to share demographic info
                  </Text>
                )}
              </Section>
            )}

            {/* Account Details */}
            <Section title="⚙️ Account Details">
              <InfoRow 
                icon="refresh" 
                label="Last Profile Update" 
                value={formatDate(member.last_profile_update)} 
              />
            </Section>

            {/* Privacy Consent Status */}
            <Section title="🔒 Privacy Consent">
              <View style={styles.consentGrid}>
                <ConsentBadge label="Analytics" granted={member.consent_analytics} />
                <ConsentBadge label="Demographics" granted={member.consent_demographics} />
                <ConsentBadge label="Academic" granted={member.consent_academic} />
                <ConsentBadge label="Housing" granted={member.consent_housing} />
              </View>
            </Section>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const ConsentBadge = ({ label, granted }: { label: string; granted: boolean }) => (
  <View style={[styles.consentBadge, granted ? styles.consentGranted : styles.consentDenied]}>
    <Ionicons 
      name={granted ? "checkmark-circle" : "close-circle"} 
      size={14} 
      color={granted ? "#10b981" : "#ef4444"} 
    />
    <Text style={[styles.consentBadgeText, granted ? styles.consentTextGranted : styles.consentTextDenied]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#330066',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#330066',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  labelText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  valueText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  sensitiveText: {
    fontStyle: 'italic',
    color: '#94a3b8',
  },
  consentNote: {
    fontSize: 12,
    color: '#f59e0b',
    fontStyle: 'italic',
    marginTop: 8,
    paddingHorizontal: 26,
  },
  consentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  consentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  consentGranted: {
    backgroundColor: '#d1fae5',
  },
  consentDenied: {
    backgroundColor: '#fee2e2',
  },
  consentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  consentTextGranted: {
    color: '#065f46',
  },
  consentTextDenied: {
    color: '#991b1b',
  },
  editRow: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  positionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  roleButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  approvedButtonActive: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  deniedButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  roleButtonTextActive: {
    color: '#3b82f6',
  },
  approvedTextActive: {
    color: '#10b981',
  },
  deniedTextActive: {
    color: '#ef4444',
  },
});
