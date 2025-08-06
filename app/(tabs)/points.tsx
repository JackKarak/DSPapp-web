import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const POINT_REQUIREMENTS: Record<string, number> = {
  brotherhood: 10,
  professional: 5,
  service: 5,
  scholarship: 5,
  health: 3,
  fundraising: 3,
  dei: 3,
};

export default function PointsScreen() {
  const [pointsByCategory, setPointsByCategory] = useState<Record<string, number>>({});
  const [pillarsMet, setPillarsMet] = useState(0);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('User fetch error:', userError);
        setLoading(false);
        return;
      }

      const { data: attended, error: attendedError } = await supabase
        .from('event_attendance')
        .select('event_id')
        .eq('user_id', user.id);

      const { data: registered, error: registeredError } = await supabase
        .from('event_registration')
        .select('event_id')
        .eq('user_id', user.id);

      if (attendedError || registeredError) {
        console.error('Fetch error:', attendedError || registeredError);
        setLoading(false);
        return;
      }

      const attendedEventIds = attended.map((a) => a.event_id);
      const registeredEventIds = registered.map((r) => r.event_id);
      const uniqueEventIds = [...new Set(attendedEventIds)];

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, point_type, point_value')
        .in('id', uniqueEventIds);

      if (eventsError) {
        console.error('Events error:', eventsError);
        setLoading(false);
        return;
      }

      const categoryPoints: Record<string, number> = {};

      events.forEach((event) => {
        const wasRegistered = registeredEventIds.includes(event.id);
        // Use actual point value from database, with bonus for registration
        const basePoints = event.point_value || 1;
        const pointsEarned = wasRegistered ? basePoints * 1.5 : basePoints;
        const category = event.point_type;

        if (category) {
          categoryPoints[category] = (categoryPoints[category] || 0) + pointsEarned;
        }
      });

      const metCount = Object.entries(POINT_REQUIREMENTS).reduce((count, [cat, required]) => {
        return (categoryPoints[cat] || 0) >= required ? count + 1 : count;
      }, 0);

      setPointsByCategory(categoryPoints);
      setPillarsMet(metCount);
      if (metCount >= Object.keys(POINT_REQUIREMENTS).length) {
        setTriggerConfetti(true);
      }

      setLoading(false);
    };

    fetchPoints();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.grayText}>Loading point data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Point Audit</Text>
      <Text style={styles.subtitle}>
        {pillarsMet} of {Object.keys(POINT_REQUIREMENTS).length} pillars met
      </Text>

      {/* Table Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>Category</Text>
        <Text style={styles.headerCell}>Earned</Text>
        <Text style={styles.headerCell}>Required</Text>
        <Text style={styles.headerCell}>Met</Text>
      </View>

      {/* Table Rows */}
      {Object.entries(POINT_REQUIREMENTS).map(([category, required]) => {
        const earned = pointsByCategory[category] || 0;
        const met = earned >= required;

        return (
          <View key={category} style={styles.row}>
            <Text style={styles.cell}>{category}</Text>
            <Text style={styles.cell}>{earned.toFixed(1)}</Text>
            <Text style={styles.cell}>{required}</Text>
            <View style={styles.iconCell}>
              {met ? (
                <FontAwesome name="check-circle" size={16} color="green" />
              ) : (
                <FontAwesome name="times-circle" size={16} color="red" />
              )}
            </View>
          </View>
        );
      })}

      {triggerConfetti && <ConfettiCannon count={150} origin={{ x: 200, y: -20 }} fadeOut={true} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
  },
  iconCell: {
    width: 24,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grayText: {
    marginTop: 8,
    color: '#888',
  },
});
