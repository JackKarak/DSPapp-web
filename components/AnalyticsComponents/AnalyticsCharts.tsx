import React, { memo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart, StackedBarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import type { CategoryPointsBreakdown } from '../../types/analytics';
import { IOS_CHART_CONFIG, CHART_COLOR_ARRAYS } from '../../constants/analytics';

const chartWidth = Dimensions.get('window').width - 32;

// Map categories to icon names
const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('brotherhood')) return 'people';
  if (categoryLower.includes('service')) return 'hand-left';
  if (categoryLower.includes('professional')) return 'briefcase';
  if (categoryLower.includes('scholarship')) return 'school';
  if (categoryLower.includes('dei')) return 'ribbon';
  if (categoryLower.includes('h&w') || categoryLower.includes('health')) return 'fitness';
  if (categoryLower.includes('fundrais')) return 'cash';
  return 'flash'; // Default icon
};

// Pie Chart Component
export const DiversityPieChart = memo(({ 
  data, 
  title 
}: { 
  data: { label: string; count: number; percentage: number }[];
  title: string;
}) => {
  const chartData = data.slice(0, 6).map((item, index) => ({
    name: item.label.length > 15 ? item.label.substring(0, 12) + '...' : item.label,
    population: item.count,
    color: CHART_COLOR_ARRAYS.pie[index % CHART_COLOR_ARRAYS.pie.length],
    legendFontColor: '#333',
    legendFontSize: 12,
  }));

  if (chartData.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <PieChart
        data={chartData}
        width={chartWidth}
        height={220}
        chartConfig={IOS_CHART_CONFIG}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    </View>
  );
});
DiversityPieChart.displayName = 'DiversityPieChart';

// Bar Chart Component
export const DistributionBarChart = memo(({ 
  data, 
  title 
}: { 
  data: { label: string; count: number }[];
  title: string;
}) => {
  const topData = data.slice(0, 6);
  
  if (topData.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: topData.map(item => 
      item.label.length > 8 ? item.label.substring(0, 6) + '..' : item.label
    ),
    datasets: [
      {
        data: topData.map(item => item.count),
      },
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          ...IOS_CHART_CONFIG,
          barPercentage: 0.6,
        }}
        style={styles.chart}
        showValuesOnTopOfBars
        fromZero
      />
    </View>
  );
});
DistributionBarChart.displayName = 'DistributionBarChart';

