import { useEffect, useState } from 'react';
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

// Enhanced analytics types
type FraternityHealthMetrics = {
  membershipGrowth: {
    total: number;
    activeMembers: number;
    retentionRate: number;
    pledgeClassSizes: Record<string, number>;
  };
  eventEngagement: {
    totalEvents: number;
    avgAttendanceRate: number;
    eventCompletionRate: number;
    pointDistribution: Record<string, number>;
  };
  memberPerformance: {
    topPerformers: Array<{ name: string; points: number }>;
    engagementTiers: { high: number; medium: number; low: number };
    atRiskMembers: number;
  };
  organizationalHealth: {
    diversityIndex: number;
    leadershipPipeline: number;
    riskFactors: Array<string>;
  };
};

type AnalysisInsights = {
  strengths: Array<string>;
  concerns: Array<string>;
  recommendations: Array<{ priority: 'high' | 'medium' | 'low'; action: string; impact: string }>;
};

const screenWidth = Dimensions.get('window').width;
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
  const [selectedTab, setSelectedTab] = useState<'overview' | 'members' | 'events' | 'analysis'>('overview');
  const [fraternityHealth, setFraternityHealth] = useState<FraternityHealthMetrics | null>(null);
  const [analysisInsights, setAnalysisInsights] = useState<AnalysisInsights | null>(null);

  useEffect(() => {
    fetchComprehensiveAnalytics();
  }, []);

  const fetchComprehensiveAnalytics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch data
      const [usersResponse, eventsResponse, attendanceResponse] = await Promise.all([
        supabase.from('users').select('*').eq('approved', true),
        supabase.from('events').select('*').eq('status', 'approved').gte('start_time', sixMonthsAgo.toISOString()),
        supabase.from('event_attendance').select('*, events!inner(start_time, point_type, point_value)').gte('events.start_time', sixMonthsAgo.toISOString())
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (eventsResponse.error) throw eventsResponse.error;
      if (attendanceResponse.error) throw attendanceResponse.error;

      const users = usersResponse.data || [];
      const events = eventsResponse.data || [];
      const attendance = attendanceResponse.data || [];

      // Calculate user points from attendance records
      const userPointsCalculated: Record<string, number> = {};
      attendance.forEach(att => {
        const event = att.events as any;
        const pointValue = event?.point_value || 1; // Default to 1 point if not specified
        userPointsCalculated[att.user_id] = (userPointsCalculated[att.user_id] || 0) + pointValue;
      });

      // Create sorted array of user points for analytics
      const userPointsArray = Object.entries(userPointsCalculated).map(([user_id, total_points]) => ({
        user_id,
        total_points
      })).sort((a, b) => b.total_points - a.total_points);

      // Create users map for easy lookup
      const usersMap = users.reduce((acc, user) => {
        acc[user.user_id] = user;
        return acc;
      }, {} as Record<string, any>);

      // Calculate metrics
      const pledgeClassSizes = users.reduce((acc, user) => {
        if (user.pledge_class) {
          acc[user.pledge_class] = (acc[user.pledge_class] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const recentlyActive = users.filter(user => 
        attendance.some(att => att.user_id === user.user_id && 
          new Date(att.attended_at || '') >= currentMonth)
      );

      const pointDistribution = events.reduce((acc, event) => {
        if (event.point_type) {
          acc[event.point_type] = (acc[event.point_type] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const sortedPoints = userPointsArray.map(up => up.total_points).sort((a, b) => b - a);
      const topThird = Math.ceil(sortedPoints.length / 3);
      const middleThird = Math.ceil(sortedPoints.length * 2 / 3);

      const healthMetrics: FraternityHealthMetrics = {
        membershipGrowth: {
          total: users.length,
          activeMembers: recentlyActive.length,
          retentionRate: users.length > 0 ? (recentlyActive.length / users.length) * 100 : 0,
          pledgeClassSizes,
        },
        eventEngagement: {
          totalEvents: events.length,
          avgAttendanceRate: users.length > 0 ? (attendance.length / users.length) * 100 : 0,
          eventCompletionRate: events.length > 0 ? (events.filter(e => attendance.some(a => a.event_id === e.id)).length / events.length) * 100 : 0,
          pointDistribution,
        },
        memberPerformance: {
          topPerformers: userPointsArray.slice(0, 5).map(up => {
            const user = usersMap[up.user_id];
            return {
              name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User' : 'Unknown User',
              points: up.total_points,
            };
          }),
          engagementTiers: {
            high: topThird,
            medium: middleThird - topThird,
            low: sortedPoints.length - middleThird
          },
          atRiskMembers: sortedPoints.length - middleThird,
        },
        organizationalHealth: {
          diversityIndex: Object.keys(pledgeClassSizes).length,
          leadershipPipeline: topThird,
          riskFactors: []
        }
      };

      const insights = generateInsights(healthMetrics);
      setFraternityHealth(healthMetrics);
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
    const recommendations: Array<{ priority: 'high' | 'medium' | 'low'; action: string; impact: string }> = [];

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
      {(['overview', 'members', 'events', 'analysis'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, selectedTab === tab && styles.activeTab]}
          onPress={() => setSelectedTab(tab)}
        >
          <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
          <Text style={styles.kpiLabel}>Total Members</Text>
          <Text style={[styles.kpiChange, { color: '#10b981' }]}>
            {fraternityHealth?.membershipGrowth.activeMembers || 0} active
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            {fraternityHealth?.membershipGrowth.retentionRate.toFixed(1) || '0'}%
          </Text>
          <Text style={styles.kpiLabel}>Retention Rate</Text>
          <Text style={[styles.kpiChange, { 
            color: (fraternityHealth?.membershipGrowth.retentionRate || 0) > 70 ? '#10b981' : '#ef4444' 
          }]}>
            {(fraternityHealth?.membershipGrowth.retentionRate || 0) > 70 ? 'Healthy' : 'Needs attention'}
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            {fraternityHealth?.eventEngagement.avgAttendanceRate.toFixed(1) || '0'}%
          </Text>
          <Text style={styles.kpiLabel}>Avg Attendance</Text>
          <Text style={[styles.kpiChange, { 
            color: (fraternityHealth?.eventEngagement.avgAttendanceRate || 0) > 60 ? '#10b981' : '#f59e0b' 
          }]}>
            {fraternityHealth?.eventEngagement.totalEvents || 0} events
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{fraternityHealth?.organizationalHealth.diversityIndex || 0}</Text>
          <Text style={styles.kpiLabel}>Pledge Classes</Text>
          <Text style={[styles.kpiChange, { color: '#6366f1' }]}>
            Diversity index
          </Text>
        </View>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>🏥 Fraternity Health Score</Text>
        <ProgressChart
          data={{
            labels: ['Retention', 'Attendance', 'Engagement', 'Leadership'],
            data: [
              (fraternityHealth?.membershipGrowth.retentionRate || 0) / 100,
              (fraternityHealth?.eventEngagement.avgAttendanceRate || 0) / 100,
              0.75,
              0.80
            ]
          }}
          width={screenWidth - 40}
          height={220}
          strokeWidth={16}
          radius={32}
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
          width={screenWidth - 40}
          height={220}
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
            width={screenWidth - 40}
            height={220}
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
            width={screenWidth - 40}
            height={220}
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
        <Text style={styles.sectionTitle}>🏆 Top Member Contributors</Text>
        <View style={styles.leaderboardContainer}>
          {fraternityHealth?.memberPerformance.topPerformers.map((performer, index) => (
            <View key={index} style={styles.leaderboardItem}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.performerInfo}>
                <Text style={styles.performerName}>{performer.name}</Text>
                <Text style={styles.performerPoints}>{performer.points} points</Text>
              </View>
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
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
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
    padding: 20,
    gap: 12,
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: (screenWidth - 52) / 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  kpiChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  chartSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
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
});
