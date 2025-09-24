import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  BarChart,
  PieChart,
  ProgressChart
} from '../../components/IOSCharts';
import { supabase } from '../../lib/supabase';

// Enhanced analytics types with more detailed member analytics and individual event data
type FraternityHealthMetrics = {
  membershipGrowth: {
    total: number;
    activeMembers: number;
    retentionRate: number;
    pledgeClassSizes: Record<string, number>;
    graduationYears: Record<string, number>;
    officerCount: number;
    monthlyGrowth: { month: string; count: number }[];
  };
  memberDemographics: {
    majorDistribution: Record<string, number>;
    genderDistribution: Record<string, number>;
    pronounDistribution: Record<string, number>;
    housingDistribution: Record<string, number>;
    livingTypeDistribution: Record<string, number>;
  };
  eventEngagement: {
    totalEvents: number;
    avgAttendanceRate: number;
    eventCompletionRate: number;
    pointDistribution: Record<string, number>;
    eventTrends: { month: string; events: number; attendance: number }[];
    individualEvents: EventAnalytics[];
  };
  memberPerformance: {
    topPerformers: { name: string; points: number; pledgeClass: string; eventsAttended: number }[];
    engagementTiers: { high: number; medium: number; low: number };
    atRiskMembers: number;
    averagePoints: number;
    medianPoints: number;
    attendanceDistribution: { range: string; count: number }[];
  };
  organizationalHealth: {
    diversityIndex: number;
    leadershipPipeline: number;
    riskFactors: string[];
    overallScore: number;
  };
};

type EventAnalytics = {
  id: string;
  title: string;
  date: string;
  attendanceCount: number;
  attendanceRate: number;
  pointValue: number;
  pointType: string;
  rsvpCount: number;
  noShowRate: number;
  topAttendees: string[];
  creator: string;
  duration?: number;
  averageRating?: number;
};

type AnalysisInsights = {
  strengths: string[];
  concerns: string[];
  recommendations: { priority: 'high' | 'medium' | 'low'; action: string; impact: string }[];
};

const screenWidth = Dimensions.get('window').width;
const chartWidth = Math.min(screenWidth - 64, 320); // More conservative width calculation
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  propsForLabels: { fontSize: 12, fontWeight: '400' as any },
  propsForBackgroundLines: { strokeDasharray: '5,5', stroke: '#e0e0e0', strokeWidth: 1 },
};

const pieColors = ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#9C27B0', '#FF9800'];

