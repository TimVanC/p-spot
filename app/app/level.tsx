import { View, Text, StyleSheet } from 'react-native';

export default function LevelScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Level Progress</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, fontWeight: '600' },
});
