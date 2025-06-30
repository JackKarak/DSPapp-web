import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';

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

      const { data, error } = await supabase
        .from('points')
        .select('category, points')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching points:', error);
        setLoading(false);
        return;
      }

      const totals: Record<string, number> = {};
      data.forEach(({ category, points }: { category: string; points: number }) => {
        totals[category] = (totals[category] || 0) + points;
      });

      const metCount = Object.entries(POINT_REQUIREMENTS).reduce((count, [cat, required]) => {
        return totals[cat] >= required ? count + 1 : count;
      }, 0);

      setPointsByCategory(totals);
      setPillarsMet(metCount);
      setLoading(false);
    };

    fetchPoints();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-gray-500">Loading point data...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-2 text-center">Your Point Audit</Text>
      <Text className="text-center text-gray-600 mb-4">
        {pillarsMet} of {Object.keys(POINT_REQUIREMENTS).length} pillars met
      </Text>

      {Object.entries(POINT_REQUIREMENTS).map(([category, required]) => {
        const earned = pointsByCategory[category] || 0;
        const met = earned >= required;
        const percentage = Math.min((earned / required) * 100, 100);

        return (
          <View
            key={category}
            className="mb-4 p-4 rounded-xl border border-gray-300 bg-gray-50 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-base font-semibold capitalize">{category}</Text>
              {met ? (
                <FontAwesome name="check-circle" size={20} color="green" />
              ) : (
                <FontAwesome name="times-circle" size={20} color="red" />
              )}
            </View>

            <View className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
              <View
                className="bg-green-500 h-full"
                style={{ width: `${percentage}%` }}
              />
            </View>

            <Text className="text-sm text-gray-700">
              {earned} / {required} points earned
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
