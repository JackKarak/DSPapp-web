import { useRouter } from 'expo-router';
import { Button, Text, View } from 'react-native';

export default function PointsTab() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>🎯 Points Tracker</Text>
      <Button title="Go to Event Form" onPress={() => router.push('/officer/register')} />
    </View>
  );
}