// Category Points Bar Chart
export const CategoryPointsChart = memo(({ 
  data 
}: { 
  data: CategoryPointsBreakdown[];
}) => {
  if (data.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Points by Category</Text>
        <Text style={styles.noDataText}>No event data available</Text>
      </View>
    );
  }

  // Ensure we have at least some data values > 0
  const hasValidData = data.some(item => item.totalPoints > 0);
  
  if (!hasValidData) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Points by Category</Text>
        <Text style={styles.noDataText}>No point data available yet</Text>
      </View>
    );
  }

  // Sort by total points descending and take top 8
  const sortedData = [...data]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 8);

  const chartData = {
    labels: sortedData.map((_, index) => `${index + 1}`),
    datasets: [{
      data: sortedData.map(item => item.totalPoints)
    }]
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Points by Category</Text>
      <Text style={styles.chartSubtitle}>Total points earned across all members</Text>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={280}
        chartConfig={{
          ...IOS_CHART_CONFIG,
          barPercentage: 0.8,
          decimalPlaces: 0,
        }}
        style={styles.chart}
        yAxisLabel=""
        yAxisSuffix=" pts"
        fromZero
        showValuesOnTopOfBars
      />
      <View style={styles.categoryLegend}>
        {sortedData.map((item, index) => (
          <View key={index} style={styles.categoryLegendItem}>
            <View style={styles.categoryLegendNumber}>
              <Text style={styles.categoryLegendNumberText}>{index + 1}</Text>
            </View>
            <Ionicons 
              name={getCategoryIcon(item.category)} 
              size={20} 
              color="#8B5CF6" 
              style={styles.categoryIcon}
            />
            <Text style={styles.categoryLegendText}>
              {item.category}: {item.totalPoints} pts ({item.eventCount} events, {item.attendanceCount} attendances)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});
CategoryPointsChart.displayName = 'CategoryPointsChart';

// Average Points Per Member by Category
export const AveragePointsPerMemberChart = memo(({ 
  data,
  totalMembers 
}: { 
  data: CategoryPointsBreakdown[];
  totalMembers: number;
}) => {
  if (data.length === 0 || totalMembers === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Avg Points Per Member by Category</Text>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const hasValidData = data.some(item => item.totalPoints > 0);
  
  if (!hasValidData) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Avg Points Per Member by Category</Text>
        <Text style={styles.noDataText}>No point data available yet</Text>
      </View>
    );
  }

  // Calculate average points per member for each category
  const dataWithAverage = data
    .map(item => ({
      ...item,
      avgPerMember: totalMembers > 0 ? item.totalPoints / totalMembers : 0
    }))
    .sort((a, b) => b.avgPerMember - a.avgPerMember)
    .slice(0, 8);

  const chartData = {
    labels: dataWithAverage.map((_, index) => `${index + 1}`),
    datasets: [{
      data: dataWithAverage.map(item => Math.round(item.avgPerMember * 10) / 10)
    }]
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Avg Points Per Member by Category</Text>
      <Text style={styles.chartSubtitle}>Average points earned per member (Total Points ÷ {totalMembers} members)</Text>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={280}
        chartConfig={{
          ...IOS_CHART_CONFIG,
          barPercentage: 0.8,
          decimalPlaces: 1,
        }}
        style={styles.chart}
        yAxisLabel=""
        yAxisSuffix=" pts"
        fromZero
        showValuesOnTopOfBars
      />
      <View style={styles.categoryLegend}>
        {dataWithAverage.map((item, index) => (
          <View key={index} style={styles.categoryLegendItem}>
            <View style={styles.categoryLegendNumber}>
              <Text style={styles.categoryLegendNumberText}>{index + 1}</Text>
            </View>
            <Ionicons 
              name={getCategoryIcon(item.category)} 
              size={20} 
              color="#8B5CF6" 
              style={styles.categoryIcon}
            />
            <Text style={styles.categoryLegendText}>
              {item.category}: {Math.round(item.avgPerMember * 10) / 10} pts/member ({item.totalPoints} total pts)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});
AveragePointsPerMemberChart.displayName = 'AveragePointsPerMemberChart';

// House Membership Points Chart
export const HouseMembershipPointsChart = memo(({ 
  data 
}: { 
  data: Array<{ houseMembership: string; totalPoints: number; memberCount: number; avgPointsPerMember: number }>;
}) => {
  if (data.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Points by House Membership</Text>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.map((_, index) => `${index + 1}`),
    datasets: [{
      data: data.map(item => item.totalPoints)
    }]
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Points by House Membership</Text>
      <Text style={styles.chartSubtitle}>Total points earned by house members</Text>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={280}
        chartConfig={{
          ...IOS_CHART_CONFIG,
          barPercentage: 0.8,
          decimalPlaces: 0,
        }}
        style={styles.chart}
        yAxisLabel=""
        yAxisSuffix=" pts"
        fromZero
        showValuesOnTopOfBars
      />
      <View style={styles.categoryLegend}>
        {data.map((item, index) => (
          <View key={index} style={styles.categoryLegendItem}>
            <View style={styles.categoryLegendNumber}>
              <Text style={styles.categoryLegendNumberText}>{index + 1}</Text>
            </View>
            <Ionicons 
              name="home" 
              size={20} 
              color="#8B5CF6" 
              style={styles.categoryIcon}
            />
            <Text style={styles.categoryLegendText}>
              {item.houseMembership}: {item.totalPoints} pts ({item.memberCount} members, {Math.round(item.avgPointsPerMember * 10) / 10} avg)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});
HouseMembershipPointsChart.displayName = 'HouseMembershipPointsChart';

// Pledge Class Average Points Chart
export const PledgeClassPointsChart = memo(({ 
  data 
}: { 
  data: Array<{ pledgeClass: string; totalPoints: number; memberCount: number; avgPointsPerMember: number }>;
}) => {
  if (data.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Avg Points by Pledge Class</Text>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.map((_, index) => `${index + 1}`),
    datasets: [{
      data: data.map(item => Math.round(item.avgPointsPerMember * 10) / 10)
    }]
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Avg Points by Pledge Class</Text>
      <Text style={styles.chartSubtitle}>Average points per member by pledge class</Text>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={280}
        chartConfig={{
          ...IOS_CHART_CONFIG,
          barPercentage: 0.8,
          decimalPlaces: 1,
        }}
        style={styles.chart}
        yAxisLabel=""
        yAxisSuffix=" pts"
        fromZero
        showValuesOnTopOfBars
      />
      <View style={styles.categoryLegend}>
        {data.map((item, index) => (
          <View key={index} style={styles.categoryLegendItem}>
            <View style={styles.categoryLegendNumber}>
              <Text style={styles.categoryLegendNumberText}>{index + 1}</Text>
            </View>
            <Ionicons 
              name="ribbon" 
              size={20} 
              color="#8B5CF6" 
              style={styles.categoryIcon}
            />
            <Text style={styles.categoryLegendText}>
              {item.pledgeClass}: {Math.round(item.avgPointsPerMember * 10) / 10} pts/member ({item.memberCount} members)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});
PledgeClassPointsChart.displayName = 'PledgeClassPointsChart';

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  chart: {
    borderRadius: 8,
  },
  categoryLegend: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  categoryLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLegendNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6', // DSP Purple
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryLegendNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6', // DSP Purple
    marginRight: 8,
  },
  categoryLegendText: {
    fontSize: 12,
    color: '#4B5563', // Dark gray for readability
    flex: 1,
  },
});
