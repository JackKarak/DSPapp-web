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

      {/* Header Row */}
      <View className="flex-row px-2 py-2 bg-gray-100 border-b border-gray-300">
        <Text className="flex-1 font-bold text-sm">Category</Text>
        <Text className="w-20 text-right font-bold text-sm">Earned</Text>
        <Text className="w-20 text-right font-bold text-sm">Required</Text>
        <Text className="w-8 text-right font-bold text-sm">Met</Text>
      </View>

      {/* Table Rows */}
      {Object.entries(POINT_REQUIREMENTS).map(([category, required]) => {
        const earned = pointsByCategory[category] || 0;
        const met = earned >= required;

        return (
          <View
            key={category}
            className="flex-row items-center px-2 py-2 border-b border-gray-200"
          >
            <Text className="flex-1 capitalize text-sm">{category}</Text>
            <Text className="w-20 text-right text-sm">{earned}</Text>
            <Text className="w-20 text-right text-sm">{required}</Text>
            <View className="w-8 items-end">
              {met ? (
                <FontAwesome name="check-circle" size={16} color="green" />
              ) : (
                <FontAwesome name="times-circle" size={16} color="red" />
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
