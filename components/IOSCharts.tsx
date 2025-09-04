import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// iOS-optimized chart components that replace react-native-chart-kit

export interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
  }>;
}

export interface PieChartData {
  name: string;
  population?: number;
  points?: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

export interface ProgressData {
  labels: string[];
  data: number[];
}

// Simple Bar Chart Component for iOS
export const BarChart: React.FC<{
  data: ChartData;
  width: number;
  height: number;
  chartConfig: any;
  yAxisLabel?: string;
  yAxisSuffix?: string;
  showBarTops?: boolean;
  fromZero?: boolean;
  withInnerLines?: boolean;
  style?: any;
}> = ({ data, width, height, chartConfig, style }) => {
  const maxValue = Math.max(...data.datasets[0].data);
  
  return (
    <View style={[styles.chartContainer, { width, height }, style]}>
      <Text style={styles.chartTitle}>Data Overview</Text>
      <View style={styles.barContainer}>
        {data.labels.map((label, index) => {
          const value = data.datasets[0].data[index];
          const barHeight = (value / maxValue) * (height - 80);
          
          return (
            <View key={index} style={styles.barColumn}>
              <Text style={styles.barValue}>{value}</Text>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: barHeight,
                    backgroundColor: chartConfig.color(0.8)
                  }
                ]} 
              />
              <Text style={styles.barLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Simple Line Chart Component for iOS (alias to BarChart for simplicity)
export const LineChart: React.FC<{
  data: ChartData;
  width: number;
  height: number;
  chartConfig: any;
  bezier?: boolean;
  style?: any;
}> = ({ data, width, height, chartConfig, style }) => {
  return (
    <View style={[styles.chartContainer, { width, height }, style]}>
      <Text style={styles.chartTitle}>Trend Overview</Text>
      <View style={styles.lineContainer}>
        {data.labels.map((label, index) => {
          const value = data.datasets[0].data[index];
          
          return (
            <View key={index} style={styles.linePoint}>
              <Text style={styles.lineValue}>{value}</Text>
              <View 
                style={[
                  styles.lineMarker,
                  { backgroundColor: chartConfig.color(0.8) }
                ]} 
              />
              <Text style={styles.lineLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Simple Pie Chart Component for iOS
export const PieChart: React.FC<{
  data: PieChartData[];
  width: number;
  height: number;
  chartConfig: any;
  accessor: string;
  backgroundColor: string;
  paddingLeft: string;
  center?: number[];
  absolute?: boolean;
  style?: any;
}> = ({ data, width, height, style }) => {
  const total = data.reduce((sum, item) => sum + (item.population || item.points || 0), 0);
  
  return (
    <View style={[styles.chartContainer, { width, height }, style]}>
      <Text style={styles.chartTitle}>Distribution</Text>
      <View style={styles.pieContainer}>
        {data.map((item, index) => {
          const value = item.population || item.points || 0;
          const percentage = ((value / total) * 100).toFixed(1);
          
          return (
            <View key={index} style={styles.pieItem}>
              <View 
                style={[
                  styles.pieColorBox, 
                  { backgroundColor: item.color }
                ]} 
              />
              <Text style={styles.pieLabel}>
                {item.name}: {percentage}% ({value})
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Simple Progress Chart Component for iOS
export const ProgressChart: React.FC<{
  data: ProgressData;
  width: number;
  height: number;
  chartConfig: any;
  strokeWidth?: number;
  radius?: number;
  style?: any;
}> = ({ data, width, height, chartConfig, style }) => {
  return (
    <View style={[styles.chartContainer, { width, height }, style]}>
      <Text style={styles.chartTitle}>Progress Overview</Text>
      <View style={styles.progressContainer}>
        {data.labels.map((label, index) => {
          const value = data.data[index];
          const percentage = (value * 100).toFixed(1);
          
          return (
            <View key={index} style={styles.progressItem}>
              <Text style={styles.progressLabel}>{label}</Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar,
                    { 
                      width: `${value * 100}%`,
                      backgroundColor: chartConfig.color(0.8)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressValue}>{percentage}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  // Bar Chart Styles
  barContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    flex: 1,
    paddingHorizontal: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    width: 30,
    backgroundColor: '#330066',
    borderRadius: 4,
    marginVertical: 4,
    minHeight: 5,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    transform: [{ rotate: '-45deg' }],
  },
  
  // Pie Chart Styles
  pieContainer: {
    flex: 1,
  },
  pieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pieColorBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 12,
  },
  pieLabel: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
  },
  
  // Progress Chart Styles
  progressContainer: {
    flex: 1,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#330066',
    borderRadius: 4,
  },
  progressValue: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  
  // Line Chart Styles
  lineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  linePoint: {
    alignItems: 'center',
    flex: 1,
  },
  lineValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  lineMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#330066',
    marginVertical: 8,
  },
  lineLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