export default function PresidentAnalytics() {
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'members' | 'demographics' | 'events' | 'analysis'>('overview');
  const [fraternityHealth, setFraternityHealth] = useState<FraternityHealthMetrics | null>(null);
  const [analysisInsights, setAnalysisInsights] = useState<AnalysisInsights | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchComprehensiveAnalytics();
  }, []);

  const fetchComprehensiveAnalytics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch data with more comprehensive queries
      const [usersResponse, eventsResponse, attendanceResponse, eventRatingResponse] = await Promise.all([
        supabase.from('users').select('*').eq('approved', true),
        supabase.from('events').select('*, created_by(first_name, last_name)').eq('status', 'approved').gte('start_time', sixMonthsAgo.toISOString()),
        supabase.from('event_attendance').select('*, events!inner(start_time, point_type, point_value, title, id)').gte('events.start_time', sixMonthsAgo.toISOString()),
        supabase.from('event_feedback').select('rating, event_id').gte('created_at', sixMonthsAgo.toISOString())
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (eventsResponse.error) throw eventsResponse.error;
      if (attendanceResponse.error) throw attendanceResponse.error;
      if (eventRatingResponse.error) console.warn('Event ratings error:', eventRatingResponse.error);

      const users = usersResponse.data || [];
      const events = eventsResponse.data || [];
      const attendance = attendanceResponse.data || [];
      const eventRatings = eventRatingResponse.data || [];

      // Filter users to only include brothers for attendance calculations
      const brothers = users.filter(user => user.role === 'brother');

      // Calculate user points and attendance counts
      const userPointsCalculated: Record<string, number> = {};
      const userAttendanceCounts: Record<string, number> = {};
      
      attendance.forEach(att => {
        const user = users.find(u => u.user_id === att.user_id);
        if (user && user.role === 'brother') {
          const event = att.events as any;
          const pointValue = event?.point_value || 1;
          userPointsCalculated[att.user_id] = (userPointsCalculated[att.user_id] || 0) + pointValue;
          userAttendanceCounts[att.user_id] = (userAttendanceCounts[att.user_id] || 0) + 1;
        }
      });

      // Create sorted array of user points for analytics
      const userPointsArray = Object.entries(userPointsCalculated).map(([user_id, total_points]) => ({
        user_id,
        total_points,
        eventsAttended: userAttendanceCounts[user_id] || 0
      })).sort((a, b) => b.total_points - a.total_points);

      // Create users map for easy lookup
      const usersMap = users.reduce((acc, user) => {
        acc[user.user_id] = user;
        return acc;
      }, {} as Record<string, any>);

      // Calculate monthly growth trends
      const monthlyGrowth = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthEvents = events.filter(event => {
          const eventDate = new Date(event.start_time);
          return eventDate.getMonth() === date.getMonth() && eventDate.getFullYear() === date.getFullYear();
        });
        monthlyGrowth.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          count: monthEvents.length
        });
      }

      // Calculate pledge class sizes
      const pledgeClassSizes = brothers.reduce((acc, user) => {
        if (user.pledge_class) {
          acc[user.pledge_class] = (acc[user.pledge_class] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Calculate graduation years distribution
      const graduationYears = brothers.reduce((acc, user) => {
        if (user.expected_graduation) {
          const year = user.expected_graduation.toString();
          acc[year] = (acc[year] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Calculate officer count
      const officerCount = users.filter(user => user.officer_position).length;

      // Calculate demographic distributions
      const majorDistribution = brothers.reduce((acc, user) => {
        if (user.majors) {
          const majors = user.majors.split(', ');
          majors.forEach((major: string) => {
            acc[major.trim()] = (acc[major.trim()] || 0) + 1;
          });
        }
        return acc;
      }, {} as Record<string, number>);

      const genderDistribution = brothers.reduce((acc, user) => {
        const gender = user.gender || 'Not Specified';
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const pronounDistribution = brothers.reduce((acc, user) => {
        const pronouns = user.pronouns || 'Not Specified';
        acc[pronouns] = (acc[pronouns] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const housingDistribution = brothers.reduce((acc, user) => {
        const housing = user.house_membership || 'Not Specified';
        acc[housing] = (acc[housing] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const livingTypeDistribution = brothers.reduce((acc, user) => {
        const livingType = user.living_type || 'Not Specified';
        acc[livingType] = (acc[livingType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate event engagement metrics
      const recentlyActive = brothers.filter(user => 
        attendance.some(att => att.user_id === user.user_id && 
          new Date(att.checked_in_at || '') >= currentMonth)
      );

      const pointDistribution = events.reduce((acc, event) => {
        if (event.point_type) {
          acc[event.point_type] = (acc[event.point_type] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Calculate event trends
      const eventTrends = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthEvents = events.filter(event => {
          const eventDate = new Date(event.start_time);
          return eventDate.getMonth() === date.getMonth() && eventDate.getFullYear() === date.getFullYear();
        });
        const monthAttendance = attendance.filter(att => {
          const event = att.events as any;
          if (!event?.start_time) return false;
          const eventDate = new Date(event.start_time);
          return eventDate.getMonth() === date.getMonth() && eventDate.getFullYear() === date.getFullYear();
        });
        
        eventTrends.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          events: monthEvents.length,
          attendance: monthAttendance.length
        });
      }

      // Calculate individual event analytics
      const eventRatingsMap = eventRatings.reduce((acc, rating) => {
        if (!acc[rating.event_id]) acc[rating.event_id] = [];
        acc[rating.event_id].push(rating.rating);
        return acc;
      }, {} as Record<string, number[]>);

      const individualEvents: EventAnalytics[] = events.map(event => {
        const eventAttendance = attendance.filter(att => {
          const attEvent = att.events as any;
          return attEvent?.id === event.id;
        });
        
        const ratings = eventRatingsMap[event.id] || [];
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined;
        
        // Get creator name
        let creatorName = 'Unknown';
        if (event.created_by) {
          const creator = Array.isArray(event.created_by) ? event.created_by[0] : event.created_by;
          if (creator && typeof creator === 'object') {
            creatorName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || 'Unknown';
          }
        }

        return {
          id: event.id,
          title: event.title,
          date: event.start_time,
          attendanceCount: eventAttendance.length,
          attendanceRate: brothers.length > 0 ? (eventAttendance.length / brothers.length) * 100 : 0,
          pointValue: event.point_value || 0,
          pointType: event.point_type || 'other',
          rsvpCount: 0, // Would need RSVP table to calculate
          noShowRate: 0, // Would need RSVP vs attendance data
          topAttendees: eventAttendance.slice(0, 5).map(att => {
            const user = usersMap[att.user_id];
            return user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';
          }),
          creator: creatorName,
          averageRating: avgRating
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate performance metrics
      const sortedPoints = userPointsArray.map(up => up.total_points).sort((a, b) => b - a);
      const topThird = Math.ceil(sortedPoints.length / 3);
      const middleThird = Math.ceil(sortedPoints.length * 2 / 3);

      const averagePoints = userPointsArray.length > 0 
        ? userPointsArray.reduce((sum, up) => sum + up.total_points, 0) / userPointsArray.length 
        : 0;

      const medianPoints = sortedPoints.length > 0
        ? sortedPoints.length % 2 === 0
          ? (sortedPoints[sortedPoints.length / 2 - 1] + sortedPoints[sortedPoints.length / 2]) / 2
          : sortedPoints[Math.floor(sortedPoints.length / 2)]
        : 0;

      // Calculate attendance distribution
      const attendanceDistribution = [
        { range: '0-5 events', count: userPointsArray.filter(up => up.eventsAttended <= 5).length },
        { range: '6-10 events', count: userPointsArray.filter(up => up.eventsAttended > 5 && up.eventsAttended <= 10).length },
        { range: '11-15 events', count: userPointsArray.filter(up => up.eventsAttended > 10 && up.eventsAttended <= 15).length },
        { range: '16+ events', count: userPointsArray.filter(up => up.eventsAttended > 15).length }
      ];

      // Calculate organizational health score
      const retentionScore = Math.min((recentlyActive.length / brothers.length) * 100, 100);
      const attendanceScore = individualEvents.length > 0 
        ? individualEvents.reduce((sum, event) => sum + event.attendanceRate, 0) / individualEvents.length 
        : 0;
      const diversityScore = Math.min((Object.keys(majorDistribution).length / brothers.length) * 100, 100);
      const leadershipScore = Math.min((officerCount / brothers.length) * 100, 100);
      
      const overallScore = Math.round((retentionScore + attendanceScore + diversityScore + leadershipScore) / 4);

      // Calculate risk factors
      const riskFactors: string[] = [];
      if (retentionScore < 60) riskFactors.push('Low member retention');
      if (attendanceScore < 50) riskFactors.push('Poor event attendance');
      if (Object.keys(pledgeClassSizes).length < 3) riskFactors.push('Limited pledge class diversity');
      if (officerCount < brothers.length * 0.1) riskFactors.push('Insufficient leadership representation');

      const healthMetrics: FraternityHealthMetrics = {
        membershipGrowth: {
          total: brothers.length,
          activeMembers: recentlyActive.length,
          retentionRate: brothers.length > 0 ? (recentlyActive.length / brothers.length) * 100 : 0,
          pledgeClassSizes,
          graduationYears,
          officerCount,
          monthlyGrowth,
        },
        memberDemographics: {
          majorDistribution,
          genderDistribution,
          pronounDistribution,
          housingDistribution,
          livingTypeDistribution,
        },
        eventEngagement: {
          totalEvents: events.length,
          avgAttendanceRate: individualEvents.length > 0 
            ? individualEvents.reduce((sum, event) => sum + event.attendanceRate, 0) / individualEvents.length 
            : 0,
          eventCompletionRate: events.length > 0 ? (events.filter(e => attendance.some(a => {
            const attEvent = a.events as any;
            return attEvent?.id === e.id;
          })).length / events.length) * 100 : 0,
          pointDistribution,
          eventTrends,
          individualEvents,
        },
        memberPerformance: {
          topPerformers: userPointsArray.slice(0, 5).map(up => {
            const user = usersMap[up.user_id];
            return {
              name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User' : 'Unknown User',
              points: up.total_points,
              pledgeClass: user?.pledge_class || 'Unknown',
              eventsAttended: up.eventsAttended,
            };
          }),
          engagementTiers: {
            high: topThird,
            medium: middleThird - topThird,
            low: sortedPoints.length - middleThird
          },
          atRiskMembers: sortedPoints.length - middleThird,
          averagePoints,
          medianPoints,
          attendanceDistribution,
        },
        organizationalHealth: {
          diversityIndex: Object.keys(pledgeClassSizes).length,
          leadershipPipeline: topThird,
          riskFactors,
          overallScore,
        }
      };

      // Create analytics object with all required properties
      const analyticsData = {
        pointsData: userPointsArray.map((up, index) => {
          const user = usersMap[up.user_id];
          return {
            name: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
            points: up.total_points,
            color: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#CD7F32' : '#8e8e8e',
            legendFontColor: '#7F7F7F',
            legendFontSize: 12,
          };
        }).slice(0, 8),
        healthMetrics,
        monthlyGrowth,
        eventTrends,
        individualEvents,
        eventsAttended: userPointsArray.map(up => up.eventsAttended),
        overallScore,
      };

      const insights = generateInsights(healthMetrics);
      setFraternityHealth(healthMetrics);
      setAnalytics(analyticsData);
      setAnalysisInsights(insights);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (metrics: FraternityHealthMetrics): AnalysisInsights => {
    const strengths: string[] = [];
    const concerns: string[] = [];
    const recommendations: { priority: 'high' | 'medium' | 'low'; action: string; impact: string }[] = [];

    if (metrics.membershipGrowth.retentionRate > 80) {
      strengths.push(`Strong member retention at ${metrics.membershipGrowth.retentionRate.toFixed(1)}%`);
    } else if (metrics.membershipGrowth.retentionRate < 60) {
      concerns.push(`Low member retention at ${metrics.membershipGrowth.retentionRate.toFixed(1)}%`);
      recommendations.push({
        priority: 'high',
        action: 'Implement member engagement survey and retention program',
        impact: 'Could improve retention by 15-20%'
      });
    }

    if (metrics.eventEngagement.avgAttendanceRate > 70) {
      strengths.push(`Excellent event attendance at ${metrics.eventEngagement.avgAttendanceRate.toFixed(1)}%`);
    } else if (metrics.eventEngagement.avgAttendanceRate < 50) {
      concerns.push(`Low event attendance at ${metrics.eventEngagement.avgAttendanceRate.toFixed(1)}%`);
      recommendations.push({
        priority: 'medium',
        action: 'Review event planning and member feedback',
        impact: 'Could increase attendance by 10-15%'
      });
    }

    return { strengths, concerns, recommendations };
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {(['overview', 'members', 'demographics', 'events', 'analysis'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, selectedTab === tab && styles.activeTab]}
          onPress={() => setSelectedTab(tab)}
        >
          <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
            {tab === 'demographics' ? 'Demo' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverview = () => (
    <View>
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{fraternityHealth?.membershipGrowth.total || 0}</Text>
          <Text style={styles.kpiLabel}>Members</Text>
          <Text style={[styles.kpiChange, { color: '#10b981' }]}>
            {fraternityHealth?.membershipGrowth.officerCount || 0} officers
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            {fraternityHealth?.membershipGrowth.retentionRate.toFixed(0) || '0'}%
          </Text>
          <Text style={styles.kpiLabel}>Retention</Text>
          <Text style={[styles.kpiChange, { 
            color: (fraternityHealth?.membershipGrowth.retentionRate || 0) > 70 ? '#10b981' : '#ef4444' 
          }]}>
            {(fraternityHealth?.membershipGrowth.retentionRate || 0) > 70 ? 'Healthy' : 'At Risk'}
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            {fraternityHealth?.eventEngagement.avgAttendanceRate.toFixed(0) || '0'}%
          </Text>
          <Text style={styles.kpiLabel}>Attendance</Text>
          <Text style={[styles.kpiChange, { 
            color: (fraternityHealth?.eventEngagement.avgAttendanceRate || 0) > 60 ? '#10b981' : '#f59e0b' 
          }]}>
            {fraternityHealth?.eventEngagement.totalEvents || 0} events
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{fraternityHealth?.memberPerformance.averagePoints.toFixed(0) || 0}</Text>
          <Text style={styles.kpiLabel}>Avg Points</Text>
          <Text style={[styles.kpiChange, { color: '#6366f1' }]}>
            Per member
          </Text>
        </View>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>🏥 Health Score</Text>
        <ProgressChart
          data={{
            labels: ['Retention', 'Attendance', 'Performance', 'Leadership'],
            data: [
              (fraternityHealth?.membershipGrowth.retentionRate || 0) / 100,
              (fraternityHealth?.eventEngagement.avgAttendanceRate || 0) / 100,
              Math.min((fraternityHealth?.memberPerformance.averagePoints || 0) / 50, 1),
              Math.min((fraternityHealth?.membershipGrowth.officerCount || 0) / 10, 1)
            ]
          }}
          width={chartWidth}
          height={160}
          strokeWidth={12}
          radius={24}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            color: (opacity = 1, index?: number) => {
              const colors = ['#ef4444', '#f59e0b', '#10b981', '#6366f1'];
              return colors[index || 0] || `rgba(99, 102, 241, ${opacity})`;
            },
          }}
          style={styles.chart}
        />
      </View>
    </View>
  );

  const renderMemberAnalysis = () => (
    <View>
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>👥 Member Performance Distribution</Text>
        <PieChart
          data={[
            {
              name: 'High Performers',
              population: fraternityHealth?.memberPerformance.engagementTiers.high || 0,
              color: '#10b981',
              legendFontColor: '#333',
              legendFontSize: 15,
            },
            {
              name: 'Average Members',
              population: fraternityHealth?.memberPerformance.engagementTiers.medium || 0,
              color: '#f59e0b',
              legendFontColor: '#333',
              legendFontSize: 15,
            },
            {
              name: 'At-Risk Members',
              population: fraternityHealth?.memberPerformance.engagementTiers.low || 0,
              color: '#ef4444',
              legendFontColor: '#333',
              legendFontSize: 15,
            }
          ]}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>🎓 Pledge Class Distribution</Text>
        {fraternityHealth?.membershipGrowth.pledgeClassSizes && Object.keys(fraternityHealth.membershipGrowth.pledgeClassSizes).length > 0 ? (
          <BarChart
            data={{
              labels: Object.keys(fraternityHealth.membershipGrowth.pledgeClassSizes).slice(0, 6),
              datasets: [{
                data: Object.values(fraternityHealth.membershipGrowth.pledgeClassSizes).slice(0, 6)
              }]
            }}
            width={chartWidth}
            height={180}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`}}
            style={styles.chart}
          />
        ) : (
          <Text style={styles.noDataText}>No pledge class data available</Text>
        )}
      </View>
    </View>
  );

  const renderEventAnalysis = () => (
    <View>
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>📊 Event Trends Over Time</Text>
        {analytics?.eventTrends && analytics.eventTrends.length > 0 ? (
          <BarChart
            data={{
              labels: analytics.eventTrends.map((trend: any) => trend.month),
              datasets: [{
                data: analytics.eventTrends.map((trend: any) => trend.events),
                color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
              }]
            }}
            width={screenWidth - 40}
            height={180}
            chartConfig={chartConfig}
            yAxisLabel=""
            yAxisSuffix=""
            style={styles.chart}
          />
        ) : (
          <Text style={styles.noDataText}>No event trend data available</Text>
        )}
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>🎯 Event Distribution by Type</Text>
        {fraternityHealth?.eventEngagement.pointDistribution && Object.keys(fraternityHealth.eventEngagement.pointDistribution).length > 0 ? (
          <PieChart
            data={Object.entries(fraternityHealth.eventEngagement.pointDistribution).map(([name, count], i) => ({
              name: name.charAt(0).toUpperCase() + name.slice(1),
              population: count,
              color: pieColors[i % pieColors.length],
              legendFontColor: '#333',
              legendFontSize: 13,
            }))}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        ) : (
          <Text style={styles.noDataText}>No event data available</Text>
        )}
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>📋 Individual Event Performance</Text>
        <ScrollView style={styles.eventsScrollView} showsVerticalScrollIndicator={false}>
          {analytics?.individualEvents?.map((event: any, index: number) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                <View style={styles.eventMetrics}>
                  <Text style={styles.eventAttendance}>{event.attendanceCount} attendees</Text>
                  <Text style={styles.eventRate}>{event.attendanceRate.toFixed(1)}% rate</Text>
                </View>
              </View>
              
              <View style={styles.eventDetails}>
                <View style={styles.eventDetailRow}>
                  <Text style={styles.eventDetailLabel}>Date:</Text>
                  <Text style={styles.eventDetailValue}>
                    {new Date(event.date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.eventDetailRow}>
                  <Text style={styles.eventDetailLabel}>Points:</Text>
                  <Text style={styles.eventDetailValue}>{event.pointValue} ({event.pointType})</Text>
                </View>
                <View style={styles.eventDetailRow}>
                  <Text style={styles.eventDetailLabel}>Creator:</Text>
                  <Text style={styles.eventDetailValue}>{event.creator}</Text>
                </View>
                {event.averageRating && (
                  <View style={styles.eventDetailRow}>
                    <Text style={styles.eventDetailLabel}>Rating:</Text>
                    <Text style={styles.eventDetailValue}>
                      {event.averageRating.toFixed(1)}/5 ⭐
                    </Text>
                  </View>
                )}
              </View>
              
              {event.topAttendees && event.topAttendees.length > 0 && (
                <View style={styles.topAttendees}>
                  <Text style={styles.topAttendeesLabel}>Top Attendees:</Text>
                  <Text style={styles.topAttendeesText}>
                    {event.topAttendees.slice(0, 3).join(', ')}
                    {event.topAttendees.length > 3 && ` +${event.topAttendees.length - 3} more`}
                  </Text>
                </View>
              )}
              
              <View style={styles.attendanceBar}>
                <View 
                  style={[
                    styles.attendanceProgress, 
                    { width: `${Math.min(event.attendanceRate, 100)}%` }
                  ]} 
                />
              </View>
            </View>
          )) || <Text style={styles.noDataText}>No individual event data available</Text>}
        </ScrollView>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>🏆 Top Contributors</Text>
        <View style={styles.leaderboardContainer}>
          {fraternityHealth?.memberPerformance.topPerformers.map((performer, index) => (
            <View key={index} style={styles.leaderboardItem}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.performerInfo}>
                <Text style={styles.performerName} numberOfLines={1}>{performer.name}</Text>
                <Text style={styles.performerPoints}>
                  {performer.points} pts • {performer.eventsAttended} events • {performer.pledgeClass}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderDemographics = () => (
    <View>
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>🎓 Graduation Years</Text>
        {fraternityHealth?.membershipGrowth.graduationYears && Object.keys(fraternityHealth.membershipGrowth.graduationYears).length > 0 ? (
          <BarChart
            data={{
              labels: Object.keys(fraternityHealth.membershipGrowth.graduationYears).slice(0, 6),
              datasets: [{
                data: Object.values(fraternityHealth.membershipGrowth.graduationYears).slice(0, 6)
              }]
            }}
            width={screenWidth - 40}
            height={180}
            chartConfig={chartConfig}
            yAxisLabel=""
            yAxisSuffix=""
            style={styles.chart}
          />
        ) : (
          <Text style={styles.noDataText}>No graduation data available</Text>
        )}
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>📚 Top Majors</Text>
        <View style={styles.demographicsList}>
          {Object.entries(fraternityHealth?.memberDemographics.majorDistribution || {})
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([major, count]) => (
              <View key={major} style={styles.demographicItem}>
                <Text style={styles.demographicLabel} numberOfLines={1}>{major}</Text>
                <Text style={styles.demographicValue}>{count}</Text>
              </View>
            ))}
        </View>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>🏠 Housing Distribution</Text>
        <View style={styles.demographicsList}>
          {Object.entries(fraternityHealth?.memberDemographics.housingDistribution || {})
            .sort(([,a], [,b]) => b - a)
            .map(([housing, count]) => (
              <View key={housing} style={styles.demographicItem}>
                <Text style={styles.demographicLabel} numberOfLines={1}>{housing}</Text>
                <Text style={styles.demographicValue}>{count}</Text>
              </View>
            ))}
        </View>
      </View>
    </View>
  );

  const renderAnalysisInsights = () => (
    <View>
      <View style={styles.insightSection}>
        <Text style={styles.insightTitle}>💪 Organizational Strengths</Text>
        {analysisInsights?.strengths.map((strength, index) => (
          <View key={index} style={[styles.insightItem, styles.strengthItem]}>
            <Text style={styles.insightIcon}>✅</Text>
            <Text style={styles.insightText}>{strength}</Text>
          </View>
        ))}
      </View>

      <View style={styles.insightSection}>
        <Text style={styles.insightTitle}>⚠️ Areas of Concern</Text>
        {analysisInsights?.concerns.map((concern, index) => (
          <View key={index} style={[styles.insightItem, styles.concernItem]}>
            <Text style={styles.insightIcon}>🔴</Text>
            <Text style={styles.insightText}>{concern}</Text>
          </View>
        ))}
      </View>

      <View style={styles.insightSection}>
        <Text style={styles.insightTitle}>🎯 Strategic Recommendations</Text>
        {analysisInsights?.recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationItem}>
            <View style={[styles.priorityBadge, {
              backgroundColor: rec.priority === 'high' ? '#fef2f2' : rec.priority === 'medium' ? '#fef3c7' : '#f0f9ff',
              borderColor: rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#3b82f6'
            }]}>
              <Text style={[styles.priorityText, {
                color: rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#3b82f6'
              }]}>
                {rec.priority.toUpperCase()}
              </Text>
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationAction}>{rec.action}</Text>
              <Text style={styles.recommendationImpact}>Expected Impact: {rec.impact}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>📊 Executive Summary</Text>
        <Text style={styles.summaryText}>
          Your fraternity currently has {fraternityHealth?.membershipGrowth.total || 0} active members with a {fraternityHealth?.membershipGrowth.retentionRate.toFixed(1) || 0}% retention rate. 
          Event attendance averages {fraternityHealth?.eventEngagement.avgAttendanceRate.toFixed(1) || 0}%, indicating {(fraternityHealth?.eventEngagement.avgAttendanceRate || 0) > 70 ? 'strong' : (fraternityHealth?.eventEngagement.avgAttendanceRate || 0) > 50 ? 'moderate' : 'weak'} member engagement.
        </Text>
        <Text style={styles.summaryText}>
          The organization shows {analysisInsights?.strengths.length || 0} key strengths that should be leveraged for continued growth and success.
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Analyzing fraternity data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>📈 Executive Dashboard</Text>
        <Text style={styles.subtitle}>Comprehensive fraternity analytics & insights</Text>
      </View>

      {renderTabBar()}

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'members' && renderMemberAnalysis()}
        {selectedTab === 'demographics' && renderDemographics()}
        {selectedTab === 'events' && renderEventAnalysis()}
        {selectedTab === 'analysis' && renderAnalysisInsights()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  tabBar: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#6366f1',
  },
  content: {
    flex: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 6,
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    width: (screenWidth - 36) / 2, // More conservative calculation
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 6,
  },
  kpiChange: {
    fontSize: 11,
    fontWeight: '500',
  },
  chartSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
  },
  noDataText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 40,
  },
  leaderboardContainer: {
    gap: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rankBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  performerPoints: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  insightSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  strengthItem: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  concernItem: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  insightIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 12,
    marginTop: 2,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationAction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  recommendationImpact: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  summarySection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  // Demographics styles
  demographicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  demographicItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    minWidth: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  demographicLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  demographicValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '700',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  // Event card styles
  eventsScrollView: {
    maxHeight: 600,
    paddingHorizontal: 16,
  },
  eventCard: {
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
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
  },
  eventMetrics: {
    alignItems: 'flex-end',
  },
  eventAttendance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  eventRate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventDetailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  eventDetailValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  topAttendees: {
    marginBottom: 12,
  },
  topAttendeesLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  topAttendeesText: {
    fontSize: 13,
    color: '#1e293b',
    lineHeight: 18,
  },
  attendanceBar: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  attendanceProgress: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
});
