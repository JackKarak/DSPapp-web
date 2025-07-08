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

type Event = {
  point_value: number;
  attendees: string[];
  rating: number | null;
  category: string;
};

const screenWidth = Dimensions.get('window').width;

export default function OfficerAnalytics() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [averageSize, setAverageSize] = useState<number>(0);
  const [pointDistribution, setPointDistribution] = useState<
    { name: string; points: number; color: string; legendFontColor: string; legendFontSize: number }[]
  >([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('events')
        .select('point_value, attendees, rating, category')
        .eq('status', 'approved');

      if (error || !data) {
        console.error('Error loading events:', error?.message);
        setLoading(false);
        return;
      }

      setEvents(data);

      const ratings = data.map((e) => e.rating).filter((r): r is number => r !== null);
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length || 0;
      setAverageRating(avgRating);

      const sizes = data.map((e) => e.attendees?.length || 0);
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length || 0;
      setAverageSize(avgSize);

      const totals: Record<string, number> = {};
      data.forEach((e) => {
        totals[e.category] = (totals[e.category] || 0) + e.point_value;
      });

      const formattedData = Object.entries(totals).map(([name, points], i) => ({
        name,
        points,
        color: pieColors[i % pieColors.length],
        legendFontColor: '#333',
        legendFontSize: 13,
      }));

      setPointDistribution(formattedData);
      setLoading(false);
    };

    fetchAnalytics();
  }, []);

  const renderStars = (rating: number) => {
    const fullStars = Math.round(rating);
    return (
      <View style={styles.starContainer}>
        {[...Array(5)].map((_, i) => (
          <Ionicons
            key={i}
            name={i < fullStars ? 'star' : 'star-outline'}
            size={20}
            color="#F7B910"
          />
        ))}
        <Text style={styles.metricValue}> ({rating.toFixed(1)})</Text>
      </View>
    );
  };

  return (
    <ImageBackground source={backgroundImg} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>📊 Officer Analytics</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#330066" />
        ) : (
          <>
            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>⭐ Average Event Rating</Text>
              {renderStars(averageRating)}
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>👥 Average Event Size</Text>
              <Text style={styles.metricValue}>{averageSize.toFixed(1)} attendees</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>📈 Point Distribution</Text>

              <PieChart
                data={pointDistribution}
                width={screenWidth}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor={'points'}
                backgroundColor={'transparent'}
                paddingLeft={'15'}
                absolute
              />
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricTitle}>📅 Total Events</Text>
              <Text style={styles.metricValue}>{events.length} events</Text>
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
    backgroundColor: 'rgba(242, 242, 255, 0.6)', // mostly transparent lavender
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
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
