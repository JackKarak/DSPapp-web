import { StyleSheet, Text, View } from 'react-native';

export default function PresidentHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👑 Admin Dashboard</Text>
      <Text style={styles.subtitle}>Review events, manage data, and more.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#330066',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#0038A8',
  },
});
