/**
 * President Analytics Screen
 * 
 * Displays comprehensive fraternity analytics including:
 * - Health metrics (members, retention, attendance, points)
 * - Category breakdown (points by event category)
 * - Top performers (member rankings)
 * - Recent events (event analytics)
 * - Diversity metrics (demographics and inclusion)
 * - Member roster (full roster with points breakdown)
 */

import React, { memo, useState } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { 
  useAnalyticsData, 
  useHealthMetrics, 
  useMemberPerformance, 
  useEventAnalytics, 
  useCategoryBreakdown, 
  useDiversityMetrics,
  useMemberPoints,
  useHouseMembershipPoints,
  usePledgeClassPoints
} from '../../../hooks/analytics';
import { SemesterReportModal } from '../../../components/PresidentAnalyticsComponents/SemesterReportModal';
import { FraternityHealth } from '../../../components/PresidentAnalyticsComponents/FraternityHealth';
import { CategoryBreakdown } from '../../../components/PresidentAnalyticsComponents/CategoryBreakdown';
import { TopPerformers } from '../../../components/PresidentAnalyticsComponents/TopPerformers';
import { RecentEvents } from '../../../components/PresidentAnalyticsComponents/RecentEvents';
import { DiversitySection } from '../../../components/PresidentAnalyticsComponents/DiversitySection';
import { MemberRoster } from '../../../components/PresidentAnalyticsComponents/MemberRoster';
import { MemberPointsModal } from '../../../components/PresidentAnalyticsComponents/MemberPointsModal';
import { HouseMembershipSection } from '../../../components/PresidentAnalyticsComponents/HouseMembershipSection';
import { PledgeClassSection } from '../../../components/PresidentAnalyticsComponents/PledgeClassSection';
import { AnalyticsSection } from '../../../components/AnalyticsComponents';
import { styles } from '../../../styles/presidentAnalytics/analyticsStyles';
import type { Member } from '../../../types/analytics';

function PresidentAnalyticsOptimized() {
  const { state, handleRefresh, handleLoadMoreEvents } = useAnalyticsData();
  const healthMetrics = useHealthMetrics(state.members, state.attendance, state.events);
  const topPerformers = useMemberPerformance(state.members, state.attendance, state.events, 10);
  const eventAnalytics = useEventAnalytics(state.events, state.attendance, state.members);
  const categoryBreakdown = useCategoryBreakdown(state.events, state.attendance, state.members);
  const diversityMetrics = useDiversityMetrics(state.members);
  const houseMembershipPoints = useHouseMembershipPoints(state.members, state.attendance, state.events);
  const pledgeClassPoints = usePledgeClassPoints(state.members, state.attendance, state.events);
  const { fetchMemberPoints, loading: pointsLoading } = useMemberPoints();

  // State for member points modal
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberPoints, setMemberPoints] = useState<Record<string, number> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // State for semester report modal
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Handle member selection
  const handleMemberPress = async (member: Member) => {
    setSelectedMember(member);
    setModalVisible(true);
    setMemberPoints(null); // Reset previous points
    
    // Fetch points for selected member
    const points = await fetchMemberPoints(member.user_id);
    if (points) {
      setMemberPoints(points.pointsByCategory);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedMember(null);
    setMemberPoints(null);
  };

  // Loading state - show spinner for initial load
  if (state.loading && state.members.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" style={styles.loader} />
      </View>
    );
  }

  // Error state - show error message if initial load fails
  if (state.error && state.members.length === 0) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Ionicons name="alert-circle" size={64} color="#EA4335" />
        <Text style={styles.errorText}>{state.error}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl 
          refreshing={state.refreshing} 
          onRefresh={handleRefresh} 
          colors={['#4285F4']} 
          tintColor="#4285F4" 
        />
      }
    >
      {/* End Semester Report Button */}
      <TouchableOpacity 
        style={styles.reportButton}
        onPress={() => setReportModalVisible(true)}
      >
        <Ionicons name="document-text" size={24} color="#fff" />
        <Text style={styles.reportButtonText}>End Semester Report</Text>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </TouchableOpacity>

      <FraternityHealth 
        healthMetrics={healthMetrics} 
        totalEvents={state.events.filter(e => !e.is_non_event).length} 
      />
      
      <CategoryBreakdown 
        categoryBreakdown={categoryBreakdown} 
        totalMembers={state.members.length}
      />
      
      <HouseMembershipSection data={houseMembershipPoints} />
      
      <PledgeClassSection data={pledgeClassPoints} />
      
      <TopPerformers topPerformers={topPerformers} />
      
      <RecentEvents 
        eventAnalytics={eventAnalytics}
        hasMore={state.eventsPagination.hasMore}
        onLoadMore={handleLoadMoreEvents}
      />
      
      <DiversitySection 
        diversityMetrics={diversityMetrics}
        loading={state.loading}
      />

      {/* Member Roster Section */}
      <AnalyticsSection title="Member Roster">
        <MemberRoster 
          members={state.members}
          onMemberPress={handleMemberPress}
        />

      {/* Semester Report Modal */}
      <SemesterReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
      />
      </AnalyticsSection>

      {/* Member Points Modal */}
      <MemberPointsModal
        visible={modalVisible}
        member={selectedMember}
        pointsByCategory={memberPoints}
        loading={pointsLoading}
        onClose={handleCloseModal}
      />
    </ScrollView>
  );
}

// Export with error boundary
export default memo(function AnalyticsWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <PresidentAnalyticsOptimized />
    </ErrorBoundary>
  );
});
