import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [thoughts, setThoughts] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MindSweep</Text>

      <TextInput
        style={styles.input}
        multiline
        placeholder="Type or speak your thoughts..."
        placeholderTextColor="#999"
        value={thoughts}
        onChangeText={setThoughts}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.push('/tasks')}>
        <Text style={styles.buttonText}>Sweep It</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  input: {
    height: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4a90d9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
