// app/(tabs)/newsletter.tsx
import { ScrollView, Text } from 'react-native';

export default function NewsletterTab() {
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>📰 Weekly Newsletter</Text>
      <Text style={{ marginTop: 10 }}>
        [Insert your newsletter content here or load from Supabase]
      </Text>
    </ScrollView>
  );
}
