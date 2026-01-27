/**
 * MemberRoster Component
 * 
 * Displays full roster of brothers and pledges with search and filter
 * Clicking a member opens their points breakdown
 */

import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Member } from '../../types/analytics';

interface MemberRosterProps {
  members: Member[];
  onMemberPress: (member: Member) => void;
}

export const MemberRoster: React.FC<MemberRosterProps> = ({ members, onMemberPress }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'brothers' | 'pledges'>('all');

  // Filter and search members
  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Apply role filter
    if (filterType === 'brothers') {
      filtered = filtered.filter(m => m.role !== 'pledge');
    } else if (filterType === 'pledges') {
      filtered = filtered.filter(m => m.role === 'pledge');
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.first_name.toLowerCase().includes(query) ||
        m.last_name.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        (m.pledge_class && m.pledge_class.toLowerCase().includes(query))
      );
    }

    // Sort by last name
    return filtered.sort((a, b) => 
      a.last_name.localeCompare(b.last_name)
    );
  }, [members, searchQuery, filterType]);

  const renderMemberCard = ({ item }: { item: Member }) => (
    <TouchableOpacity 
      style={styles.memberCard}
      onPress={() => onMemberPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.memberAvatar}>
        <Text style={styles.avatarText}>
          {item.first_name?.[0]}{item.last_name?.[0]}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.first_name} {item.last_name}
        </Text>
        <View style={styles.memberDetails}>
          <Text style={styles.memberRole}>
            {item.role === 'pledge' ? '🎓 Pledge' : '👔 Brother'}
          </Text>
          {item.pledge_class && (
            <Text style={styles.memberClass}>• {item.pledge_class}</Text>
          )}
        </View>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
            All ({members.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'brothers' && styles.filterButtonActive]}
          onPress={() => setFilterType('brothers')}
        >
          <Text style={[styles.filterText, filterType === 'brothers' && styles.filterTextActive]}>
            Brothers ({members.filter(m => m.role !== 'pledge').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'pledges' && styles.filterButtonActive]}
          onPress={() => setFilterType('pledges')}
        >
          <Text style={[styles.filterText, filterType === 'pledges' && styles.filterTextActive]}>
            Pledges ({members.filter(m => m.role === 'pledge').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Member List */}
      <View style={styles.listContainer}>
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberCard}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No members found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try adjusting your search' : 'Check your filters'}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    maxHeight: 600, // Limit height so it doesn't take over the whole screen
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#1e293b',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#3b82f6',
  },
  listContent: {
    paddingBottom: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#330066',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  memberDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  memberClass: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    marginLeft: 4,
  },
  memberEmail: {
    fontSize: 13,
    color: '#94a3b8',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
});
