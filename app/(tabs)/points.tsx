import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
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
  const [ranking, setRanking] = useState<number | null>(null);
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

      const { data: pointData, error: pointError } = await supabase
        .from('points')
        .select('user_id, category, points');

      if (pointError || !pointData) {
        console.error('Error fetching points:', pointError);
        setLoading(false);
        return;
      }

      const userPoints: Record<string, number> = {};
      let totalPoints = 0;
      const userTotals: Record<string, number> = {};

      pointData.forEach(({ user_id, category, points }) => {
        if (user_id === user.id) {
          userPoints[category] = (userPoints[category] || 0) + points;
          totalPoints += points;
        }
        userTotals[user_id] = (userTotals[user_id] || 0) + points;
      });

      const metCount = Object.entries(POINT_REQUIREMENTS).reduce((count, [cat, required]) => {
        return userPoints[cat] >= required ? count + 1 : count;
      }, 0);

      // Determine ranking
      const sorted = Object.entries(userTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([uid]) => uid);
      const place = sorted.indexOf(user.id) + 1;

      setPointsByCategory(userPoints);
      setPillarsMet(metCount);
      setRanking(place);

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
      <Text style={styles.rank}>You are currently #{ranking} in total points</Text>

      {/* Header Row */}
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
            <Text style={styles.cell}>{earned}</Text>
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
    marginBottom: 4,
  },
  rank: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    color: '#330066',
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
