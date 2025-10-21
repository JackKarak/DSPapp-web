import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AccountDeletionService } from '../../lib/accountDeletion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { checkAuthentication, handleAuthenticationRedirect } from '../../lib/auth';
import { formatDateInEST, getDateInEST } from '../../lib/dateUtils';
import { supabase } from '../../lib/supabase';
import { Event, PointAppeal, PointAppealSubmission } from '../../types/account';
import { useFocusEffect } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

// Achievement configurations with tier system
const ACHIEVEMENTS = {
  // Consistency & Streaks - Bronze to Rose Gold progression
  streak_starter: { title: 'Streak Starter', description: 'Attended 3 meetings in a row', category: 'Consistency', tier: 'bronze', icon: '🥉' },
  iron_brother: { title: 'Iron Brother', description: 'Attended 10 meetings in a row', category: 'Consistency', tier: 'silver', icon: '🥈' },
  unstoppable: { title: 'Unstoppable', description: 'Attended 20 meetings in a row', category: 'Consistency', tier: 'gold', icon: '🥇' },
  legend_streak: { title: 'Legend Streak', description: 'Attended 30 meetings in a row', category: 'Consistency', tier: 'rose-gold', icon: '🏆' },
  
  // Milestone Attendance - Progressive tiers
  first_timer: { title: 'First Timer', description: 'Attended your first meeting', category: 'Milestones', tier: 'bronze', icon: '🥉' },
  ten_strong: { title: '10 Strong', description: 'Attended 10 meetings total', category: 'Milestones', tier: 'bronze', icon: '🥉' },
  silver_brother: { title: 'Silver Brother', description: 'Attended 25 meetings total', category: 'Milestones', tier: 'silver', icon: '🥈' },
  gold_brother: { title: 'Gold Brother', description: 'Attended 50 meetings total', category: 'Milestones', tier: 'gold', icon: '🥇' },
  diamond_brother: { title: 'Diamond Brother', description: 'Attended 100 meetings total', category: 'Milestones', tier: 'rose-gold', icon: '🏆' },
  
  // Points & Performance - Multi-tier achievements
  points_50: { title: 'Scholar', description: '50 total points', category: 'Performance', tier: 'bronze', icon: '🥉' },
  points_100: { title: 'Master', description: '100 total points', category: 'Performance', tier: 'silver', icon: '🥈' },
  points_250: { title: 'Elite', description: '250 total points', category: 'Performance', tier: 'gold', icon: '🥇' },
  points_500: { title: 'Legendary', description: '500 total points', category: 'Performance', tier: 'rose-gold', icon: '🏆' },
  punctual_pro: { title: 'Punctual Pro', description: '75%+ attendance rate', category: 'Performance', tier: 'silver', icon: '🥈' },
  perfect_semester: { title: 'Perfect Semester', description: '100% attendance this semester', category: 'Performance', tier: 'gold', icon: '🥇' },
  monthly_champion: { title: 'Monthly Champion', description: 'Attended 5+ events this month', category: 'Performance', tier: 'bronze', icon: '🥉' },
  
  // Leadership & Recognition - High-tier achievements
  top_3: { title: 'Top Performer', description: 'Top 3 in pledge class', category: 'Leadership', tier: 'gold', icon: '🥇' },
  community_leader: { title: 'Community Leader', description: 'Attended 3+ different event types', category: 'Leadership', tier: 'silver', icon: '🥈' },
  dedicated_member: { title: 'Dedicated Member', description: 'Active for full semester', category: 'Leadership', tier: 'rose-gold', icon: '🏆' },
  
  // Special Recognition - Rose Gold tier exclusives
  fraternity_legend: { title: 'Fraternity Legend', description: 'Outstanding lifetime contribution', category: 'Leadership', tier: 'rose-gold', icon: '🏆' },
  mentor_master: { title: 'Mentor Master', description: 'Guided 5+ new members successfully', category: 'Leadership', tier: 'rose-gold', icon: '🏆' }
};

// Tier configuration for styling and order
const TIER_CONFIG = {
  bronze: { name: 'Bronze', color: '#CD7F32', gradient: ['#CD7F32', '#B8860B'], order: 1 },
  silver: { name: 'Silver', color: '#C0C0C0', gradient: ['#C0C0C0', '#A8A8A8'], order: 2 },
  gold: { name: 'Gold', color: '#FFD700', gradient: ['#FFD700', '#FFA500'], order: 3 },
  'rose-gold': { name: 'Rose Gold', color: '#E8B4A0', gradient: ['#E8B4A0', '#D4A574'], order: 4 }
};

// Available majors for multi-select
const AVAILABLE_MAJORS = [
  'Finance',
  'Accounting',
  'Information Systems',
  'Marketing',
  'International Business',
  'Management',
  'OMBA',
  'Supply Chain',
  'Info Science',
  'Computer Science',
  'Engineering'
];

