import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import backgroundImg from '../../assets/images/background.png';

const screenWidth = Dimensions.get('window').width;

export default function PresidentAnalytics() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgAttendance, setAvgAttendance] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [topEventType, setTopEventType] = useState('');
  const [distribution, setDistribution] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: events, error } = await supabase
        .from('events')
        .select('attendees, category, point_value')
        .eq('status', 'approved');

      if (error || !events) {
        console.error('Error fetching events:', error?.message);
        setLoading(false);
        return;
      }

      setData(events);
      setEventCount(events.length);

      const totalAttendance = events.reduce((sum, ev) => sum + (ev.attendees?.length || 0), 0);
      setAvgAttendance(events.length ? totalAttendance / events.length : 0);

      const categoryCounts: Record<string, number> = {};
      const categoryPoints: Record<string, number> = {};

      events.forEach((ev) => {
        if (!ev.category) return;
        categoryCounts[ev.category] = (categoryCounts[ev.category] || 0) + 1;
        categoryPoints[ev.category] = (categoryPoints[ev.category] || 0) + (ev.point_value || 0);
      });

      const mostCommon = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
      setTopEventType(mostCommon ? mostCommon[0] : 'N/A');

      const formatted = Object.entries(categoryPoints).map(([key, value], i) => ({
        name: key,
        population: value,
        color: pieColors[i % pieColors.length],
        legendFontColor: '#333',
        legendFontSize: 13,
      }));

      setDistribution(formatted);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <ImageBackground source={backgroundImg} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>📊 Presidential Overview</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#330066" />
        ) : (
          <>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>📅 Total Events</Text>
              <Text style={styles.metricValue}>{eventCount}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>👥 Average Attendance</Text>
              <Text style={styles.metricValue}>{avgAttendance.toFixed(1)} attendees</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>🏆 Most Common Event Type</Text>
              <Text style={styles.metricValue}>{topEventType}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>🎯 Point Distribution</Text>
              <PieChart
                data={distribution}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  color: () => '#330066',
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute
              />
            </View>
          </>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const pieColors = ['#FF6384', '#36A2EB', '#FFCE56', '#00C49F', '#8A2BE2', '#FFA07A'];

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0038A8',
    textAlign: 'center',
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: '#f2f2ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderColor: '#ADAFAA',
    borderWidth: 1,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330066',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0038A8',
  },
});
