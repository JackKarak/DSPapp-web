/**
 * VP Operations - Member Management Screen
 * 
 * Displays all fraternity members with detailed information
 * VP Operations can view all member details including:
 * - Personal info, contact details, pledge class
 * - Officer position, exec status
 * - Points, attendance, and academic info
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from 'expo-router';

// Import MemberDetailsModal
import { MemberDetailsModal } from '../../components/MemberDetailsModal';

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

export default function MembersScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'officers' | 'pledges' | 'brothers'>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch all members data
  const fetchMembers = useCallback(async () => {
    try {
      // Check if user is VP Operations
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, officer_position')
        .eq('user_id', user.id)
        .single();

      if (userError || userData?.role !== 'officer' || userData?.officer_position !== 'vp_operations') {
        Alert.alert('Unauthorized', 'You do not have access to this screen');
        return;
      }

      // Fetch all members with their points
      const { data: membersData, error: membersError } = await supabase
        .from('users')
        .select(`
          user_id,
          uid,
          first_name,
          last_name,
          email,
          phone_number,
          role,
          officer_position,
          pledge_class,
          majors,
          minors,
          expected_graduation,
          house_membership,
          living_type,
          pronouns,
          gender,
          race,
          sexual_orientation,
          approved,
          last_profile_update,
          consent_analytics,
          consent_demographics,
          consent_academic,
          consent_housing
        `)
        .order('last_name', { ascending: true });

      if (membersError) throw membersError;

      // Calculate points for each member
      const membersWithPoints = await Promise.all(
        (membersData || []).map(async (member) => {
          // Get attendance points
          const { data: attendance } = await supabase
            .from('event_attendance')
            .select('event_id, events!inner(id, point_value)')
            .eq('user_id', member.user_id);

          // Get approved appeals
          const { data: appeals } = await supabase
            .from('point_appeal')
            .select('event_id, events!inner(point_value)')
            .eq('user_id', member.user_id)
            .eq('status', 'approved');

          // Track counted events to avoid duplication
          const countedEvents = new Set<string>();
          
          // Calculate total points from attendance (use actual point_value)
          const attendancePoints = (attendance || []).reduce((sum, att) => {
            const event = (att as any).events;
            if (!event) return sum;
            
            const points = event.point_value || 0;
            countedEvents.add(att.event_id);
            return sum + points;
          }, 0);

          // Calculate points from appeals (only if not already counted)
          const appealPoints = (appeals || []).reduce((sum, appeal) => {
            const event = (appeal as any).events;
            if (!event || countedEvents.has(appeal.event_id)) return sum;
            
            const points = event.point_value || 0;
            return sum + points;
          }, 0);

          const totalPoints = attendancePoints + appealPoints;

          return {
            ...member,
            total_points: totalPoints,
            events_attended: attendance?.length || 0,
          };
        })
      );

      setMembers(membersWithPoints);
      setFilteredMembers(membersWithPoints);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      Alert.alert('Error', error.message || 'Failed to load members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
  }, [fetchMembers]);

  // Filter members based on search and filter type
  useEffect(() => {
    let filtered = members;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member => 
        member.first_name?.toLowerCase().includes(query) ||
        member.last_name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.pledge_class?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(member => {
        switch (filterType) {
          case 'officers':
            return member.officer_position !== null;
          case 'pledges':
            return member.role === 'pledge';
          case 'brothers':
            return member.role === 'brother' && member.officer_position === null;
          default:
            return true;
        }
      });
    }

    setFilteredMembers(filtered);
  }, [searchQuery, filterType, members]);

  // Handle member card press
  const handleMemberPress = (member: Member) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  // Render filter buttons
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <TouchableOpacity
        style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
        onPress={() => setFilterType('all')}
      >
        <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
          All ({members.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filterType === 'officers' && styles.filterButtonActive]}
        onPress={() => setFilterType('officers')}
      >
        <Text style={[styles.filterText, filterType === 'officers' && styles.filterTextActive]}>
          Officers ({members.filter(m => m.officer_position).length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filterType === 'brothers' && styles.filterButtonActive]}
        onPress={() => setFilterType('brothers')}
      >
        <Text style={[styles.filterText, filterType === 'brothers' && styles.filterTextActive]}>
          Brothers ({members.filter(m => (m.role === 'brother' || m.role === 'president') && !m.officer_position).length})
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
  );

  // Render member card
  const renderMember = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => handleMemberPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.memberHeader}>
        <View style={styles.memberAvatar}>
          <Text style={styles.avatarText}>
            {item.first_name?.[0]}{item.last_name?.[0]}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.memberEmail}>{item.email}</Text>
          {item.officer_position && (
            <View style={styles.officerBadge}>
              <Ionicons name="star" size={12} color="#F7B910" />
              <Text style={styles.officerText}>
                {item.officer_position.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
      </View>
      
      <View style={styles.memberStats}>
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={16} color="#330066" />
          <Text style={styles.statText}>{item.total_points.toFixed(1)} pts</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="calendar" size={16} color="#330066" />
          <Text style={styles.statText}>{item.events_attended} events</Text>
        </View>
        {item.pledge_class && (
          <View style={styles.statItem}>
            <Ionicons name="school" size={16} color="#330066" />
            <Text style={styles.statText}>{item.pledge_class}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading members...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Member Directory</Text>
        <Text style={styles.subtitle}>
          {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or pledge class..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      {renderFilters()}

      {/* Member List */}
      <FlatList
        data={filteredMembers}
        renderItem={renderMember}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#330066"
            colors={['#330066']}
          />
        }
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

      {/* Member Details Modal */}
      {selectedMember && (
        <MemberDetailsModal
          visible={modalVisible}
          member={selectedMember}
          onClose={() => {
            setModalVisible(false);
            setSelectedMember(null);
          }}
          onUpdate={() => {
            // Refresh member list after update
            fetchMembers();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#330066',
    borderColor: '#330066',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  officerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  officerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },
  memberStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
