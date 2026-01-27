/**
 * Member Progress Screen
 * 
 * Displays an Excel-like table showing all members' point progress across
 * all active point categories. Features:
 * 
 * - Dynamic columns based on active categories from database
 * - Color-coded threshold status (green = met, red = below)
 * - Search by member name or pledge class
 * - Horizontal scrolling for many categories
 * - Real-time calculation of points including:
 *   - Base points from event attendance
 *   - 1.5x bonus for registered events
 *   - Approved appeal points
 * 
 * @access President role only
 * @location app/president/progress.tsx
 * @route /president/progress
 * 
 * @see docs/features/MEMBER_PROGRESS_TABLE.md for complete documentation
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { usePointCategories } from '../../hooks/shared/usePointCategories';

interface MemberProgress {
  user_id: string;
  first_name: string;
  last_name: string;
  pledge_class: string;
  categoryPoints: Record<string, number>;
  totalPoints: number;
}

export default function MemberProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberProgress, setMemberProgress] = useState<MemberProgress[]>([]);
  const { categories, loading: categoriesLoading } = usePointCategories();

  const fetchMemberProgress = async () => {
    try {
      // Fetch all members (including officers)
      const { data: members, error: membersError } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, pledge_class')
        .order('last_name');

      if (membersError) throw membersError;

      // Fetch all attendance records with event details
      const { data: attendance, error: attendanceError } = await supabase
        .from('event_attendance')
        .select(`
          user_id,
          event_id,
          events!inner(
            id,
            point_type,
            point_value,
            status,
            start_time
          )
        `);

      if (attendanceError) throw attendanceError;

      // Fetch all registrations
      const { data: registrations, error: regError } = await supabase
        .from('event_registration')
        .select('user_id, event_id');

      if (regError) throw regError;

      // Fetch approved appeals
      const { data: appeals, error: appealsError } = await supabase
        .from('point_appeal')
        .select(`
          user_id,
          event_id,
          events!inner(
            point_type,
            point_value
          )
        `)
        .eq('status', 'approved');

      if (appealsError) throw appealsError;

      // Create registration map for bonus calculation
      const registrationMap = new Map<string, Set<string>>();
      registrations?.forEach(reg => {
        if (!registrationMap.has(reg.user_id)) {
          registrationMap.set(reg.user_id, new Set());
        }
        registrationMap.get(reg.user_id)?.add(reg.event_id);
      });

      // Calculate points for each member
      const progressData: MemberProgress[] = (members || []).map(member => {
        const categoryPoints: Record<string, number> = {};
        
        // Initialize all categories to 0
        categories.forEach(cat => {
          categoryPoints[cat.display_name] = 0;
        });

        // Calculate points from attendance
        const memberAttendance = attendance?.filter(a => a.user_id === member.user_id) || [];
        memberAttendance.forEach(att => {
          const event = (att as any).events as any;
          if (!event || event.status !== 'approved') return;
          
          // Only count past events
          const eventDate = new Date(event.start_time);
          if (eventDate > new Date()) return;

          const category = event.point_type;
          const basePoints = event.point_value || 0;
          
          // Apply 1.5x multiplier if registered
          const wasRegistered = registrationMap.get(member.user_id)?.has(att.event_id);
          const points = wasRegistered ? basePoints * 1.5 : basePoints;

          if (categoryPoints[category] !== undefined) {
            categoryPoints[category] += points;
          }
        });

        // Add points from approved appeals
        const memberAppeals = appeals?.filter(a => a.user_id === member.user_id) || [];
        memberAppeals.forEach(appeal => {
          const event = (appeal as any).events as any;
          if (!event) return;

          const category = event.point_type;
          const points = event.point_value || 0;

          if (categoryPoints[category] !== undefined) {
            categoryPoints[category] += points;
          }
        });

        // Calculate total
        const totalPoints = Object.values(categoryPoints).reduce((sum, val) => sum + val, 0);

        return {
          user_id: member.user_id,
          first_name: member.first_name || 'Unknown',
          last_name: member.last_name || '',
          pledge_class: member.pledge_class || 'N/A',
          categoryPoints,
          totalPoints,
        };
      });

      // Sort by total points descending
      progressData.sort((a, b) => b.totalPoints - a.totalPoints);
      setMemberProgress(progressData);

    } catch (error: any) {
      console.error('Error fetching member progress:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!categoriesLoading && categories.length > 0) {
      fetchMemberProgress();
    }
  }, [categoriesLoading, categories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMemberProgress();
  };

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return memberProgress;
    
    const query = searchQuery.toLowerCase();
    return memberProgress.filter(member =>
      member.first_name.toLowerCase().includes(query) ||
      member.last_name.toLowerCase().includes(query) ||
      member.pledge_class.toLowerCase().includes(query)
    );
  }, [memberProgress, searchQuery]);

  if (loading || categoriesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#330066" />
        <Text style={styles.loadingText}>Loading member progress...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or pledge class..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
        </Text>
      </View>

      {/* Table */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        style={styles.horizontalScroll}
      >
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.cell, styles.nameCell, styles.headerCell]}>
              <Text style={styles.headerText}>Member</Text>
            </View>
            <View style={[styles.cell, styles.pledgeCell, styles.headerCell]}>
              <Text style={styles.headerText}>Class</Text>
            </View>
            {categories.map(category => (
              <View key={category.id} style={[styles.cell, styles.pointCell, styles.headerCell]}>
                <Text style={styles.headerText} numberOfLines={1}>
                  {category.icon} {category.display_name}
                </Text>
              </View>
            ))}
            <View style={[styles.cell, styles.totalCell, styles.headerCell]}>
              <Text style={styles.headerText}>Total</Text>
            </View>
          </View>

          {/* Table Rows */}
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member, index) => (
              <View
                key={member.user_id}
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.evenRow : styles.oddRow,
                ]}
              >
                <View style={[styles.cell, styles.nameCell]}>
                  <Text style={styles.cellText} numberOfLines={1}>
                    {member.first_name} {member.last_name}
                  </Text>
                </View>
                <View style={[styles.cell, styles.pledgeCell]}>
                  <Text style={styles.cellText}>{member.pledge_class}</Text>
                </View>
                {categories.map(category => (
                  <View key={category.id} style={[styles.cell, styles.pointCell]}>
                    <Text 
                      style={[
                        styles.cellText,
                        member.categoryPoints[category.display_name] >= category.threshold 
                          ? styles.metThreshold 
                          : styles.belowThreshold
                      ]}
                    >
                      {member.categoryPoints[category.display_name]?.toFixed(1) || '0.0'}
                    </Text>
                  </View>
                ))}
                <View style={[styles.cell, styles.totalCell]}>
                  <Text style={[styles.cellText, styles.totalText]}>
                    {member.totalPoints.toFixed(1)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No members found</Text>
            </View>
          )}
        </ScrollView>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.legendText}>Met threshold</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Below threshold</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#5f6368',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  countContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  countText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  horizontalScroll: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#330066',
    borderBottomWidth: 2,
    borderBottomColor: '#F7B910',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  evenRow: {
    backgroundColor: 'white',
  },
  oddRow: {
    backgroundColor: '#f9fafb',
  },
  cell: {
    padding: 12,
    justifyContent: 'center',
  },
  headerCell: {
    paddingVertical: 16,
  },
  nameCell: {
    width: 180,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  pledgeCell: {
    width: 100,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  pointCell: {
    width: 120,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  totalCell: {
    width: 100,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  headerText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  cellText: {
    fontSize: 14,
    color: '#333',
  },
  metThreshold: {
    color: '#10b981',
    fontWeight: '600',
  },
  belowThreshold: {
    color: '#ef4444',
    fontWeight: '600',
  },
  totalText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#330066',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    color: '#666',
  },
});
