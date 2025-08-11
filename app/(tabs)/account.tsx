import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Event } from '../../types/account';

const { width: screenWidth } = Dimensions.get('window');

const EventRow: React.FC<{ event: Event; onFeedbackPress: (event: Event) => void }> = React.memo(({ event, onFeedbackPress }) => (
  <View style={styles.tableRow}>
    <Text style={styles.cell}>{event.title}</Text>
    <Text style={styles.cell}>
      {new Date(event.date).toLocaleDateString()}
    </Text>
    <Text style={styles.cell}>{event.host_name}</Text>
    <TouchableOpacity 
      style={styles.feedbackButton}
      onPress={() => onFeedbackPress(event)}
      activeOpacity={0.7}
    >
      <Text style={styles.feedbackButtonText}>📝</Text>
    </TouchableOpacity>
  </View>
));

// Analytics Components
const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string; color?: string; icon?: string }> = ({ title, value, subtitle, color = '#4CAF50', icon }) => (
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

const AchievementBadge: React.FC<{ title: string; icon: string; earned: boolean; description?: string }> = ({ title, icon, earned, description }) => (
  <View style={[styles.badge, earned ? styles.badgeEarned : styles.badgeLocked]}>
    <Text style={[styles.badgeIcon, { opacity: earned ? 1 : 0.3 }]}>{icon}</Text>
    <Text style={[styles.badgeTitle, { opacity: earned ? 1 : 0.5 }]}>{title}</Text>
    {description && <Text style={styles.badgeDescription}>{description}</Text>}
  </View>
);

export default function AccountTab() {
  const [name, setName] = useState<string | null>(null);
  const [pledgeClass, setPledgeClass] = useState<string | null>(null);
  const [major, setMajor] = useState<string | null>(null);
  const [graduationYear, setGraduationYear] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackFile, setFeedbackFile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTestBankForm, setShowTestBankForm] = useState(false);
  
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

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    eventsThisMonth: 0,
    eventsThisSemester: 0,
    favoriteEventType: '',
    attendanceRate: 0,
    rankInPledgeClass: 0,
    totalInPledgeClass: 0,
    achievements: [] as string[],
    monthlyProgress: [] as Array<{ month: string; count: number }>,
  });

  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  const calculateAnalytics = useCallback(async (userEvents: Event[], profile: any, userId: string) => {
    try {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisSemester = new Date(now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1, 8, 1); // Fall semester starts in August
      
      // Basic counts and points
      const totalPoints = userEvents.reduce((sum, event) => sum + (event.point_value || 0), 0);
      const eventsThisMonth = userEvents.filter(event => new Date(event.date) >= thisMonth).length;
      const eventsThisSemester = userEvents.filter(event => new Date(event.date) >= thisSemester).length;
      
      // Calculate streaks
      const sortedEvents = [...userEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastEventDate: Date | null = null;
      
      sortedEvents.forEach(event => {
        const eventDate = new Date(event.date);
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
      
      // Find favorite event type
      const eventTypes = userEvents.reduce((acc, event) => {
        const pointType = event.point_type || 'general';
        acc[pointType] = (acc[pointType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const favoriteEventType = Object.keys(eventTypes).length > 0 
        ? Object.keys(eventTypes).reduce((a, b) => 
            eventTypes[a] > eventTypes[b] ? a : b, 'general')
        : 'None';
      
      // Calculate attendance rate (compared to total available events)
      const { data: allEvents } = await supabase
        .from('events')
        .select('id')
        .eq('status', 'approved')
        .gte('start_time', thisSemester.toISOString());
      
      const attendanceRate = allEvents ? (eventsThisSemester / allEvents.length) * 100 : 0;
      
      // Get pledge class ranking
      const { data: pledgeClassMembers } = await supabase
        .from('users')
        .select('user_id')
        .eq('pledge_class', profile.pledge_class)
        .eq('approved', true);
      
      const totalInPledgeClass = pledgeClassMembers?.length || 1;
      
      // Get points for all pledge class members to calculate ranking
      const { data: pledgeClassAttendance } = await supabase
        .from('event_attendance')
        .select('user_id, events(point_value)')
        .in('user_id', pledgeClassMembers?.map(m => m.user_id) || []);
      
      const memberPoints = pledgeClassAttendance?.reduce((acc, record) => {
        const userId = record.user_id;
        const eventData = record.events as any;
        const points = Array.isArray(eventData) ? eventData[0]?.point_value || 0 : eventData?.point_value || 0;
        acc[userId] = (acc[userId] || 0) + points;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const sortedMembers = Object.entries(memberPoints).sort(([,a], [,b]) => b - a);
      const rankInPledgeClass = sortedMembers.findIndex(([id]) => id === userId) + 1;
      
      // Monthly progress for last 6 months
      const monthlyProgress = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthEvents = userEvents.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= monthStart && eventDate <= monthEnd;
        }).length;
        
        monthlyProgress.push({
          month: date.toLocaleString('default', { month: 'short' }),
          count: monthEvents
        });
      }
      
      // Determine achievements
      const achievements = [];
      if (currentStreak >= 3) achievements.push('streak_3');
      if (currentStreak >= 5) achievements.push('streak_5');
      if (totalPoints >= 50) achievements.push('points_50');
      if (totalPoints >= 100) achievements.push('points_100');
      if (eventsThisSemester >= 10) achievements.push('semester_10');
      if (attendanceRate >= 75) achievements.push('attendance_75');
      if (rankInPledgeClass <= 3 && totalInPledgeClass > 3) achievements.push('top_3');
      
      setAnalytics({
        totalPoints,
        currentStreak,
        longestStreak,
        eventsThisMonth,
        eventsThisSemester,
        favoriteEventType,
        attendanceRate,
        rankInPledgeClass,
        totalInPledgeClass,
        achievements,
        monthlyProgress,
      });
    } catch (error) {
      console.error('Analytics calculation error:', error);
    }
  }, []);

  const fetchAccountData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Step 1: Check authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      
      if (!user) {
        throw new Error('No authenticated user found. Please log in again.');
      }

      console.log('User authenticated:', user.id);

      // Step 2: Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name, pledge_class, approved, major, graduation_year')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        if (profileError.code === 'PGRST116') {
          throw new Error('User profile not found. Please contact support.');
        }
        throw new Error(`Profile fetch failed: ${profileError.message}`);
      }
      
      if (!profile) {
        throw new Error('User profile is empty. Please contact support.');
      }

      console.log('Profile fetched:', profile);

      if (!profile.approved) {
        Alert.alert('Pending Approval', 'Your account is awaiting approval.');
        setLoading(false);
        return;
      }

      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      setName(fullName);
      setPledgeClass(profile.pledge_class);
      setMajor(profile.major);
      setGraduationYear(profile.graduation_year);

      // Step 3: Fetch attended events with better error handling
      const { data: attendedEvents, error: eventError } = await supabase
        .from('event_attendance')
        .select('id, events(title, start_time, point_value, point_type, creator:created_by(first_name, last_name))')
        .eq('user_id', user.id);

      if (eventError) {
        console.error('Event fetch error:', eventError);
        // Don't throw here - continue without events if profile loaded successfully
        setEvents([]);
        setAnalytics(prev => ({ ...prev, totalPoints: 0, eventsThisMonth: 0, eventsThisSemester: 0 }));
        Alert.alert('Warning', 'Could not load event history, but profile loaded successfully.');
      } else {
        const formatted: Event[] = (attendedEvents || []).map((record: any) => ({
          id: record.id,
          title: record.events?.title || 'Unknown Event',
          date: record.events?.start_time || new Date().toISOString(),
          host_name: record.events?.creator 
            ? `${record.events.creator.first_name || ''} ${record.events.creator.last_name || ''}`.trim() || 'N/A'
            : 'N/A',
          point_value: record.events?.point_value || 0,
          point_type: record.events?.point_type || 'other',
        }));

        formatted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(formatted);
        
        // Calculate analytics
        await calculateAnalytics(formatted, profile, user.id);
        console.log('Events loaded:', formatted.length);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('fetchAccountData error:', err);
      setError(errorMessage);
      Alert.alert('Error Loading Account', errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  const saveProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('users')
      .update({
        name,
        pledge_class: pledgeClass,
        major,
        graduation_year: graduationYear
      })
      .eq('user_id', user?.id);

    if (error) {
      Alert.alert('Error', 'Could not update profile.');
    } else {
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    }
  };

  const submitFeedback = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      Alert.alert('Error', 'Please fill in both subject and message.');
      return;
    }

    try {
      // Prepare the feedback data
      const feedbackData: any = {
        user_id: user?.id,
        subject: feedbackSubject,
        message: feedbackMessage,
        submitted_at: new Date().toISOString()
      };

      // If a file is attached, add file information
      if (feedbackFile) {
        feedbackData.file_name = feedbackFile.name;
        feedbackData.file_size = feedbackFile.size;
        feedbackData.file_type = feedbackFile.mimeType || 'application/octet-stream';
        // In a full implementation, you would upload the file to Supabase Storage here
        // For now, we'll store the file metadata and indicate that a file was attached
        feedbackData.has_attachment = true;
        feedbackData.attachment_info = JSON.stringify({
          name: feedbackFile.name,
          size: feedbackFile.size,
          type: feedbackFile.mimeType,
          uri: feedbackFile.uri
        });
      }

      const { error } = await supabase.from('admin_feedback').insert(feedbackData);

      if (error) {
        throw error;
      }

      Alert.alert('Thanks!', `Your feedback${feedbackFile ? ' and attachment' : ''} was submitted successfully.`);
      setFeedbackSubject('');
      setFeedbackMessage('');
      setFeedbackFile(null);
    } catch (error) {
      console.error('Feedback submission error:', error);
      Alert.alert('Error', 'Could not send feedback. Please try again.');
    }
  };

  // Event feedback functions
  const handleEventFeedbackPress = (event: Event) => {
    setSelectedEvent(event);
    setEventFeedbackModalVisible(true);
  };

  const submitEventFeedback = async () => {
    if (!selectedEvent) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      console.log('📝 Submitting feedback data:', {
        user_id: user?.id,
        event_id: selectedEvent.id,
        rating: eventFeedbackData.rating,
        would_attend_again: eventFeedbackData.would_attend_again,
        well_organized: eventFeedbackData.well_organized,
        comments: eventFeedbackData.comments,
      });

      const { error } = await supabase.from('event_feedback').insert({
        user_id: user?.id,
        event_id: selectedEvent.id,
        rating: eventFeedbackData.rating,
        would_attend_again: eventFeedbackData.would_attend_again,
        well_organized: eventFeedbackData.well_organized,
        comments: eventFeedbackData.comments,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('❌ Event feedback submission error:', error);
        throw error;
      }

      console.log('✅ Event feedback submitted successfully!');
      Alert.alert('Thanks!', 'Your event feedback was submitted successfully.');
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

  const handlePickFeedbackFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Check file size (limit to 10MB)
        if (file.size && file.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
          return;
        }
        
        setFeedbackFile(file);
      }
    } catch (err) {
      console.error('File picker error:', err);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout Failed', error.message);
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
      setShowTestBankForm(false);
      setClassCode('');
      setFileType('test');
      setSelectedFile(null);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit');
    }
  };

  const renderProfileSection = useMemo(() => (
    editing ? (
      <>
        <TextInput
          style={styles.input}
          value={name ?? ''}
          onChangeText={setName}
          placeholder="Name"
        />
        <TextInput
          style={styles.input}
          value={pledgeClass ?? ''}
          onChangeText={setPledgeClass}
          placeholder="Pledge Class"
        />
        <TextInput
          style={styles.input}
          value={major ?? ''}
          onChangeText={setMajor}
          placeholder="Major"
        />
        <TextInput
          style={styles.input}
          value={graduationYear ?? ''}
          onChangeText={setGraduationYear}
          placeholder="Graduation Year"
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.button} onPress={saveProfile}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </>
    ) : (
      <>
        <View style={styles.profileInfo}>
          <Text style={styles.meta}>Name: {name ?? '---'}</Text>
          <Text style={styles.meta}>Pledge Class: {pledgeClass ?? '---'}</Text>
          <Text style={styles.meta}>Major: {major ?? '---'}</Text>
          <Text style={styles.meta}>Graduation Year: {graduationYear ?? '---'}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
          <Text style={styles.link}>Edit Profile</Text>
        </TouchableOpacity>
      </>
    )
  ), [editing, name, pledgeClass, major, graduationYear, saveProfile]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#FF6B35' }]} 
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
              {pledgeClass ? `${pledgeClass} • ${major || 'No Major'}` : 'Loading...'}
            </Text>
            {analytics.rankInPledgeClass > 0 && (
              <Text style={styles.rankBadge}>
                #{analytics.rankInPledgeClass} in {pledgeClass}
              </Text>
            )}
          </View>
        </View>

        {/* Stats Overview - Strava Style */}
        <View style={styles.statsContainer}>
          <StatCard 
            title="Total Points"
            value={analytics.totalPoints}
            icon="🏆"
            color="#FF6B35"
          />
          <StatCard 
            title="Current Streak"
            value={`${analytics.currentStreak} events`}
            subtitle={`Longest: ${analytics.longestStreak}`}
            icon="🔥"
            color="#FF4500"
          />
          <StatCard 
            title="This Month"
            value={analytics.eventsThisMonth}
            subtitle="events attended"
            icon="📅"
            color="#4CAF50"
          />
          <StatCard 
            title="Attendance Rate"
            value={`${Math.round(analytics.attendanceRate)}%`}
            subtitle="this semester"
            icon="📊"
            color="#2196F3"
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
              color="#4CAF50"
            />
            <View style={styles.progressDetails}>
              <Text style={styles.progressMainText}>
                {analytics.eventsThisSemester} events
              </Text>
              <Text style={styles.progressSubText}>
                Keep going! You're doing great this semester.
              </Text>
            </View>
          </View>
        </View>

        {/* Achievements - Duolingo Style */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            <AchievementBadge 
              title="First Steps"
              icon="🎯"
              earned={analytics.eventsThisSemester >= 1}
              description="Attend your first event"
            />
            <AchievementBadge 
              title="On Fire"
              icon="🔥"
              earned={analytics.achievements.includes('streak_3')}
              description="3 event streak"
            />
            <AchievementBadge 
              title="Scholar"
              icon="📚"
              earned={analytics.achievements.includes('points_50')}
              description="50 total points"
            />
            <AchievementBadge 
              title="Master"
              icon="🏆"
              earned={analytics.achievements.includes('points_100')}
              description="100 total points"
            />
            <AchievementBadge 
              title="Consistent"
              icon="💪"
              earned={analytics.achievements.includes('semester_10')}
              description="10 events this semester"
            />
            <AchievementBadge 
              title="Top Performer"
              icon="⭐"
              earned={analytics.achievements.includes('top_3')}
              description="Top 3 in pledge class"
            />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatLabel}>Favorite Event Type</Text>
            <Text style={styles.quickStatValue}>
              {analytics.favoriteEventType.replace('_', ' ').toUpperCase() || 'None yet'}
            </Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatLabel}>Events This Semester</Text>
            <Text style={styles.quickStatValue}>{analytics.eventsThisSemester}</Text>
          </View>
        </View>

        {/* Account Details - Collapsible */}
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setEditing(!editing)}
        >
          <Text style={styles.sectionHeaderText}>Account Details</Text>
          <Text style={styles.sectionHeaderIcon}>{editing ? '📝' : '👤'}</Text>
        </TouchableOpacity>
        
        {loading && !name ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading account data...</Text>
          </View>
        ) : (
          renderProfileSection
        )}

        {!loading && !error && (
          <Text style={styles.meta}>Total Events Attended: {events.length}</Text>
        )}

        <Text style={styles.sectionHeader}>Event Attendance Log</Text>
        <TouchableOpacity onPress={toggleExpanded}>
          <Text style={styles.toggleText}>
            {expanded ? 'Hide Event Log ▲' : 'Show Event Log ▼'}
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
                <EventRow key={event.id} event={event} onFeedbackPress={handleEventFeedbackPress} />
              ))}
            </View>
          )
        )}

        <Text style={styles.sectionHeader}>Submit Feedback</Text>
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Subject"
            value={feedbackSubject}
            onChangeText={setFeedbackSubject}
          />
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Your suggestion, concern, or feedback..."
            value={feedbackMessage}
            onChangeText={setFeedbackMessage}
            multiline
          />
          
          {/* File Attachment Section */}
          <View style={styles.attachmentSection}>
            <Text style={styles.attachmentLabel}>Optional: Attach a file</Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#6B7280', marginBottom: 8 }]}
              onPress={handlePickFeedbackFile}
            >
              <Text style={styles.buttonText}>
                {feedbackFile ? 'Change Attachment' : '📎 Add Attachment'}
              </Text>
            </TouchableOpacity>
            
            {feedbackFile && (
              <View style={styles.filePreview}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>📄 {feedbackFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {feedbackFile.size ? `${Math.round(feedbackFile.size / 1024)} KB` : 'Size unknown'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={() => setFeedbackFile(null)}
                >
                  <Text style={styles.removeFileText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <TouchableOpacity style={styles.button} onPress={submitFeedback}>
            <Text style={styles.buttonText}>
              {feedbackFile ? 'Send Feedback & Attachment' : 'Send Feedback'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Test Bank Submission</Text>
        {!showTestBankForm ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#4CAF50' }]}
            onPress={() => setShowTestBankForm(true)}
          >
            <Text style={styles.buttonText}>Add to Test Bank</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              value={classCode}
              onChangeText={setClassCode}
              placeholder="Course Code (e.g., BMGT402)"
              autoCapitalize="characters"
            />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={fileType}
                onValueChange={(value: 'test' | 'notes' | 'materials') => setFileType(value)}
                style={styles.picker}
              >
                <Picker.Item label="Test/Exam" value="test" />
                <Picker.Item label="Notes" value="notes" />
                <Picker.Item label="Course Materials" value="materials" />
              </Picker>
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#888', marginBottom: 6 }]}
              onPress={handlePickFile}
            >
              <Text style={styles.buttonText}>{selectedFile ? 'Change File' : 'Choose File'}</Text>
            </TouchableOpacity>
            {selectedFile && (
              <Text style={{ marginBottom: 8, color: '#333', fontSize: 14 }}>Selected: {selectedFile.name}</Text>
            )}
            <TouchableOpacity
              style={[styles.button, { marginTop: 10 }]}
              onPress={handleTestBankSubmission}
            >
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#666' }]}
              onPress={() => { setShowTestBankForm(false); setSelectedFile(null); }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionHeader}>Help & Account</Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Alert.alert('Contact Tech Chair', 'Email techchair@fraternity.org')}
        >
          <Text style={styles.link}>Contact Tech Chair</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={handleLogout}>
          <Text style={[styles.link, { color: 'red' }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Event Feedback Modal */}
      <Modal
        visible={eventFeedbackModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEventFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Event Feedback</Text>
              <TouchableOpacity
                style={styles.exitButton}
                onPress={() => setEventFeedbackModalVisible(false)}
              >
                <Text style={styles.exitButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedEvent && (
                <>
                  <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(selectedEvent.date).toLocaleDateString()}
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
        </View>
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
    backgroundColor: '#FF6B35',
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
    color: '#FF6B35',
    backgroundColor: '#FFF3F0',
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
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
    color: '#4CAF50',
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
    fontWeight: '600',
  },
  
  formContainer: {
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  picker: {
    height: Platform.OS === 'ios' ? 200 : 50,
    width: '100%',
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
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
  button: {
    backgroundColor: '#4CAF50',
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
  link: { color: '#007AFF', fontSize: 15 },
  linkButton: { marginTop: 10 },
  toggleText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
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
    color: '#4CAF50',
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
  
  // AchievementBadge component styles
  badge: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
  },
  badgeEarned: {
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  badgeLocked: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  badgeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  badgeDescription: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
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
    backgroundColor: '#007AFF',
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
    backgroundColor: 'white',
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
    color: '#007AFF',
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
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
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
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
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
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});