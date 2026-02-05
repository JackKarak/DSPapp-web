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

      // Fetch all attendance records with event details (approved events only)
      const { data: attendance, error: attendanceError } = await supabase
        .from('event_attendance')
        .select(`
          user_id,
          event_id,
          attended_at,
          events!inner(
            id,
            point_type,
            point_value,
            status,
            start_time
          )
        `)
        .eq('events.status', 'approved')
        .not('attended_at', 'is', null);

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

      console.log('Progress data fetched:', {
        membersCount: members?.length,
        attendanceCount: attendance?.length,
        registrationsCount: registrations?.length,
        appealsCount: appeals?.length,
        sampleAttendance: attendance?.[0],
        categoriesCount: categories.length,
        categoryNames: categories.map(c => c.display_name)
      });

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
        
        // Initialize all categories to 0 (use name to match event point_type)
        categories.forEach(cat => {
          categoryPoints[cat.name] = 0;
        });

        // Track which events we've already counted to avoid duplication
        const countedEvents = new Set<string>();

        // Calculate points from attendance (approved events only, past events only)
        const memberAttendance = attendance?.filter(a => a.user_id === member.user_id) || [];
        memberAttendance.forEach(att => {
          const event = (att as any).events as any;
          if (!event) {
            console.log('No event data for attendance:', att);
            return;
          }
          
          // Skip if already counted (prevents duplicate check-ins)
          if (countedEvents.has(event.id)) return;
          
          // Only count past events
          const eventDate = new Date(event.start_time);
          if (eventDate > new Date()) return;

          const category = event.point_type;
          const points = event.point_value || 0;

          if (categoryPoints[category] !== undefined) {
            categoryPoints[category] += points;
            countedEvents.add(event.id);
          } else {
            console.log('Category not found:', { category, availableCategories: Object.keys(categoryPoints) });
          }
        });

        // Add points from approved appeals (only if not already counted from attendance)
        const memberAppeals = appeals?.filter(a => a.user_id === member.user_id) || [];
        memberAppeals.forEach(appeal => {
          const event = (appeal as any).events as any;
          if (!event) return;

          // Skip if already counted from attendance
          if (countedEvents.has(event.id)) return;

          const category = event.point_type;
          const points = event.point_value || 0;

          if (categoryPoints[category] !== undefined) {
            categoryPoints[category] += points;
          }
        });

        // Calculate total
        const totalPoints = Object.values(categoryPoints).reduce((sum, val) => sum + val, 0);

        // Debug logging for first member
        if (member === members[0]) {
          console.log('First member points debug:', {
            name: `${member.first_name} ${member.last_name}`,
            attendanceCount: memberAttendance.length,
            appealsCount: memberAppeals.length,
            categoryPoints,
            totalPoints
          });
        }

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
        <Ionicons name="search" size={22} color="#330066" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or pledge class..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9980b3"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={22} color="#F7B910" />
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
                        member.categoryPoints[category.name] >= category.threshold 
                          ? styles.metThreshold 
                          : styles.belowThreshold
                      ]}
                    >
                      {member.categoryPoints[category.name]?.toFixed(1) || '0.0'}
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
    backgroundColor: '#f5f3f7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f3f7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#330066',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#330066',
    shadowColor: '#330066',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
    color: '#330066',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#330066',
    fontWeight: '500',
  },
  countContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F7B910',
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  countText: {
    fontSize: 14,
    color: '#330066',
    fontWeight: '700',
    textAlign: 'center',
  },
  horizontalScroll: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#330066',
    borderBottomWidth: 3,
    borderBottomColor: '#F7B910',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d8d0e0',
  },
  evenRow: {
    backgroundColor: 'white',
  },
  oddRow: {
    backgroundColor: '#faf8fc',
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
    borderRightColor: '#d8d0e0',
  },
  pledgeCell: {
    width: 100,
    borderRightWidth: 1,
    borderRightColor: '#d8d0e0',
  },
  pointCell: {
    width: 120,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#d8d0e0',
  },
  totalCell: {
    width: 100,
    alignItems: 'center',
    backgroundColor: '#fff8e6',
    borderLeftWidth: 2,
    borderLeftColor: '#F7B910',
  },
  headerText: {
    color: '#F7B910',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cellText: {
    fontSize: 14,
    color: '#330066',
    fontWeight: '500',
  },
  metThreshold: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 15,
  },
  belowThreshold: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 15,
  },
  totalText: {
    fontWeight: '800',
    fontSize: 16,
    color: '#330066',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d8d0e0',
  },
  emptyText: {
    fontSize: 16,
    color: '#330066',
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#330066',
    borderTopWidth: 3,
    borderTopColor: '#F7B910',
    gap: 32,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'white',
  },
  legendText: {
    fontSize: 13,
    color: '#F7B910',
    fontWeight: '600',
  },
});