// Multi-Select Component for Majors
const MajorMultiSelect: React.FC<{
  selectedMajors: string[];
  onSelectionChange: (majors: string[]) => void;
}> = ({ selectedMajors, onSelectionChange }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleMajor = (major: string) => {
    if (selectedMajors.includes(major)) {
      onSelectionChange(selectedMajors.filter(m => m !== major));
    } else {
      onSelectionChange([...selectedMajors, major]);
    }
  };

  return (
    <View style={styles.multiSelectContainer}>
      <TouchableOpacity
        style={styles.profileMultiSelectButton}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={selectedMajors.length > 0 ? styles.multiSelectText : styles.placeholderText}>
          {selectedMajors.length > 0 
            ? selectedMajors.join(', ')
            : 'Select majors'
          }
        </Text>
        <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {showDropdown && (
        <View style={styles.multiSelectDropdown}>
          {AVAILABLE_MAJORS.map((major) => (
            <TouchableOpacity
              key={major}
              style={[
                styles.multiSelectOption,
                selectedMajors.includes(major) && styles.multiSelectOptionSelected
              ]}
              onPress={() => toggleMajor(major)}
            >
              <Text style={[
                styles.multiSelectOptionText,
                selectedMajors.includes(major) && styles.multiSelectOptionTextSelected
              ]}>
                {major}
              </Text>
              {selectedMajors.includes(major) && (
                <Text style={styles.multiSelectCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const EventRow: React.FC<{ 
  event: Event; 
  onFeedbackPress: (event: Event) => void; 
  hasFeedbackSubmitted: boolean;
}> = React.memo(({ event, onFeedbackPress, hasFeedbackSubmitted }) => (
  <View style={styles.tableRow}>
    <Text style={styles.cell}>{event.title}</Text>
    <Text style={styles.cell}>
      {formatDateInEST(event.date, { month: 'short', day: 'numeric', year: 'numeric' })}
    </Text>
    <Text style={styles.cell}>{event.host_name}</Text>
    {hasFeedbackSubmitted ? (
      <View style={[styles.feedbackButton, { backgroundColor: '#28a745' }]}>
        <Text style={[styles.feedbackButtonText, { color: 'white' }]}>✅</Text>
      </View>
    ) : (
      <TouchableOpacity 
        style={styles.feedbackButton}
        onPress={() => onFeedbackPress(event)}
        activeOpacity={0.7}
      >
        <Text style={styles.feedbackButtonText}>📝</Text>
      </TouchableOpacity>
    )}
  </View>
));

EventRow.displayName = 'EventRow';

// Analytics Components
const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string; color?: string; icon?: string }> = ({ title, value, subtitle, color = Colors.primary, icon }) => (
  <View style={styles.statCard}>
    <View style={styles.statHeader}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

const ProgressRing: React.FC<{ progress: number; size: number; strokeWidth: number; color: string; backgroundColor?: string }> = ({ 
  progress, size, strokeWidth, color, backgroundColor = '#E5E5E5' 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <View style={[styles.progressRing, { width: size, height: size }]}>
      <View style={styles.progressRingInner}>
        <Text style={[styles.progressText, { color }]}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
};

const AchievementBadge: React.FC<{ 
  title: string; 
  icon?: string; 
  earned: boolean; 
  description?: string;
  tier?: string;
  size?: 'small' | 'medium' | 'large';
}> = ({ title, icon, earned, description, tier = 'bronze', size = 'medium' }) => {
  const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze;
  const sizeStyle = size === 'small' ? styles.badgeSmall : size === 'large' ? styles.badgeLarge : styles.badge;
  
  return (
    <View style={[
      sizeStyle,
      earned ? [styles.badgeEarned, { borderColor: tierConfig.color }] : styles.badgeLocked
    ]}>
      {/* Tier indicator */}
      {earned && (
        <View style={[styles.tierIndicator, { backgroundColor: tierConfig.color }]}>
          <Text style={styles.tierText}>{tierConfig.name.toUpperCase()}</Text>
        </View>
      )}
      
      {/* Achievement Icon */}
      <View style={styles.badgeIconContainer}>
        <Text style={[
          styles.badgeIcon, 
          { opacity: earned ? 1 : 0.3 },
          size === 'large' && styles.badgeIconLarge,
          size === 'small' && styles.badgeIconSmall
        ]}>
          {earned ? (icon || tierConfig.gradient[0] === '#CD7F32' ? '🥉' : 
                     tierConfig.gradient[0] === '#C0C0C0' ? '🥈' :
                     tierConfig.gradient[0] === '#FFD700' ? '🥇' : '🏆') : '🔒'}
        </Text>
        
        {/* Glow effect for earned achievements */}
        {earned && (
          <View style={[styles.glowEffect, { backgroundColor: tierConfig.color + '20' }]} />
        )}
      </View>
      
      {/* Achievement Title */}
      <Text style={[
        styles.badgeTitle, 
        { 
          opacity: earned ? 1 : 0.5,
          color: earned ? tierConfig.color : '#888',
          fontWeight: earned ? '800' : '600'
        },
        size === 'large' && styles.badgeTitleLarge,
        size === 'small' && styles.badgeTitleSmall
      ]}>
        {title}
      </Text>
      
      {/* Achievement Description */}
      {description && (
        <Text style={[
          styles.badgeDescription, 
          { opacity: earned ? 1 : 0.6 },
          size === 'large' && styles.badgeDescriptionLarge,
          size === 'small' && styles.badgeDescriptionSmall
        ]}>
          {description}
        </Text>
      )}
      
      {/* Shine effect for high-tier achievements */}
      {earned && (tier === 'gold' || tier === 'rose-gold') && (
        <View style={styles.shineEffect} />
      )}
    </View>
  );
};

export default function AccountTab() {
  // Profile state variables
  const [name, setName] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [uid, setUid] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [majors, setMajors] = useState<string>('');
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [minors, setMinors] = useState<string>('');
  const [houseMembership, setHouseMembership] = useState<string>('');
  const [race, setRace] = useState<string>('');
  const [pronouns, setPronouns] = useState<string>('');
  const [livingType, setLivingType] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [sexualOrientation, setSexualOrientation] = useState<string>('');
  const [expectedGraduation, setExpectedGraduation] = useState<string>('');
  const [pledgeClass, setPledgeClass] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [major, setMajor] = useState<string | null>(null);
  // Profile editing restriction: Users can only edit their profile once per week
  const [lastProfileUpdate, setLastProfileUpdate] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Dropdown states for better picker alternatives
  const [showGraduationDropdown, setShowGraduationDropdown] = useState(false);
  const [showPronounsDropdown, setShowPronounsDropdown] = useState(false);
  const [showHouseDropdown, setShowHouseDropdown] = useState(false);
  const [showPledgeClassDropdown, setShowPledgeClassDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showSexualOrientationDropdown, setShowSexualOrientationDropdown] = useState(false);
  const [showRaceDropdown, setShowRaceDropdown] = useState(false);
  const [showLivingTypeDropdown, setShowLivingTypeDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Event feedback modal state
  const [showEventFeedback, setShowEventFeedback] = useState(false);
  const [eventFeedbackModalVisible, setEventFeedbackModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventFeedbackData, setEventFeedbackData] = useState({
    rating: 5,
    would_attend_again: null as boolean | null,
    well_organized: null as boolean | null,
    comments: '',
  });
  
  const [classCode, setClassCode] = useState('');
  const [fileType, setFileType] = useState<'test' | 'notes' | 'materials'>('test');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [submittedFeedbackEvents, setSubmittedFeedbackEvents] = useState<Set<string>>(new Set());
  
  // Modal states
  const [testBankModalVisible, setTestBankModalVisible] = useState(false);
  const [accountDetailsModalVisible, setAccountDetailsModalVisible] = useState(false);
  const [pointAppealModalVisible, setPointAppealModalVisible] = useState(false);
  const [accountDeletionModalVisible, setAccountDeletionModalVisible] = useState(false);
  const [deletionConfirmationText, setDeletionConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Point appeal state
  const [selectedAppealEvent, setSelectedAppealEvent] = useState<Event | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealPictureUrl, setAppealPictureUrl] = useState('');
  const [userAppeals, setUserAppeals] = useState<PointAppeal[]>([]);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealableEvents, setAppealableEvents] = useState<Event[]>([]);

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    eventsThisMonth: 0,
    eventsThisSemester: 0,
    attendanceRate: 0,
    rankInPledgeClass: 0,
    totalInPledgeClass: 0,
    rankInFraternity: 0,
    totalInFraternity: 0,
    achievements: [] as string[],
    monthlyProgress: [] as { month: string; count: number }[],
  });

  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  // Helper function to check if user can edit profile (once per week)
  const canEditProfile = useCallback(() => {
    if (!lastProfileUpdate) return true; // First time editing
    
    const lastUpdate = new Date(lastProfileUpdate);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceUpdate >= 7;
  }, [lastProfileUpdate]);

  // Helper function to get when user can edit again
  const getNextEditDate = useCallback(() => {
    if (!lastProfileUpdate) return null;
    
    const lastUpdate = new Date(lastProfileUpdate);
    const nextEditDate = new Date(lastUpdate);
    nextEditDate.setDate(nextEditDate.getDate() + 7);
    
    return nextEditDate;
  }, [lastProfileUpdate]);

  const calculateAnalytics = useCallback(async (userEvents: Event[], profile: any, userId: string) => {
    try {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisSemester = new Date(now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1, 8, 1); // Fall semester starts in August
      
      // Fetch registrations to calculate bonus points (1.5x multiplier for registration)
      // BUG FIX: Ensure we filter out null/undefined event IDs
      const eventIds = userEvents.map(e => e?.id).filter(id => id != null && id !== '');
      const { data: registrations } = await supabase
        .from('event_registration')
        .select('event_id')
        .eq('user_id', userId)
        .in('event_id', eventIds);
      
      const registeredEventIds = new Set(registrations?.map(r => r.event_id) || []);
      
      // Calculate total points with registration bonus
      // BUG FIX: Use actual event point_value with 1.5x multiplier if registered (not +0.5)
      let totalPoints = userEvents.reduce((sum, event) => {
        const basePoints = event.point_value || 1.0; // Use actual point value
        const wasRegistered = registeredEventIds.has(event.id);
        const pointsEarned = wasRegistered ? basePoints * 1.5 : basePoints;
        return sum + pointsEarned;
      }, 0);
      
      // Add approved point appeals
      const { data: approvedAppeals } = await supabase
        .from('point_appeal')
        .select('event_id, events(point_value)')
        .eq('user_id', userId)
        .eq('status', 'approved');
      
      if (approvedAppeals && approvedAppeals.length > 0) {
        const appealPoints = approvedAppeals.reduce((sum, appeal) => {
          // @ts-ignore - events is a nested object from the join
          return sum + (appeal.events?.point_value || 0);
        }, 0);
        totalPoints += appealPoints;
      }
      
      const eventsThisMonth = userEvents.filter(event => getDateInEST(event.date) >= thisMonth).length;
      const eventsThisSemester = userEvents.filter(event => getDateInEST(event.date) >= thisSemester).length;
      
      // Calculate streaks
      const sortedEvents = [...userEvents].sort((a, b) => getDateInEST(a.date).getTime() - getDateInEST(b.date).getTime());
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastEventDate: Date | null = null;
      
      sortedEvents.forEach(event => {
        const eventDate = getDateInEST(event.date);
        if (lastEventDate) {
          const daysDiff = Math.floor((eventDate.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 14) { // Events within 2 weeks count as consecutive
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        } else {
          tempStreak = 1;
        }
        lastEventDate = eventDate;
      });
      
      longestStreak = Math.max(longestStreak, tempStreak);
      currentStreak = tempStreak;
      
      // Parallelize first batch of queries: events, pledge class members, all members
      const [
        { data: allEvents },
        { data: pledgeClassMembers },
        { data: allMembers }
      ] = await Promise.all([
        supabase
          .from('events')
          .select('id')
          .eq('status', 'approved')
          .gte('start_time', thisSemester.toISOString()),
        supabase
          .from('users')
          .select('user_id')
          .eq('pledge_class', profile.pledge_class)
          .eq('approved', true),
        supabase
          .from('users')
          .select('user_id')
          .eq('approved', true)
      ]);
      
      const attendanceRate = allEvents ? (eventsThisSemester / allEvents.length) * 100 : 0;
      const totalInPledgeClass = pledgeClassMembers?.length || 1;
      const totalInFraternity = allMembers?.length || 1;
      
      // Use database aggregation to calculate points per user (MUCH faster than client-side)
      const pledgeClassUserIds = pledgeClassMembers?.map(m => m.user_id) || [];
      const allMemberUserIds = allMembers ? allMembers.map(m => m.user_id) : [];
      
      // Calculate pledge class rankings using database aggregation
      let rankInPledgeClass = 0;
      if (pledgeClassUserIds.length > 0) {
        // Try database aggregation first (fallback to manual if RPC doesn't exist)
        const aggregationResult = await supabase.rpc('calculate_user_points', {
          user_ids: pledgeClassUserIds
        });

        // Fallback to manual calculation if RPC doesn't exist or fails
        if (aggregationResult.error || !aggregationResult.data) {
          const [
            { data: pledgeClassAttendance },
            { data: pledgeClassApprovedAppeals }
          ] = await Promise.all([
            supabase
              .from('event_attendance')
              .select('user_id, events(point_value)')
              .in('user_id', pledgeClassUserIds),
            supabase
              .from('point_appeal')
              .select('user_id, events(point_value)')
              .in('user_id', pledgeClassUserIds)
              .eq('status', 'approved')
          ]);

          // Client-side aggregation as fallback
          // BUG FIX: Need to account for registration bonus (1.5x multiplier)
          const memberPoints: Record<string, number> = {};
          
          // Get registration data for all pledge class members
          const eventIdsForPledgeClass = pledgeClassAttendance?.map(a => (a.events as any)?.id).filter(Boolean) || [];
          const { data: pledgeRegistrations } = await supabase
            .from('event_registration')
            .select('user_id, event_id')
            .in('user_id', pledgeClassUserIds)
            .in('event_id', eventIdsForPledgeClass);
          
          const registrationMap = new Map<string, Set<string>>();
          pledgeRegistrations?.forEach(reg => {
            if (!registrationMap.has(reg.user_id)) {
              registrationMap.set(reg.user_id, new Set());
            }
            registrationMap.get(reg.user_id)!.add(reg.event_id);
          });
          
          pledgeClassAttendance?.forEach(record => {
            const eventData = record.events as any;
            const eventId = Array.isArray(eventData) ? eventData[0]?.id : eventData?.id;
            const basePoints = Array.isArray(eventData) ? eventData[0]?.point_value || 0 : eventData?.point_value || 0;
            const userRegistered = registrationMap.get(record.user_id)?.has(eventId) || false;
            const points = userRegistered ? basePoints * 1.5 : basePoints;
            memberPoints[record.user_id] = (memberPoints[record.user_id] || 0) + points;
          });
          pledgeClassApprovedAppeals?.forEach(record => {
            const eventData = record.events as any;
            const points = Array.isArray(eventData) ? eventData[0]?.point_value || 0 : eventData?.point_value || 0;
            memberPoints[record.user_id] = (memberPoints[record.user_id] || 0) + points;
          });

          const sortedMembers = Object.entries(memberPoints).sort(([,a], [,b]) => b - a);
          rankInPledgeClass = sortedMembers.findIndex(([id]) => id === userId) + 1;
        } else {
          // Use aggregated data from database
          const sorted = aggregationResult.data.sort((a: any, b: any) => b.total_points - a.total_points);
          rankInPledgeClass = sorted.findIndex((p: any) => p.user_id === userId) + 1;
        }
      }

      // Calculate fraternity rankings using database aggregation
      let rankInFraternity = 0;
      if (allMemberUserIds.length > 0) {
        // Try to use database aggregation RPC
        const fraternityAggregation = await supabase.rpc('calculate_user_points', {
          user_ids: allMemberUserIds
        });

        // Fallback to manual calculation if RPC doesn't exist or fails
        if (fraternityAggregation.error || !fraternityAggregation.data) {
          const [
            { data: allAttendance },
            { data: allApprovedAppeals }
          ] = await Promise.all([
            supabase
              .from('event_attendance')
              .select('user_id, events(point_value)')
              .in('user_id', allMemberUserIds),
            supabase
              .from('point_appeal')
              .select('user_id, events(point_value)')
              .in('user_id', allMemberUserIds)
              .eq('status', 'approved')
          ]);

          // Client-side aggregation as fallback
          // BUG FIX: Need to account for registration bonus (1.5x multiplier)
          const fraternityPoints: Record<string, number> = {};
          
          // Get registration data for all fraternity members
          const eventIdsForFraternity = allAttendance?.map(a => (a.events as any)?.id).filter(Boolean) || [];
          const { data: fraternityRegistrations } = await supabase
            .from('event_registration')
            .select('user_id, event_id')
            .in('user_id', allMemberUserIds)
            .in('event_id', eventIdsForFraternity);
          
          const fraternityRegMap = new Map<string, Set<string>>();
          fraternityRegistrations?.forEach(reg => {
            if (!fraternityRegMap.has(reg.user_id)) {
              fraternityRegMap.set(reg.user_id, new Set());
            }
            fraternityRegMap.get(reg.user_id)!.add(reg.event_id);
          });
          
          allAttendance?.forEach(record => {
            const eventData = record.events as any;
            const eventId = Array.isArray(eventData) ? eventData[0]?.id : eventData?.id;
            const basePoints = Array.isArray(eventData) ? eventData[0]?.point_value || 0 : eventData?.point_value || 0;
            const userRegistered = fraternityRegMap.get(record.user_id)?.has(eventId) || false;
            const points = userRegistered ? basePoints * 1.5 : basePoints;
            fraternityPoints[record.user_id] = (fraternityPoints[record.user_id] || 0) + points;
          });
          allApprovedAppeals?.forEach(record => {
            const eventData = record.events as any;
            const points = Array.isArray(eventData) ? eventData[0]?.point_value || 0 : eventData?.point_value || 0;
            fraternityPoints[record.user_id] = (fraternityPoints[record.user_id] || 0) + points;
          });

          const sortedAllMembers = Object.entries(fraternityPoints).sort(([,a], [,b]) => b - a);
          rankInFraternity = sortedAllMembers.findIndex(([id]) => id === userId) + 1;
        } else {
          // Use aggregated data from database
          const sorted = fraternityAggregation.data.sort((a: any, b: any) => b.total_points - a.total_points);
          rankInFraternity = sorted.findIndex((p: any) => p.user_id === userId) + 1;
        }
      }
      
      // Monthly progress for last 6 months
      const monthlyProgress = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthEvents = userEvents.filter(event => {
          const eventDate = getDateInEST(event.date);
          return eventDate >= monthStart && eventDate <= monthEnd;
        }).length;
        
        monthlyProgress.push({
          month: date.toLocaleString('default', { month: 'short' }),
          count: monthEvents
        });
      }
      
      // Determine achievements
      const achievements = [];
      
      // Get unique event types for diversity check
      const uniqueEventTypes = [...new Set(userEvents.map(event => event.point_type).filter(Boolean))];
      
      // Consistency & Streaks (Bronze → Rose Gold progression)
      if (currentStreak >= 3) achievements.push('streak_starter');
      if (currentStreak >= 10) achievements.push('iron_brother');
      if (currentStreak >= 20) achievements.push('unstoppable');
      if (currentStreak >= 30) achievements.push('legend_streak');
      
      // Milestone Attendance
      if (eventsThisSemester >= 1) achievements.push('first_timer');
      if (eventsThisSemester >= 10) achievements.push('ten_strong');
      if (eventsThisSemester >= 25) achievements.push('silver_brother');
      if (eventsThisSemester >= 50) achievements.push('gold_brother');
      if (eventsThisSemester >= 100) achievements.push('diamond_brother');
      
      // Points-based achievements (enhanced progression)
      if (totalPoints >= 50) achievements.push('points_50');
      if (totalPoints >= 100) achievements.push('points_100');
      if (totalPoints >= 250) achievements.push('points_250');
      if (totalPoints >= 500) achievements.push('points_500');
      
      // Attendance rate achievements
      if (attendanceRate >= 75) achievements.push('punctual_pro');
      if (attendanceRate >= 100) achievements.push('perfect_semester');
      
      // Monthly performance
      if (eventsThisMonth >= 5) achievements.push('monthly_champion');
      
      // Leadership & Community
      if (rankInPledgeClass <= 3 && totalInPledgeClass > 3) achievements.push('top_3');
      if (uniqueEventTypes.length >= 3) achievements.push('community_leader');
      if (eventsThisSemester >= 15) achievements.push('dedicated_member');
      
      // Special Rose Gold achievements (very exclusive)
      if (totalPoints >= 1000 && attendanceRate >= 95 && eventsThisSemester >= 75) {
        achievements.push('fraternity_legend');
      }
      
      // Check for mentor achievements (would need additional data tracking)
      // For now, award based on high activity and leadership
      if (eventsThisSemester >= 50 && rankInPledgeClass <= 2 && uniqueEventTypes.length >= 4) {
        achievements.push('mentor_master');
      }
      
      setAnalytics({
        totalPoints,
        currentStreak,
        longestStreak,
        eventsThisMonth,
        eventsThisSemester,
        attendanceRate,
        rankInPledgeClass,
        totalInPledgeClass,
        rankInFraternity,
        totalInFraternity,
        achievements,
        monthlyProgress,
      });
    } catch (error) {
      console.error('Analytics calculation error:', error);
    }
  }, []);

  const fetchUserAppeals = useCallback(async () => {
    try {
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) return;
      
      // BUG FIX: Get user role from database instead of state to avoid race condition
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', authResult.user.id)
        .single();
      
      // Skip fetching user appeals for pledges
      if (userData?.role === 'pledge') {
        setUserAppeals([]);
        return;
      }

      const { data: appeals, error } = await supabase
        .from('point_appeal')
        .select(`
          *,
          events(id, title, start_time, point_value, point_type)
        `)
        .eq('user_id', authResult.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching appeals:', error);
        return;
      }

      // Fetch reviewer information separately to avoid foreign key issues
      // BUG FIX: Ensure appeals is an array before processing
      let appealsWithReviewers = Array.isArray(appeals) ? appeals : [];
      if (appealsWithReviewers.length > 0) {
        const reviewerIds = [...new Set(appealsWithReviewers.map(a => a?.reviewed_by).filter(id => id != null))];
        
        if (reviewerIds.length > 0) {
          const { data: reviewers, error: reviewerError } = await supabase
            .from('users')
            .select('user_id, first_name, last_name')
            .in('user_id', reviewerIds);

          if (!reviewerError && reviewers && Array.isArray(reviewers)) {
            const reviewerMap = reviewers.reduce((map, reviewer) => {
              if (reviewer?.user_id) {
                map[reviewer.user_id] = reviewer;
              }
              return map;
            }, {} as Record<string, any>);

            appealsWithReviewers = appealsWithReviewers.map(appeal => ({
              ...appeal,
              reviewer: appeal?.reviewed_by ? reviewerMap[appeal.reviewed_by] : null
            }));
          }
        }
      }

      setUserAppeals(appealsWithReviewers);
    } catch (error) {
      console.error('Error in fetchUserAppeals:', error);
    }
  }, []); // userRole is checked inside the function, no dependency needed

  const fetchAppealableEvents = useCallback(async () => {
    try {
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) return;
      
      // BUG FIX: Get user role from database instead of state to avoid race condition
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', authResult.user.id)
        .single();
      
      // Skip fetching appealable events for pledges
      if (userData?.role === 'pledge') {
        setAppealableEvents([]);
        return;
      }

      // Fetch approved events from the last 30 days that user didn't attend
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const currentTime = new Date();

      // Parallelize all three queries
      const [
        { data: allEvents, error: eventsError },
        { data: attendedEvents, error: attendanceError },
        { data: appealedEvents, error: appealsError }
      ] = await Promise.all([
        supabase
          .from('events')
          .select(`
            id, 
            title, 
            start_time,
            end_time,
            point_value, 
            point_type,
            creator:created_by(first_name, last_name)
          `)
          .eq('status', 'approved')
          .gte('start_time', thirtyDaysAgo.toISOString())
          .lt('end_time', currentTime.toISOString()) // Only past events
          .neq('point_type', 'No Point') // Exclude "No Point" events
          .order('start_time', { ascending: false }),
        supabase
          .from('event_attendance')
          .select('event_id')
          .eq('user_id', authResult.user.id),
        supabase
          .from('point_appeal')
          .select('event_id')
          .eq('user_id', authResult.user.id)
      ]);

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return;
      }

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        return;
      }

      if (appealsError) {
        console.error('Error fetching appeals:', appealsError);
        return;
      }

      // BUG FIX: Ensure data is arrays before creating Sets
      const attendedEventIds = new Set(
        Array.isArray(attendedEvents) ? attendedEvents.map(a => a?.event_id).filter(id => id != null) : []
      );
      const appealedEventIds = new Set(
        Array.isArray(appealedEvents) ? appealedEvents.map(a => a?.event_id).filter(id => id != null) : []
      );

      // Filter to events that meet appeal criteria:
      // 1. Not attended by user
      // 2. Not already appealed by user  
      // 3. Past events only (end_time < current time) - filtered in query
      // 4. Exclude "No Point" events - filtered in query
      // BUG FIX: Ensure allEvents is an array and filter out invalid events
      const appealable = (Array.isArray(allEvents) ? allEvents : [])
        .filter(event => 
          event?.id && 
          event?.title && 
          event?.start_time &&
          !attendedEventIds.has(event.id) && 
          !appealedEventIds.has(event.id)
        )
        .map(event => {
          let hostName = 'N/A';
          try {
            if (Array.isArray(event.creator) && event.creator.length > 0) {
              const creator = event.creator[0];
              hostName = `${creator?.first_name || ''} ${creator?.last_name || ''}`.trim() || 'N/A';
            } else if (event.creator && typeof event.creator === 'object') {
              const creator = event.creator as any;
              hostName = `${creator?.first_name || ''} ${creator?.last_name || ''}`.trim() || 'N/A';
            }
          } catch (e) {
            hostName = 'N/A';
          }
          
          return {
            id: event.id,
            title: event.title || 'Untitled Event',
            date: event.start_time,
            host_name: hostName,
            point_value: event.point_value || 0,
            point_type: event.point_type || 'other',
          };
        });

      setAppealableEvents(appealable);
    } catch (error) {
      console.error('Error in fetchAppealableEvents:', error);
    }
  }, []); // userRole is checked inside the function, no dependency needed

  const fetchAccountData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Step 1: Check authentication
      const authResult = await checkAuthentication();
      
      if (!authResult.isAuthenticated) {
        console.error('Authentication failed:', authResult.error);
        handleAuthenticationRedirect();
        return;
      }
      
      const user = authResult.user;

      // Step 2: SINGLE RPC CALL - Get everything at once!
      const { data: dashboardData, error: dashboardError } = await supabase
        .rpc('get_account_dashboard', {
          p_user_id: user.id
        });

      if (dashboardError) {
        console.error('Dashboard fetch error:', dashboardError);
        throw new Error(`Failed to load account data: ${dashboardError.message}`);
      }

      if (!dashboardData) {
        throw new Error('No account data received. Please contact support.');
      }

      // Parse the returned JSON
      const profile = dashboardData.profile;
      const events = dashboardData.events || [];
      const analytics = dashboardData.analytics || {};
      const userAppeals = dashboardData.user_appeals || [];
      const appealableEvents = dashboardData.appealable_events || [];

      // Check if account is approved
      if (!profile.approved) {
        Alert.alert('Pending Approval', 'Your account is awaiting approval.');
        setLoading(false);
        return;
      }

      // Step 3: Update all state with received data
      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      setName(fullName);
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhoneNumber(profile.phone_number || '');
      setEmail(profile.email || '');
      setUid(profile.uid || '');
      setUserRole(profile.role || null);
      setMajors(profile.majors || '');
      
      // Parse majors into array for multi-select
      if (profile.majors) {
        setSelectedMajors(profile.majors.split(', '));
      }
      
      setMinors(profile.minors || '');
      setHouseMembership(profile.house_membership || '');
      setRace(profile.race || '');
      setPronouns(profile.pronouns || '');
      setLivingType(profile.living_type || '');
      setGender(profile.gender || '');
      setSexualOrientation(profile.sexual_orientation || '');
      setExpectedGraduation(profile.expected_graduation || '');
      setPledgeClass(profile.pledge_class);
      setMajor(profile.majors || '');
      setLastProfileUpdate(profile.last_profile_update);

      // Set events (already sorted and deduplicated by database)
      setEvents(events);

      // Set analytics (already calculated by database)
      setAnalytics({
        totalPoints: analytics.totalPoints || 0,
        currentStreak: analytics.currentStreak || 0,
        longestStreak: analytics.longestStreak || 0,
        eventsThisMonth: analytics.eventsThisMonth || 0,
        eventsThisSemester: analytics.eventsThisSemester || 0,
        attendanceRate: analytics.attendanceRate || 0,
        rankInPledgeClass: analytics.rankInPledgeClass || 0,
        totalInPledgeClass: analytics.totalInPledgeClass || 0,
        rankInFraternity: analytics.rankInFraternity || 0,
        totalInFraternity: analytics.totalInFraternity || 0,
        achievements: analytics.achievements || [],
        monthlyProgress: [], // Can add this to RPC if needed
      });

      // Set appeals data
      setUserAppeals(userAppeals);
      setAppealableEvents(appealableEvents);

      // Fetch event feedback submissions (small query, keep separate)
      // BUG FIX: Ensure events is an array and properly filter null/undefined ids
      const eventIds = Array.isArray(events) 
        ? events.map((event: any) => event?.id).filter((id: any) => id != null && id !== '') 
        : [];
      
      if (eventIds.length > 0) {
        const { data: existingFeedback, error: feedbackError } = await supabase
          .from('event_feedback')
          .select('event_id')
          .eq('user_id', user.id)
          .in('event_id', eventIds);
        
        if (!feedbackError && existingFeedback) {
          const submittedEventIds = new Set(existingFeedback.map(feedback => feedback.event_id));
          setSubmittedFeedbackEvents(submittedEventIds);
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('fetchAccountData error:', err);
      setError(errorMessage);
      Alert.alert('Error Loading Account', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - RPC function is self-contained

  // Use focus-aware loading instead of useEffect
  useFocusEffect(
    useCallback(() => {
      fetchAccountData();
    }, [fetchAccountData])
  );

  const saveProfile = async () => {
    // Check if user can edit profile (once per week restriction)
    if (!canEditProfile()) {
      const nextEditDate = getNextEditDate();
      const daysRemaining = Math.ceil((nextEditDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      Alert.alert(
        'Profile Edit Limit',
        `You can only edit your profile once per week. You can edit again in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (${formatDateInEST(nextEditDate!.toISOString())}).`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    try {
      // Check authentication
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      const user = authResult.user;

      // BUG FIX: Validate required fields before saving
      if (!firstName?.trim() || !lastName?.trim()) {
        Alert.alert('Validation Error', 'First name and last name are required.');
        return;
      }

      // Combine selected majors into a comma-separated string
      const majorsString = selectedMajors.length > 0 ? selectedMajors.join(', ') : majors;

      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber?.trim() || null,
          email: email?.trim() || null,
          uid: uid?.trim() || null,
          // date_of_birth: dateOfBirth, // Column doesn't exist yet
          majors: majorsString || null,
          minors: minors?.trim() || null,
          house_membership: houseMembership || null,
          race: race || null,
          pronouns: pronouns || null,
          living_type: livingType || null,
          gender: gender || null,
          sexual_orientation: sexualOrientation || null,
          expected_graduation: expectedGraduation || null,
          pledge_class: pledgeClass || null,
          last_profile_update: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        Alert.alert('Error', 'Could not update profile. Please try again.');
      } else {
        setEditing(false);
        setLastProfileUpdate(new Date().toISOString());
        Alert.alert('Saved', 'Your profile has been updated successfully! You can edit your profile again in 7 days.');
        // Refresh account data to show updated information
        fetchAccountData();
      }
    } catch (error) {
      console.error('Unexpected error in saveProfile:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const submitFeedback = async () => {
    if (submittingFeedback) return; // Prevent double submission    setSubmittingFeedback(true);
    
    try {
      // Check authentication
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {        handleAuthenticationRedirect('You must be logged in to submit feedback.');
        return;
      }

      const user = authResult.user;      if (!feedbackSubject.trim() || !feedbackMessage.trim()) {        Alert.alert('Error', 'Please fill in both subject and message.');
        return;
      }

      // Simple direct insert approach with proper user ID handling
      const feedbackData = {
        user_id: user.id,
        subject: feedbackSubject.trim(),
        message: feedbackMessage.trim(),
      };

      const { data: result, error: submitError } = await supabase
        .from('admin_feedback')
        .insert(feedbackData)
        .select();

      if (submitError) {
        console.error('Submit failed:', {
          code: submitError.code,
          message: submitError.message,
          details: submitError.details,
          hint: submitError.hint
        });
        throw submitError;
      }

      Alert.alert('Thanks!', 'Your feedback was submitted successfully.');
      setFeedbackSubject('');
      setFeedbackMessage('');
    } catch (error) {
            console.error('Feedback submission error:', error);
      
      // More specific error messages
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any;
        if (dbError.code === '42501') {
          Alert.alert(
            'Permission Error', 
            'There seems to be a database permission issue. Please contact an administrator.'
          );
        } else if (dbError.code === '23505') {
          Alert.alert(
            'Duplicate Entry', 
            'It looks like you may have already submitted this feedback. Please try with different content.'
          );
        } else {
          Alert.alert(
            'Database Error', 
            `Error ${dbError.code}: ${dbError.message || 'Unknown database error'}`
          );
        }
      } else {
        Alert.alert(
          'Submission Failed', 
          error instanceof Error 
            ? `Error: ${error.message}` 
            : 'Could not send feedback. Please try again.'
        );
      }
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Event feedback functions
  const handleEventFeedbackPress = (event: Event) => {
    setSelectedEvent(event);
    setEventFeedbackModalVisible(true);
  };

  const submitEventFeedback = async () => {
    if (!selectedEvent) {
      Alert.alert('Error', 'No event selected for feedback.');
      return;
    }

    // BUG FIX: Validate feedback data before submitting
    if (eventFeedbackData.rating < 1 || eventFeedbackData.rating > 5) {
      Alert.alert('Validation Error', 'Please provide a rating between 1 and 5.');
      return;
    }

    if (eventFeedbackData.would_attend_again === null || eventFeedbackData.well_organized === null) {
      Alert.alert('Validation Error', 'Please answer all required questions.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit feedback.');
      return;
    }

    try {
      const { error } = await supabase.from('event_feedback').insert({
        user_id: user.id,
        event_id: selectedEvent.id,
        rating: eventFeedbackData.rating,
        would_attend_again: eventFeedbackData.would_attend_again,
        well_organized: eventFeedbackData.well_organized,
        comments: eventFeedbackData.comments?.trim() || null,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Event feedback submission error:', error);
        throw error;
      }
      
      Alert.alert('Thanks!', 'Your event feedback was submitted successfully.');
      
      // Add event to submitted feedback list
      setSubmittedFeedbackEvents(prev => new Set([...prev, selectedEvent.id]));
      
      setEventFeedbackModalVisible(false);
      setSelectedEvent(null);
      setEventFeedbackData({
        rating: 5,
        would_attend_again: null,
        well_organized: null,
        comments: '',
      });
    } catch (error) {
      console.error('Event feedback submission error:', error);
      Alert.alert('Error', 'Could not submit feedback. Please try again.');
    }
  };

  // Point appeal functions
  const handlePointAppealPress = (event: Event) => {
    setSelectedAppealEvent(event);
    setPointAppealModalVisible(true);
  };

  const submitPointAppeal = async () => {
    if (!selectedAppealEvent || submittingAppeal) return;

    if (!appealReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your appeal.');
      return;
    }

    if (!appealPictureUrl.trim()) {
      Alert.alert('Error', 'Please provide a picture URL as evidence for your appeal.');
      return;
    }

    // BUG FIX: Validate picture URL format
    try {
      new URL(appealPictureUrl.trim());
    } catch (e) {
      Alert.alert('Invalid URL', 'Please provide a valid picture URL (must start with http:// or https://).');
      return;
    }

    setSubmittingAppeal(true);

    try {
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      const appealData: PointAppealSubmission = {
        event_id: selectedAppealEvent.id,
        appeal_reason: appealReason.trim(),
        picture_url: appealPictureUrl.trim(), // Required field
      };

      const { error } = await supabase
        .from('point_appeal')
        .insert({
          user_id: authResult.user.id,
          ...appealData,
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          Alert.alert('Already Submitted', 'You have already submitted an appeal for this event.');
        } else {
          console.error('Point appeal submission error:', error);
          Alert.alert('Error', 'Could not submit appeal. Please try again.');
        }
        return;
      }

      Alert.alert('Success', 'Your point appeal has been submitted for review.');
      
      // Reset form
      setAppealReason('');
      setAppealPictureUrl('');
      setPointAppealModalVisible(false);
      setSelectedAppealEvent(null);
      
      // Refresh appeals list
      fetchUserAppeals();
      // Refresh appealable events list
      fetchAppealableEvents();
    } catch (error) {
      console.error('Point appeal submission error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout Failed', error.message);
    } else {
      // Redirect to login screen after successful logout
      handleAuthenticationRedirect();
    }
  };

  const handleAccountDeletion = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will:\n\n• Delete all your personal data\n• Remove your event history\n• Cancel any pending appeals\n• Remove you from all organizations\n\nThis process may take up to 30 days to complete.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => setAccountDeletionModalVisible(true),
        },
      ]
    );
  };

  const confirmAccountDeletion = async () => {
    if (deletionConfirmationText.toLowerCase() !== 'delete my account') {
      Alert.alert('Confirmation Required', 'Please type "DELETE MY ACCOUNT" exactly to confirm deletion.');
      return;
    }

    setIsDeletingAccount(true);

    try {
      // Check authentication
      const authResult = await checkAuthentication();
      if (!authResult.isAuthenticated) {
        handleAuthenticationRedirect();
        return;
      }

      const user = authResult.user;

      // Call the account deletion service
      const result = await AccountDeletionService.deleteAccount(user.id);

      if (!result.success) {
        console.error('Account deletion error:', result.error);
        Alert.alert(
          'Deletion Failed',
          result.error || 'We encountered an error while processing your account deletion. Please try again or contact support.'
        );
        return;
      }

      // Sign out the user
      await supabase.auth.signOut();

      Alert.alert(
        'Account Deletion Initiated',
        'Your account deletion has been initiated. You have been logged out and your data will be permanently removed within 30 days. If you change your mind, you can contact support within 7 days to potentially recover your account.',
        [
          {
            text: 'OK',
            onPress: () => {
              setAccountDeletionModalVisible(false);
              setDeletionConfirmationText('');
              handleAuthenticationRedirect();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Unexpected error during account deletion:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const handleTestBankSubmission = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      if (!classCode || !fileType || !selectedFile) {
        Alert.alert('Error', 'Please fill in all required fields and select a file');
        return;
      }

      // In a real implementation, you would upload the file to Supabase Storage here
      // For now, we'll just create the database entry with the file name
      const storedFileName = `${classCode}_${fileType}_${Date.now()}_${selectedFile.name}`;

      const { error } = await supabase
        .from('test_bank')
        .insert({
          submitted_by: user.id,
          class_code: classCode.toUpperCase(),
          file_type: fileType,
          original_file_name: selectedFile.name,
          stored_file_name: storedFileName,
          status: 'pending',
          uploaded_at: new Date().toISOString()
        });

      if (error) throw error;

      Alert.alert('Success', 'Your submission has been received and is pending review');
      setTestBankModalVisible(false);
      setClassCode('');
      setFileType('test');
      setSelectedFile(null);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit');
    }
  };

  const renderProfileSection = useMemo(() => (
    editing ? (
      <View style={styles.profileFormContainer}>
        <Text style={styles.formTitle}>Edit Profile</Text>
        
        {/* Personal Information Section */}
        <Text style={styles.sectionLabel}>Personal Information</Text>
        
        <Text style={styles.fieldLabel}>First Name *</Text>
        <TextInput
          style={styles.profileFormInput}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>Last Name *</Text>
        <TextInput
          style={styles.profileFormInput}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>Phone Number</Text>
        <TextInput
          style={styles.profileFormInput}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="(123) 456-7890"
          keyboardType="phone-pad"
        />

        <Text style={styles.fieldLabel}>Email (Non-Terpmail)</Text>
        <TextInput
          style={styles.profileFormInput}
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>UID</Text>
        <TextInput
          style={styles.profileFormInput}
          value={uid}
          onChangeText={setUid}
          placeholder="Enter your UID"
        />

        {/* Date of Birth field - temporarily commented out until DB column is added
        <Text style={styles.fieldLabel}>Date of Birth</Text>
        <TouchableOpacity
          style={styles.profileDateInput}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={dateOfBirth ? styles.dateText : styles.placeholderText}>
            {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : 'Select date of birth'}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDateOfBirth(selectedDate.toISOString().split('T')[0]);
              }
            }}
            maximumDate={new Date()}
          />
        )}
        */}

        <Text style={styles.fieldLabel}>Pronouns</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowPronounsDropdown(!showPronounsDropdown)}
        >
          <Text style={[styles.dropdownButtonText, !pronouns && styles.placeholderText]}>
            {pronouns ? pronouns.charAt(0).toUpperCase() + pronouns.slice(1).replace('_', ' ') : 'Select pronouns'}
          </Text>
          <Text style={styles.dropdownArrow}>{showPronounsDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showPronounsDropdown && (
          <View style={styles.dropdownContainer}>
            <ScrollView 
              style={{ maxHeight: 150 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {[
                { label: 'He/Him', value: 'he/him' },
                { label: 'She/Her', value: 'she/her' },
                { label: 'They/Them', value: 'they/them' },
                { label: 'He/They', value: 'he/they' },
                { label: 'She/They', value: 'she/they' },
                { label: 'Other', value: 'other' },
                { label: 'Prefer not to say', value: 'prefer_not_to_say' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    pronouns === option.value && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setPronouns(option.value);
                    setShowPronounsDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    pronouns === option.value && styles.dropdownOptionSelectedText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Academic Information Section */}
        <Text style={styles.sectionLabel}>Academic Information</Text>

        <Text style={styles.fieldLabel}>Majors / Intended Majors</Text>
        <MajorMultiSelect
          selectedMajors={selectedMajors}
          onSelectionChange={setSelectedMajors}
        />

        <Text style={styles.fieldLabel}>Minors / Intended Minors</Text>
        <TextInput
          style={styles.profileFormInput}
          value={minors}
          onChangeText={setMinors}
          placeholder="Statistics, Business"
          multiline={true}
          numberOfLines={2}
        />

        <Text style={styles.fieldLabel}>Expected Graduation</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowGraduationDropdown(!showGraduationDropdown)}
        >
          <Text style={[styles.dropdownButtonText, !expectedGraduation && styles.placeholderText]}>
            {expectedGraduation || 'Select graduation date'}
          </Text>
          <Text style={styles.dropdownArrow}>{showGraduationDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showGraduationDropdown && (
          <View style={styles.dropdownContainer}>
            <ScrollView 
              style={{ maxHeight: 150 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {[
                'Winter 2025', 'Spring 2026', 'Winter 2026', 'Spring 2027',
                'Winter 2027', 'Spring 2028', 'Winter 2028', 'Spring 2029'
              ].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownOption,
                    expectedGraduation === option && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setExpectedGraduation(option);
                    setShowGraduationDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    expectedGraduation === option && styles.dropdownOptionSelectedText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Fraternity Information Section */}
        <Text style={styles.sectionLabel}>Fraternity Information</Text>

        <Text style={styles.fieldLabel}>House Membership</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowHouseDropdown(!showHouseDropdown)}
        >
          <Text style={[styles.dropdownButtonText, !houseMembership && styles.placeholderText]}>
            {houseMembership || 'Select house'}
          </Text>
          <Text style={styles.dropdownArrow}>{showHouseDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showHouseDropdown && (
          <View style={styles.dropdownContainer}>
            <ScrollView 
              style={{ maxHeight: 150 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {['Moysello', 'Tienken', 'Makay', 'Valentine'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownOption,
                    houseMembership === option && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setHouseMembership(option);
                    setShowHouseDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    houseMembership === option && styles.dropdownOptionSelectedText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.fieldLabel}>Pledge Class</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowPledgeClassDropdown(!showPledgeClassDropdown)}
        >
          <Text style={[styles.dropdownButtonText, !pledgeClass && styles.placeholderText]}>
            {pledgeClass || 'Select pledge class'}
          </Text>
          <Text style={styles.dropdownArrow}>{showPledgeClassDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showPledgeClassDropdown && (
          <View style={styles.dropdownContainer}>
            <ScrollView 
              style={{ maxHeight: 150 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {['Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownOption,
                    pledgeClass === option && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setPledgeClass(option);
                    setShowPledgeClassDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    pledgeClass === option && styles.dropdownOptionSelectedText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Personal Details Section */}
        <Text style={styles.sectionLabel}>Personal Details (Optional)</Text>

        <Text style={styles.fieldLabel}>Gender</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowGenderDropdown(!showGenderDropdown)}
        >
          <Text style={[styles.dropdownButtonText, !gender && styles.placeholderText]}>
            {gender ? gender.charAt(0).toUpperCase() + gender.slice(1).replace('_', ' ') : 'Select gender'}
          </Text>
          <Text style={styles.dropdownArrow}>{showGenderDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showGenderDropdown && (
          <View style={styles.dropdownContainer}>
            <ScrollView 
              style={{ maxHeight: 150 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {[
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
                { label: 'Non-binary', value: 'non_binary' },
                { label: 'Genderfluid', value: 'genderfluid' },
                { label: 'Other', value: 'other' },
                { label: 'Prefer not to say', value: 'prefer_not_to_say' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    gender === option.value && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setGender(option.value);
                    setShowGenderDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    gender === option.value && styles.dropdownOptionSelectedText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.fieldLabel}>Sexual Orientation</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowSexualOrientationDropdown(!showSexualOrientationDropdown)}
        >
          <Text style={[styles.dropdownButtonText, !sexualOrientation && styles.placeholderText]}>
            {sexualOrientation ? sexualOrientation.charAt(0).toUpperCase() + sexualOrientation.slice(1).replace('_', ' ') : 'Select sexual orientation'}
          </Text>
          <Text style={styles.dropdownArrow}>{showSexualOrientationDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showSexualOrientationDropdown && (
          <View style={styles.dropdownContainer}>
            <ScrollView 
              style={{ maxHeight: 150 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {[
                { label: 'Heterosexual', value: 'heterosexual' },
                { label: 'Gay', value: 'gay' },
                { label: 'Lesbian', value: 'lesbian' },
                { label: 'Bisexual', value: 'bisexual' },
                { label: 'Pansexual', value: 'pansexual' },
                { label: 'Asexual', value: 'asexual' },
                { label: 'Questioning', value: 'questioning' },
                { label: 'Other', value: 'other' },
                { label: 'Prefer not to say', value: 'prefer_not_to_say' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    sexualOrientation === option.value && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setSexualOrientation(option.value);
                    setShowSexualOrientationDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    sexualOrientation === option.value && styles.dropdownOptionSelectedText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.fieldLabel}>Race/Ethnicity</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowRaceDropdown(!showRaceDropdown)}
        >
          <Text style={[styles.dropdownButtonText, !race && styles.placeholderText]}>
            {race ? race.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Select race/ethnicity'}
          </Text>
          <Text style={styles.dropdownArrow}>{showRaceDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showRaceDropdown && (
          <View style={styles.dropdownContainer}>
            <ScrollView 
              style={{ maxHeight: 150 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {[
                { label: 'American Indian or Alaska Native', value: 'american_indian_alaska_native' },
                { label: 'Asian', value: 'asian' },
                { label: 'Black or African American', value: 'black_african_american' },
                { label: 'Hispanic or Latino', value: 'hispanic_latino' },
                { label: 'Native Hawaiian or Other Pacific Islander', value: 'native_hawaiian_pacific_islander' },
                { label: 'White', value: 'white' },
                { label: 'Two or more races', value: 'two_or_more_races' },
                { label: 'Other', value: 'other' },
                { label: 'Prefer not to say', value: 'prefer_not_to_say' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    race === option.value && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setRace(option.value);
                    setShowRaceDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    race === option.value && styles.dropdownOptionSelectedText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.fieldLabel}>Living Type</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowLivingTypeDropdown(!showLivingTypeDropdown)}
        >
          <Text style={[styles.dropdownButtonText, !livingType && styles.placeholderText]}>
            {livingType || 'Select living type'}
          </Text>
          <Text style={styles.dropdownArrow}>{showLivingTypeDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showLivingTypeDropdown && (
          <View style={styles.dropdownContainer}>
            <ScrollView 
              style={{ maxHeight: 150 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {[
                'On Campus Dorm', 'On Campus Apartment', 'Off Campus Apartment', 
                'Off Campus House', 'Commute'
              ].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.dropdownOption,
                    livingType === option && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    setLivingType(option);
                    setShowLivingTypeDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    livingType === option && styles.dropdownOptionSelectedText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Legacy fields for backward compatibility */}
        <Text style={styles.sectionLabel}>Legacy Information</Text>

        <Text style={styles.fieldLabel}>Primary Major (Legacy)</Text>
        <TextInput
          style={styles.profileFormInput}
          value={major ?? ''}
          onChangeText={setMajor}
          placeholder="Primary major for legacy compatibility"
        />

        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={saveProfile}>
          <Text style={styles.buttonText}>Save Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.profileCancelButton]} 
          onPress={() => setEditing(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <>
        <View style={styles.profileInfo}>
          <Text style={styles.meta}>Name: {name ?? '---'}</Text>
          <Text style={styles.meta}>Phone: {phoneNumber || '---'}</Text>
          <Text style={styles.meta}>Email: {email || '---'}</Text>
          <Text style={styles.meta}>UID: {uid || '---'}</Text>
          {/* <Text style={styles.meta}>Date of Birth: {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : '---'}</Text> */}
          <Text style={styles.meta}>Pronouns: {pronouns || '---'}</Text>
          <Text style={styles.meta}>Majors: {selectedMajors.length > 0 ? selectedMajors.join(', ') : majors || major || '---'}</Text>
          <Text style={styles.meta}>Minors: {minors || '---'}</Text>
          <Text style={styles.meta}>Expected Graduation: {expectedGraduation || '---'}</Text>
          <Text style={styles.meta}>Pledge Class: {pledgeClass ?? '---'}</Text>
          <Text style={styles.meta}>House Membership: {houseMembership || '---'}</Text>
          <Text style={styles.meta}>Living Type: {livingType || '---'}</Text>
          <Text style={styles.meta}>Race: {race || '---'}</Text>
          <Text style={styles.meta}>Gender: {gender || '---'}</Text>
          <Text style={styles.meta}>Sexual Orientation: {sexualOrientation || '---'}</Text>
        </View>
        {canEditProfile() ? (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editRestrictedContainer}>
            <TouchableOpacity style={[styles.editButton, styles.editButtonDisabled]} disabled>
              <Text style={[styles.editButtonText, styles.editButtonTextDisabled]}>Edit Profile</Text>
            </TouchableOpacity>
            <Text style={styles.editRestrictedText}>
              Profile can be edited once per week.{'\n'}
              Next edit available: {getNextEditDate() ? formatDateInEST(getNextEditDate()!.toISOString()) : 'N/A'}
            </Text>
          </View>
        )}
      </>
    )
  ), [editing, firstName, lastName, phoneNumber, email, uid, dateOfBirth, majors, selectedMajors, minors, houseMembership, race, pronouns, livingType, gender, sexualOrientation, expectedGraduation, name, pledgeClass, major, saveProfile, showDatePicker, canEditProfile, getNextEditDate]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: Colors.primary }]} 
              onPress={fetchAccountData}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Header with Profile */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileInitials}>
              {name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
            </Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{name || 'Loading...'}</Text>
            <Text style={styles.profileSubtitle}>
              {pledgeClass ? `${pledgeClass.charAt(0).toUpperCase() + pledgeClass.slice(1).toLowerCase()} | ${major || 'No Major'}` : 'Loading...'}
            </Text>
            {analytics.rankInPledgeClass > 0 && (
              <Text style={styles.rankBadge}>
                #{analytics.rankInPledgeClass} in {pledgeClass ? pledgeClass.charAt(0).toUpperCase() + pledgeClass.slice(1).toLowerCase() : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Stats Overview - Strava Style */}
        <View style={styles.statsContainer}>
          <StatCard 
            title="Total Points"
            value={analytics.totalPoints}
            color={Colors.secondary}
          />
          <StatCard 
            title="Current Streak"
            value={`${analytics.currentStreak} events`}
            subtitle={`Longest: ${analytics.longestStreak}`}
            color={Colors.primary}
          />
          <StatCard 
            title="Points Ranking"
            value={`#${analytics.rankInFraternity}`}
            subtitle={`out of ${analytics.totalInFraternity}`}
            color={Colors.primary}
          />
          <StatCard 
            title="Attendance Rate"
            value={`${Math.round(analytics.attendanceRate)}%`}
            subtitle="this semester"
            color={Colors.secondary}
          />
        </View>

        {/* Progress Ring - Duolingo Style */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Semester Progress</Text>
          <View style={styles.progressContainer}>
            <ProgressRing 
              progress={analytics.attendanceRate}
              size={120}
              strokeWidth={12}
              color={Colors.primary}
            />
            <View style={styles.progressDetails}>
              <Text style={styles.progressMainText}>
                {analytics.eventsThisSemester} events
              </Text>
              <Text style={styles.progressSubText}>
                Keep going! You&apos;re doing great this semester.
              </Text>
            </View>
          </View>
        </View>

        {/* Achievements - Expandable Section */}
        <View style={styles.achievementsSection}>
          <TouchableOpacity 
            style={styles.achievementsHeader}
            onPress={() => setAchievementsExpanded(!achievementsExpanded)}
          >
            <View>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <Text style={styles.achievementsSubtitle}>
                {analytics.achievements.length} of {Object.keys(ACHIEVEMENTS).length} earned
              </Text>
            </View>
            <Text style={styles.expandIcon}>{achievementsExpanded ? '' : ''}</Text>
          </TouchableOpacity>
          
          {/* Achievement Progress Bar */}
          <View style={styles.achievementProgress}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${(analytics.achievements.length / Object.keys(ACHIEVEMENTS).length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.achievementProgressText}>
              {Math.round((analytics.achievements.length / Object.keys(ACHIEVEMENTS).length) * 100)}% Complete
            </Text>
          </View>
          
          {/* Preview Grid - Show highest tier earned achievements */}
          <View style={styles.achievementsPreview}>
            {(() => {
              // Get earned achievements sorted by tier (highest first)
              const earnedAchievements = Object.entries(ACHIEVEMENTS)
                .filter(([key]) => analytics.achievements.includes(key))
                .sort(([, a], [, b]) => {
                  const tierA = TIER_CONFIG[a.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze;
                  const tierB = TIER_CONFIG[b.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.bronze;
                  return tierB.order - tierA.order;
                });
              
              // Show top 3 earned achievements, or first 3 if none earned
              const displayAchievements = earnedAchievements.length > 0 
                ? earnedAchievements.slice(0, 3)
                : Object.entries(ACHIEVEMENTS).slice(0, 3);
              
              return displayAchievements.map(([key, achievement]) => (
                <AchievementBadge 
                  key={key}
                  title={achievement.title}
                  icon={achievement.icon}
                  earned={analytics.achievements.includes(key)}
                  description={achievement.description}
                  tier={achievement.tier}
                  size="small"
                />
              ));
            })()}
            
            {/* Show count of remaining achievements with tier breakdown */}
            {Object.keys(ACHIEVEMENTS).length > 3 && (
              <View style={styles.moreAchievementsBadge}>
                <Text style={styles.moreAchievementsText}>
                  +{Object.keys(ACHIEVEMENTS).length - 3} more
                </Text>
                <View style={styles.tierSummary}>
                  {Object.entries(TIER_CONFIG).map(([tierKey, tierConfig]) => {
                    const tierCount = Object.values(ACHIEVEMENTS).filter(a => a.tier === tierKey).length;
                    const earnedCount = Object.entries(ACHIEVEMENTS)
                      .filter(([key, achievement]) => 
                        achievement.tier === tierKey && analytics.achievements.includes(key)
                      ).length;
                    return (
                      <View key={tierKey} style={styles.tierSummaryItem}>
                        <View style={[styles.tierDot, { backgroundColor: tierConfig.color }]} />
                        <Text style={styles.tierSummaryText}>{earnedCount}/{tierCount}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Full Grid - Expanded view organized by tiers */}
          {achievementsExpanded && (
            <View style={styles.achievementsExpanded}>
              {Object.entries(TIER_CONFIG)
                .sort(([, a], [, b]) => b.order - a.order) // Highest tier first
                .map(([tierKey, tierConfig]) => {
                  const tierAchievements = Object.entries(ACHIEVEMENTS).filter(
                    ([_, achievement]) => achievement.tier === tierKey
                  );
                  
                  if (tierAchievements.length === 0) return null;
                  
                  const earnedInTier = tierAchievements.filter(([key]) => 
                    analytics.achievements.includes(key)
                  ).length;
                  
                  return (
                    <View key={tierKey} style={styles.achievementTier}>
                      <View style={styles.tierHeader}>
                        <View style={styles.tierHeaderLeft}>
                          <View style={[styles.tierIcon, { backgroundColor: tierConfig.color }]}>
                            <Text style={styles.tierIconText}>
                              {tierKey === 'bronze' ? '🥉' : 
                               tierKey === 'silver' ? '🥈' :
                               tierKey === 'gold' ? '🥇' : '🏆'}
                            </Text>
                          </View>
                          <View>
                            <Text style={[styles.tierTitle, { color: tierConfig.color }]}>
                              {tierConfig.name} Tier
                            </Text>
                            <Text style={styles.tierSubtitle}>
                              {earnedInTier} of {tierAchievements.length} earned
                            </Text>
                          </View>
                        </View>
                        
                        {/* Tier progress bar */}
                        <View style={styles.tierProgress}>
                          <View style={styles.tierProgressBar}>
                            <View 
                              style={[
                                styles.tierProgressFill, 
                                { 
                                  width: `${(earnedInTier / tierAchievements.length) * 100}%`,
                                  backgroundColor: tierConfig.color 
                                }
                              ]} 
                            />
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.achievementsGrid}>
                        {tierAchievements.map(([key, achievement]) => (
                          <AchievementBadge 
                            key={key}
                            title={achievement.title}
                            icon={achievement.icon}
                            earned={analytics.achievements.includes(key)}
                            description={achievement.description}
                            tier={achievement.tier}
                            size="medium"
                          />
                        ))}
                      </View>
                      
                      {/* Category breakdown for this tier */}
                      <View style={styles.tierCategories}>
                        {['Consistency', 'Milestones', 'Performance', 'Leadership'].map(category => {
                          const categoryCount = tierAchievements.filter(
                            ([_, achievement]) => achievement.category === category
                          ).length;
                          if (categoryCount === 0) return null;
                          
                          return (
                            <View key={category} style={styles.categoryChip}>
                              <Text style={styles.categoryChipText}>{category} ({categoryCount})</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </View>

        {/* Point Appeals Section - Hidden for pledges */}
        {userRole !== 'pledge' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.standardSectionHeader}>Point Appeals</Text>
            
            {/* User's Appeals Status */}
            {userAppeals.length > 0 && (
            <View style={styles.appealsContainer}>
              <Text style={styles.subHeader}>Your Appeals Status</Text>
              {userAppeals.map((appeal) => (
                <View key={appeal.id} style={styles.appealCard}>
                  <View style={styles.appealHeader}>
                    <Text style={styles.appealEventTitle}>
                      {appeal.event?.title || 'Unknown Event'}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      appeal.status === 'approved' && styles.statusApproved,
                      appeal.status === 'denied' && styles.statusDenied,
                      appeal.status === 'pending' && styles.statusPending,
                    ]}>
                      <Text style={[
                        styles.statusText,
                        appeal.status === 'approved' && styles.statusTextApproved,
                        appeal.status === 'denied' && styles.statusTextDenied,
                        appeal.status === 'pending' && styles.statusTextPending,
                      ]}>
                        {appeal.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.appealReason}>
                    Reason: {appeal.appeal_reason}
                  </Text>
                  <Text style={styles.appealDate}>
                    Submitted: {formatDateInEST(appeal.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  {appeal.admin_response && (
                    <Text style={styles.adminResponse}>
                      Admin Response: {appeal.admin_response}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Appealable Events */}
          {appealableEvents.length > 0 && (
            <View style={styles.appealsContainer}>
              <Text style={styles.subHeader}>Submit New Appeal</Text>
              <Text style={styles.appealsDescription}>
                Appeal for events you attended but didn't receive points for.
              </Text>
              <View style={styles.table}>
                <View style={styles.tableRowHeader}>
                  <Text style={styles.cellHeader}>Event</Text>
                  <Text style={styles.cellHeader}>Date</Text>
                  <Text style={styles.cellHeader}>Points</Text>
                  <Text style={styles.cellHeader}>Appeal</Text>
                </View>
                {appealableEvents.slice(0, 5).map((event) => (
                  <View key={event.id} style={styles.tableRow}>
                    <Text style={styles.cell}>{event.title}</Text>
                    <Text style={styles.cell}>
                      {formatDateInEST(event.date, { month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={styles.cell}>{event.point_value}</Text>
                    <TouchableOpacity 
                      style={styles.appealButton}
                      onPress={() => handlePointAppealPress(event)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.appealButtonText}>Appeal</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {appealableEvents.length === 0 && userAppeals.length === 0 && (
            <Text style={styles.noContent}>
              No recent events available for appeal.
            </Text>
          )}
          </View>
        )}

        {/* Account Details - Button to open modal */}
        <View style={styles.sectionContainer}>
          <Text style={styles.standardSectionHeader}>Account Details</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.primary, marginBottom: 16 }]}
            onPress={() => setAccountDetailsModalVisible(true)}
          >
            <Text style={styles.buttonText}>View & Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.standardSectionHeader}>Event Attendance Log</Text>
        <TouchableOpacity onPress={toggleExpanded} style={{ marginBottom: 16 }}>
          <Text style={styles.toggleText}>
            {expanded ? 'Hide Event Log 📊' : 'Show Event Log 📊'}
          </Text>
        </TouchableOpacity>

        {expanded && (
          loading ? (
            <ActivityIndicator size="large" color="#330066" />
          ) : events.length === 0 ? (
            <Text style={styles.noContent}>No attended events found.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableRowHeader}>
                <Text style={styles.cellHeader}>Title</Text>
                <Text style={styles.cellHeader}>Date</Text>
                <Text style={styles.cellHeader}>Organizer</Text>
                <Text style={styles.cellHeader}>Feedback</Text>
              </View>
              {events.map((event) => (
                <EventRow 
                  key={event.id} 
                  event={event} 
                  onFeedbackPress={handleEventFeedbackPress}
                  hasFeedbackSubmitted={submittedFeedbackEvents.has(event.id)}
                />
              ))}
            </View>
          )
        )}

        <Text style={styles.standardSectionHeader}>Submit Feedback</Text>
        <View style={styles.formContainer}>
          <TextInput
            style={[styles.input, styles.feedbackInput]}
            placeholder="Subject"
            placeholderTextColor="#999"
            value={feedbackSubject}
            onChangeText={setFeedbackSubject}
          />
          <TextInput
            style={[styles.input, styles.feedbackTextArea]}
            placeholder="Your suggestion, concern, or feedback..."
            placeholderTextColor="#999"
            value={feedbackMessage}
            onChangeText={setFeedbackMessage}
            multiline
            textAlignVertical="top"
          />
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.submitButton,
              submittingFeedback && { opacity: 0.7 }
            ]} 
            onPress={submitFeedback}
            activeOpacity={0.8}
            disabled={submittingFeedback}
          >
            <Text style={[styles.buttonText, styles.submitButtonText]}>
              {submittingFeedback ? 'Sending...' : 'Send Feedback'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.standardSectionHeader}>Test Bank Submission</Text>
        <View style={{ marginTop: 8, marginBottom: 24 }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: Colors.primary, marginBottom: 16 }]}
            onPress={() => setTestBankModalVisible(true)}
          >
            <Text style={styles.buttonText}>Add to Test Bank</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.standardSectionHeader}>Help & Account</Text>
        <View style={{ marginTop: 8, marginBottom: 32 }}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Alert.alert('Contact Tech Chair', 'Email jkara@umd.edu')}
          >
            <Text style={styles.link}>Contact Tech Chair</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={handleLogout}>
            <Text style={[styles.link, { color: 'red' }]}>Log Out</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.linkButton} onPress={handleAccountDeletion}>
            <Text style={[styles.link, { color: '#dc3545', fontWeight: 'bold' }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Event Feedback Modal */}
      <Modal
        visible={eventFeedbackModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEventFeedbackModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Event Feedback</Text>
              <TouchableOpacity
                style={styles.exitButton}
                onPress={() => setEventFeedbackModalVisible(false)}
              >
                <Text style={styles.exitButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1 }}
            >
              {selectedEvent && (
                <>
                  <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
                  <Text style={styles.eventDate}>
                    {formatDateInEST(selectedEvent.date)}
                  </Text>
                </>
              )}

              {/* Overall Rating */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>Overall Rating (1-5)</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.ratingButton,
                        eventFeedbackData.rating === rating && styles.ratingButtonActive
                      ]}
                      onPress={() => setEventFeedbackData(prev => ({ ...prev, rating: rating }))}
                    >
                      <Text style={[
                        styles.ratingButtonText,
                        eventFeedbackData.rating === rating && styles.ratingButtonTextActive
                      ]}>
                        {rating}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Boolean Questions */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>Would you attend again?</Text>
                <View style={styles.booleanContainer}>
                  <TouchableOpacity
                    style={[
                      styles.booleanButton,
                      eventFeedbackData.would_attend_again === true && styles.booleanButtonActive
                    ]}
                    onPress={() => setEventFeedbackData(prev => ({ ...prev, would_attend_again: true }))}
                  >
                    <Text style={[
                      styles.booleanButtonText,
                      eventFeedbackData.would_attend_again === true && styles.booleanButtonTextActive
                    ]}>
                      Yes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.booleanButton,
                      eventFeedbackData.would_attend_again === false && styles.booleanButtonActive
                    ]}
                    onPress={() => setEventFeedbackData(prev => ({ ...prev, would_attend_again: false }))}
                  >
                    <Text style={[
                      styles.booleanButtonText,
                      eventFeedbackData.would_attend_again === false && styles.booleanButtonTextActive
                    ]}>
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>Was it well organized?</Text>
                <View style={styles.booleanContainer}>
                  <TouchableOpacity
                    style={[
                      styles.booleanButton,
                      eventFeedbackData.well_organized === true && styles.booleanButtonActive
                    ]}
                    onPress={() => setEventFeedbackData(prev => ({ ...prev, well_organized: true }))}
                  >
                    <Text style={[
                      styles.booleanButtonText,
                      eventFeedbackData.well_organized === true && styles.booleanButtonTextActive
                    ]}>
                      Yes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.booleanButton,
                      eventFeedbackData.well_organized === false && styles.booleanButtonActive
                    ]}
                    onPress={() => setEventFeedbackData(prev => ({ ...prev, well_organized: false }))}
                  >
                    <Text style={[
                      styles.booleanButtonText,
                      eventFeedbackData.well_organized === false && styles.booleanButtonTextActive
                    ]}>
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Comments */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>Additional Comments (optional)</Text>
                <TextInput
                  style={styles.commentsInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Share your thoughts about the event..."
                  value={eventFeedbackData.comments || ''}
                  onChangeText={(text) => setEventFeedbackData(prev => ({ ...prev, comments: text }))}
                />
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEventFeedbackModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitEventFeedback}
              >
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Test Bank Submission Modal */}
      <Modal
        visible={testBankModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTestBankModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Test Bank Submission</Text>
              <TouchableOpacity
                style={styles.exitButton}
                onPress={() => {
                  setTestBankModalVisible(false);
                  setClassCode('');
                  setFileType('test');
                  setSelectedFile(null);
                }}
              >
                <Text style={styles.exitButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <Text style={styles.modalSubtitle}>
                Help your brothers by sharing your course materials
              </Text>

              {/* Course Code */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>Course Code *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={classCode}
                  onChangeText={setClassCode}
                  placeholder="e.g., BMGT402, ENGL101"
                  autoCapitalize="characters"
                />
              </View>

              {/* File Type */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>File Type *</Text>
                <View style={styles.fileTypeContainer}>
                  {[
                    { value: 'test', label: 'Test/Exam', icon: '📝' },
                    { value: 'notes', label: 'Notes', icon: '📚' },
                    { value: 'materials', label: 'Course Materials', icon: '📄' }
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.fileTypeButton,
                        fileType === type.value && styles.fileTypeButtonActive
                      ]}
                      onPress={() => setFileType(type.value as 'test' | 'notes' | 'materials')}
                    >
                      <Text style={styles.fileTypeIcon}>{type.icon}</Text>
                      <Text style={[
                        styles.fileTypeText,
                        fileType === type.value && styles.fileTypeTextActive
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* File Upload */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackLabel}>Upload File *</Text>
                <TouchableOpacity
                  style={[
                    styles.fileUploadButton,
                    selectedFile && styles.fileUploadButtonActive
                  ]}
                  onPress={handlePickFile}
                >
                  <Text style={styles.fileUploadIcon}>
                    {selectedFile ? '✅' : '📎'}
                  </Text>
                  <Text style={[
                    styles.fileUploadText,
                    selectedFile && styles.fileUploadTextActive
                  ]}>
                    {selectedFile ? 'File Selected' : 'Choose File'}
                  </Text>
                </TouchableOpacity>
                
                {selectedFile && (
                  <View style={styles.selectedFileInfo}>
                    <Text style={styles.selectedFileName}>{selectedFile.name}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedFile(null)}
                      style={styles.removeFileButton}
                    >
                      <Text style={styles.removeFileText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setTestBankModalVisible(false);
                  setClassCode('');
                  setFileType('test');
                  setSelectedFile(null);
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  (!classCode || !selectedFile) && styles.modalButtonDisabled
                ]}
                onPress={() => {
                  handleTestBankSubmission();
                  setTestBankModalVisible(false);
                }}
                disabled={!classCode || !selectedFile}
              >
                <Text style={styles.modalButtonPrimaryText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Account Details Modal */}
      <Modal
        visible={accountDetailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAccountDetailsModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Account Details</Text>
              <TouchableOpacity
                style={styles.exitButton}
                onPress={() => {
                  setAccountDetailsModalVisible(false);
                  setEditing(false);
                }}
              >
                <Text style={styles.exitButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
            >
              {loading && !name ? (
                <View style={styles.loadingSection}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading account data...</Text>
                </View>
              ) : (
                <View style={styles.centeredProfileSection}>
                  {renderProfileSection}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Point Appeal Modal */}
      <Modal
        visible={pointAppealModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPointAppealModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Submit Point Appeal</Text>
              
              {selectedAppealEvent && (
                <View style={styles.eventInfoCard}>
                  <Text style={styles.eventInfoTitle}>{selectedAppealEvent.title}</Text>
                  <Text style={styles.eventInfoDetail}>
                    Date: {formatDateInEST(selectedAppealEvent.date, { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </Text>
                  <Text style={styles.eventInfoDetail}>
                    Organizer: {selectedAppealEvent.host_name}
                  </Text>
                  <Text style={styles.eventInfoDetail}>
                    Points: {selectedAppealEvent.point_value}
                  </Text>
                </View>
              )}

              <Text style={styles.formLabel}>
                Why should you receive points for this event? *
              </Text>
              <TextInput
                style={[styles.textArea, { minHeight: 120 }]}
                placeholder="Explain why you believe you should receive points for this event. Include details about your attendance or participation."
                placeholderTextColor="#999"
                value={appealReason}
                onChangeText={setAppealReason}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.formLabel}>
                Picture Evidence *
              </Text>
              <Text style={styles.formHint}>
                Please provide a photo URL as evidence (e.g., social media post, event photo). This is required for all appeals.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/photo.jpg (Required)"
                placeholderTextColor="#999"
                value={appealPictureUrl}
                onChangeText={setAppealPictureUrl}
                autoCapitalize="none"
                keyboardType="url"
              />

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setPointAppealModalVisible(false);
                    setAppealReason('');
                    setAppealPictureUrl('');
                    setSelectedAppealEvent(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button, 
                    styles.submitButton,
                    (submittingAppeal || !appealReason.trim()) && { opacity: 0.5 }
                  ]}
                  onPress={submitPointAppeal}
                  disabled={submittingAppeal || !appealReason.trim()}
                >
                  <Text style={styles.submitButtonText}>
                    {submittingAppeal ? 'Submitting...' : 'Submit Appeal'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Account Deletion Modal */}
      <Modal
        visible={accountDeletionModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delete Account</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setAccountDeletionModalVisible(false);
                    setDeletionConfirmationText('');
                  }}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.deletionWarningContainer}>
                <Text style={styles.deletionWarningIcon}>⚠️</Text>
                <Text style={styles.deletionWarningTitle}>Permanent Account Deletion</Text>
                <Text style={styles.deletionWarningText}>
                  This action will permanently delete your account and cannot be undone. The following data will be removed:
                </Text>
                
                <View style={styles.deletionItemsList}>
                  <Text style={styles.deletionItem}>• Personal profile information</Text>
                  <Text style={styles.deletionItem}>• Event attendance history</Text>
                  <Text style={styles.deletionItem}>• Points and achievements</Text>
                  <Text style={styles.deletionItem}>• Point appeals and feedback</Text>
                  <Text style={styles.deletionItem}>• Organization memberships</Text>
                  <Text style={styles.deletionItem}>• All uploaded files and documents</Text>
                </View>

                <Text style={styles.deletionProcessText}>
                  Account deletion may take up to 30 days to complete. During this time, your account will be deactivated and inaccessible.
                </Text>

                <Text style={styles.deletionRecoveryText}>
                  You have 7 days from deletion initiation to contact support for potential account recovery.
                </Text>
              </View>

              <View style={styles.confirmationContainer}>
                <Text style={styles.confirmationLabel}>
                  To confirm deletion, type "DELETE MY ACCOUNT" below:
                </Text>
                <TextInput
                  style={styles.confirmationInput}
                  value={deletionConfirmationText}
                  onChangeText={setDeletionConfirmationText}
                  placeholder="Type here to confirm..."
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setAccountDeletionModalVisible(false);
                    setDeletionConfirmationText('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deleteConfirmButton,
                    (deletionConfirmationText.toLowerCase() !== 'delete my account' || isDeletingAccount) && 
                    styles.deleteConfirmButtonDisabled
                  ]}
                  onPress={confirmAccountDeletion}
                  disabled={deletionConfirmationText.toLowerCase() !== 'delete my account' || isDeletingAccount}
                >
                  {isDeletingAccount ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.deleteConfirmButtonText}>
                      Delete My Account Permanently
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Layout
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: { 
    padding: 16, 
    paddingBottom: 100 
  },
  
  // Profile Header Section - Strava/Duolingo Style
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  rankBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  
  // Stats Container - Strava Style
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  
  // Progress Section - Duolingo Style
  progressSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDetails: {
    flex: 1,
    marginLeft: 20,
  },
  progressMainText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  progressSubText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  
  // Achievements Section
  achievementsSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  achievementsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  achievementProgress: {
    marginBottom: 15,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  achievementProgressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  expandIcon: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  achievementsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementsExpanded: {
    marginTop: 20,
  },
  achievementCategory: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: `${Colors.primary}20`,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moreAchievementsBadge: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  moreAchievementsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Quick Stats
  quickStats: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickStatItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  quickStatLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  
  // Section Headers
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  // Standardized section header for main account sections
  standardSectionHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 28,
    marginBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#FFD700', // Yellow underline
    paddingBottom: 8,
    textTransform: 'none',
    letterSpacing: 0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  sectionHeaderIcon: {
    fontSize: 20,
  },
  
  // Legacy profile info for compatibility
  profileInfo: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  value: {
    fontSize: 16,
    color: '#666',
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
  },
  editableValue: {
    fontSize: 16,
    color: Colors.primary,
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
    fontWeight: '600',
  },
  
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 200 : 54,
    width: '100%',
    paddingHorizontal: 12,
  },
  editButton: {
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,           // Wider button
    paddingVertical: 16,             // Taller button
    borderRadius: 12,
    borderWidth: 2,                  // Add border
    borderColor: '#FFFFFF',          // White border for contrast
    shadowColor: '#000',             // Add shadow
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFF5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FEB2B2',
  },
  errorText: {
    color: '#E53E3E',
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  
  // Typography
  meta: { 
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    color: '#1A1A1A',
    backgroundColor: 'white',
  },
  feedbackInput: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    fontSize: 16,
  },
  feedbackTextArea: {
    height: 120,
    borderColor: Colors.primary,
    borderWidth: 1.5,
    fontSize: 16,
    paddingTop: 12,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Additional form styles (unique names)
  profileFormContainer: {
    backgroundColor: 'transparent',   // Remove white background to prevent layering
    borderRadius: 16,
    padding: 24,
    marginVertical: 12,
    borderWidth: 2,                   // Add border instead of background
    borderColor: Colors.primary,
    borderStyle: 'dashed',            // Dashed border for visual interest
  },
  formTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 24,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.secondary,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 10,
    marginTop: 16,
    letterSpacing: 0.3,
  },
  formInput: {
    // Override ALL input styles explicitly for iOS compatibility
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',  // Pure white for maximum contrast
    marginBottom: 12,
    // iOS-specific properties
    textAlignVertical: 'center',
    includeFontPadding: false,
    // Strong shadow for iOS
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    // Force override any conflicting styles
    minHeight: 50,
  },
  // Dedicated style for profile form inputs (iOS-optimized)
  profileFormInput: {
    borderWidth: 3,                  // Even thicker border
    borderColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#000000',               // Pure black text
    backgroundColor: '#E8F4FD',     // Light blue background for contrast against gray modal
    marginBottom: 12,
    minHeight: 50,
    textAlignVertical: 'top',
    // Very strong visual emphasis for iOS
    shadowColor: '#000000',         // Black shadow for maximum contrast
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,             // Stronger shadow
    shadowRadius: 6,
    elevation: 8,                   // Higher elevation
    // Add border style for extra visibility
    borderStyle: 'solid',
  },
  // iOS-optimized multi-select button style
  profileMultiSelectButton: {
    borderWidth: 3,
    borderColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#E8F4FD',     // Light blue background
    marginBottom: 12,
    minHeight: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Strong shadow for iOS visibility
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderStyle: 'solid',
  },
  // iOS-optimized date input style
  profileDateInput: {
    borderWidth: 3,
    borderColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#E8F4FD',     // Light blue background
    marginBottom: 12,
    minHeight: 50,
    justifyContent: 'center',
    // Strong shadow for iOS visibility
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderStyle: 'solid',
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    marginTop: 32,
    paddingVertical: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  profileCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    marginTop: 12,
    paddingVertical: 18,
  },
  link: { 
    color: Colors.primary, 
    fontSize: 16,
    fontWeight: '500',
  },
  linkButton: { 
    marginTop: 12,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  noContent: { 
    fontSize: 14, 
    color: '#888', 
    textAlign: 'center', 
    marginVertical: 10 
  },
  table: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    marginBottom: 24,
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'white',
  },
  cellHeader: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
    color: Colors.primary,
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#1A1A1A',
  },
  
  // StatCard component styles
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  
  // ProgressRing component styles
  progressRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 60,
    backgroundColor: '#F0F0F0',
  },
  progressRingInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Enhanced AchievementBadge component styles with tier system
  badge: {
    width: '30%',
    alignItems: 'center',
    padding: 14,
    marginBottom: 16,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  badgeSmall: {
    width: '28%',
    alignItems: 'center',
    padding: 10,
    marginBottom: 12,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  badgeLarge: {
    width: '45%',
    alignItems: 'center',
    padding: 18,
    marginBottom: 20,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  badgeEarned: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  badgeLocked: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    opacity: 0.7,
  },
  
  // Tier indicator styles
  tierIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 10,
  },
  tierText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  
  // Badge icon container with effects
  badgeIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeIcon: {
    fontSize: 32,
    textAlign: 'center',
    minHeight: 36,
    lineHeight: 36,
    zIndex: 2,
  },
  badgeIconSmall: {
    fontSize: 24,
    minHeight: 28,
    lineHeight: 28,
  },
  badgeIconLarge: {
    fontSize: 40,
    minHeight: 44,
    lineHeight: 44,
  },
  
  // Glow effect for earned achievements
  glowEffect: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    zIndex: 1,
  },
  
  // Shine effect for high-tier achievements
  shineEffect: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 30,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
    zIndex: 5,
  },
  
  badgeTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  badgeTitleSmall: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
  },
  badgeTitleLarge: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
  },
  
  badgeDescription: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  badgeDescriptionSmall: {
    fontSize: 9,
    lineHeight: 12,
  },
  badgeDescriptionLarge: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  
  // Tier summary styles
  tierSummary: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  tierSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierSummaryText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  
  // Achievement tier styles (for expanded view)
  achievementTier: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tierHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tierIconText: {
    fontSize: 20,
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  tierSubtitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tierProgress: {
    alignItems: 'flex-end',
  },
  tierProgressBar: {
    width: 80,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tierProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  // Category chips for tier view
  tierCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  categoryChip: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryChipText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  
  // File attachment styles
  attachmentSection: {
    marginBottom: 16,
  },
  attachmentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  removeFileButton: {
    backgroundColor: '#DC3545',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  removeFileText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  feedbackButton: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    flexShrink: 0,
  },
  feedbackButtonText: {
    fontSize: 16,
    color: 'white',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#F8F9FA',  // Light gray background so white inputs are visible
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
    width: screenWidth - 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
  },
  exitButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  exitButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.primary,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  ratingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  ratingButtonTextActive: {
    color: 'white',
  },
  booleanContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  booleanButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  booleanButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  booleanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  booleanButtonTextActive: {
    color: 'white',
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
    backgroundColor: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  },
  
  // Multi-select styles
  multiSelectContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  multiSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 12,
  },
  multiSelectText: {
    color: '#1A1A1A',
    flex: 1,
  },
  dropdownArrow: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  multiSelectDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1001,
  },
  multiSelectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 50,
  },
  multiSelectOptionSelected: {
    backgroundColor: `${Colors.secondary}20`,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  multiSelectOptionText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '500',
  },
  multiSelectOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  multiSelectCheckmark: {
    color: Colors.secondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // New Modal Styles
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginTop: 5,
  },
  fileTypeContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  fileTypeButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  fileTypeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  fileTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  fileTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  fileTypeTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  fileUploadButton: {
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'white',
    marginTop: 5,
  },
  fileUploadButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  fileUploadIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  fileUploadText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  fileUploadTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  selectedFileInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedFileName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  modalButtonSecondary: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  modalStatText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  centeredProfileSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  
  // Dropdown button styles (replacing problematic Picker wheels)
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#E8F4FD',
    marginBottom: 12,
    minHeight: 50,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  dropdownContainer: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    maxHeight: 150,                    // Reduced height to prevent overflow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,                      // Ensure it appears above other elements
    position: 'relative',              // Proper positioning
  },
  dropdownOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownOptionSelected: {
    backgroundColor: `${Colors.primary}15`,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  dropdownOptionSelectedText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  
  // Profile edit restriction styles
  editRestrictedContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  editButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  editButtonTextDisabled: {
    color: '#888',
  },
  editRestrictedText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  
  // Point Appeals Styles
  appealsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  appealsDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  appealCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  appealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appealEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusApproved: {
    backgroundColor: '#d4edda',
  },
  statusDenied: {
    backgroundColor: '#f8d7da',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextApproved: {
    color: '#155724',
  },
  statusTextDenied: {
    color: '#721c24',
  },
  statusTextPending: {
    color: '#856404',
  },
  appealReason: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    lineHeight: 18,
  },
  appealDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  adminResponse: {
    fontSize: 14,
    color: '#2c3e50',
    fontStyle: 'italic',
    backgroundColor: '#e8f4f8',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  appealButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  appealButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Point Appeal Modal Styles
  eventInfoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  eventInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  eventInfoDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  formHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    textAlignVertical: 'top',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  
  // Account Deletion Styles
  deletionWarningContainer: {
    backgroundColor: '#fff5f5',
    borderColor: '#feb2b2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
  },
  deletionWarningIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 12,
  },
  deletionWarningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c53030',
    textAlign: 'center',
    marginBottom: 12,
  },
  deletionWarningText: {
    fontSize: 14,
    color: '#2d3748',
    lineHeight: 20,
    marginBottom: 12,
  },
  deletionItemsList: {
    marginVertical: 12,
    paddingLeft: 8,
  },
  deletionItem: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 4,
    lineHeight: 18,
  },
  deletionProcessText: {
    fontSize: 13,
    color: '#718096',
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 18,
  },
  deletionRecoveryText: {
    fontSize: 13,
    color: '#2b6cb0',
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 18,
  },
  confirmationContainer: {
    marginVertical: 20,
  },
  confirmationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationInput: {
    borderWidth: 2,
    borderColor: '#dc3545',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'white',
    color: '#dc3545',
  },
  deleteConfirmButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  deleteConfirmButtonDisabled: {
    backgroundColor: '#a0a0a0',
    opacity: 0.6,
  },
  deleteConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Missing modal styles
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalCloseButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

