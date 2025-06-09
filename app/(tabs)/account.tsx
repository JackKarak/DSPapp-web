// app/(tabs)/account.tsx
import { Button, Image, Text, View } from 'react-native';

export default function AccountTab() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Image
        source={{ uri: 'https://via.placeholder.com/100' }}
        style={{ width: 100, height: 100, borderRadius: 50 }}
      />
      <Text style={{ marginTop: 10 }}>👤 Name: John Doe</Text>
      <Text>Pledge Class: Alpha Beta</Text>
      <Text>Past Events Attended: 12</Text>
      <Button title="📚 Upload to Test Bank" onPress={() => console.log('Upload')} />
    </View>
  );
}
