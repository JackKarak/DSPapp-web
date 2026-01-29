import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OFFICER_POSITIONS, OFFICER_POSITION_ORDER } from '../../constants/operations';
import { Member } from '../../types/operations';

interface OfficerManagementSectionProps {
  members: Member[];
  brotherSearch: string;
  onBrotherSearchChange: (text: string) => void;
  onSelectOfficer: (member: Member) => void;
  onSelectBrother: (member: Member) => void;
  onClearAll: () => void;
}

export function OfficerManagementSection({
  members,
  brotherSearch,
  onBrotherSearchChange,
  onSelectOfficer,
  onSelectBrother,
  onClearAll,
}: OfficerManagementSectionProps) {
  const currentOfficers = members.filter(m => m.role === 'officer' && m.officer_position);
  const availableMembers = members.filter(m => m.role !== 'pledge' && (m.role !== 'officer' || !m.officer_position));
  
  const sortedOfficers = currentOfficers.sort((a, b) => {
    const aOrder = OFFICER_POSITION_ORDER[a.officer_position!] || 999;
    const bOrder = OFFICER_POSITION_ORDER[b.officer_position!] || 999;
    return aOrder - bOrder;
  });

  const filteredBrothers = availableMembers.filter(m => {
    if (!brotherSearch) return true;
    const search = brotherSearch.toLowerCase();
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    return fullName.includes(search);
  }).slice(0, 20);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="people" size={24} color="#330066" />
        <Text style={styles.sectionTitle}>Officer Positions</Text>
      </View>
      <Text style={styles.sectionDescription}>
        Assign or remove officer positions. Tap a member to change their position.
      </Text>

      {/* Position Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{currentOfficers.length}</Text>
          <Text style={styles.statLabel}>Filled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{OFFICER_POSITIONS.length - currentOfficers.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{OFFICER_POSITIONS.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Clear All Button */}
      {currentOfficers.length > 0 && (
        <TouchableOpacity style={styles.clearAllButton} onPress={onClearAll}>
          <Ionicons name="refresh" size={20} color="#dc2626" />
          <Text style={styles.clearAllButtonText}>Clear All Positions (Post-Elections)</Text>
        </TouchableOpacity>
      )}

      {/* Current Officers */}
      <View style={styles.officersContainer}>
        <Text style={styles.subsectionTitle}>Current Officers</Text>
        {sortedOfficers.map(officer => (
          <TouchableOpacity
            key={officer.user_id}
            style={styles.officerRow}
            onPress={() => onSelectOfficer(officer)}
          >
            <View style={styles.officerContent}>
              <Text style={styles.officerPosition}>
                {officer.officer_position?.replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Text style={styles.officerName}>
                {officer.first_name} {officer.last_name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Available Members */}
      <View style={styles.officersContainer}>
        <Text style={styles.subsectionTitle}>Available Members (Brothers)</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            value={brotherSearch}
            onChangeText={onBrotherSearchChange}
            placeholderTextColor="#94a3b8"
          />
          {brotherSearch.length > 0 && (
            <TouchableOpacity onPress={() => onBrotherSearchChange('')}>
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {filteredBrothers.map(member => (
          <TouchableOpacity
            key={member.user_id}
            style={styles.officerRow}
            onPress={() => onSelectBrother(member)}
          >
            <View style={styles.officerContent}>
              <Text style={styles.officerName}>
                {member.first_name} {member.last_name}
              </Text>
              <Text style={styles.officerEmail}>{member.email}</Text>
            </View>
            <Ionicons name="add-circle-outline" size={22} color="#330066" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#330066',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#330066',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  clearAllButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  officersContainer: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  officerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  officerContent: {
    flex: 1,
  },
  officerPosition: {
    fontSize: 13,
    fontWeight: '700',
    color: '#330066',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  officerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  officerEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
});
