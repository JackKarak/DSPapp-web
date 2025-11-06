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
        <Text style={styles.chartTitle}>Average Points by Category</Text>
        <Text style={styles.noDataText}>No event data available</Text>
      </View>
    );
  }

  // Ensure we have at least some data values > 0
  const hasValidData = data.some(item => item.totalPoints > 0);
  
  if (!hasValidData) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Average Points by Category</Text>
        <Text style={styles.noDataText}>No point data available yet</Text>
      </View>
    );
  }

  const chartData = {
    labels: data.map((_, index) => `${index + 1}`), // Use numbers instead of text
    legend: ["Avg Attendance/Member", "Total Events"],
    data: data.map(item => [
      Math.round((item.averageAttendancePerMember || 0) * 10) / 10, // Bottom stack: avg attendance per member
      item.eventCount // Top stack: total events in category
    ]),
    barColors: ["#8B5CF6", "#D4AF37"], // DSP Purple for attendance, DSP Gold for total events
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Category Events & Attendance</Text>
      <Text style={styles.chartSubtitle}>Average Member Attendance vs Total Events</Text>
      <StackedBarChart
        data={chartData}
        width={chartWidth}
        height={280}
        chartConfig={{
          ...IOS_CHART_CONFIG,
          barPercentage: 0.7,
          decimalPlaces: 1,
        }}
        style={styles.chart}
        hideLegend={false}
      />
      <View style={styles.categoryLegend}>
        {data.map((item, index) => (
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
              {item.category}: {Math.round((item.averageAttendancePerMember || 0) * 10) / 10} avg / {item.eventCount} events
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});
CategoryPointsChart.displayName = 'CategoryPointsChart';

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
