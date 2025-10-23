import React, { memo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import type { CategoryPointsBreakdown } from '../../types/analytics';

const chartWidth = Dimensions.get('window').width - 32;

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  decimalPlaces: 0,
  propsForLabels: {
    fontSize: 11,
  },
};

const pieChartColors = [
  '#4285F4', // Google Blue
  '#34A853', // Google Green
  '#FBBC04', // Google Yellow
  '#EA4335', // Google Red
  '#9C27B0', // Purple
  '#FF9800', // Orange
  '#00BCD4', // Cyan
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#E91E63', // Pink
];

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
    color: pieChartColors[index % pieChartColors.length],
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
        chartConfig={chartConfig}
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
          ...chartConfig,
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

  const chartData = {
    labels: data.map(item => 
      item.category.length > 10 ? item.category.substring(0, 8) + '..' : item.category
    ),
    datasets: [
      {
        data: data.map(item => Math.round(item.averagePoints * 10) / 10), // Round to 1 decimal
      },
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Average Points by Category</Text>
      <Text style={styles.chartSubtitle}>Per Member Attendance</Text>
      <BarChart
        data={chartData}
        width={chartWidth}
        height={280}
        yAxisLabel=""
        yAxisSuffix=" pts"
        chartConfig={{
          ...chartConfig,
          barPercentage: 0.7,
          color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
          decimalPlaces: 1,
        }}
        style={styles.chart}
        showValuesOnTopOfBars
        fromZero
      />
      <View style={styles.categoryLegend}>
        {data.map((item, index) => (
          <View key={index} style={styles.categoryLegendItem}>
            <View style={styles.categoryLegendDot} />
            <Text style={styles.categoryLegendText}>
              {item.category}: {item.eventCount} events, {item.attendanceCount} attendances
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
  categoryLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4285F4',
    marginRight: 8,
  },
  categoryLegendText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
});
