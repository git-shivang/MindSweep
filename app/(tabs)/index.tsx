import { Colors } from '@/constants/colors';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const [thoughts, setThoughts] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>MindSweep</Text>
      <Text style={styles.subtitle}>Clear your mind, capture your tasks</Text>

      <TextInput
        style={styles.input}
        multiline
        placeholder="Type or speak your thoughts..."
        placeholderTextColor={Colors.textOnDarkTertiary}
        value={thoughts}
        onChangeText={setThoughts}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.85}
        onPress={() => router.push('/tasks')}>
        <Text style={styles.buttonText}>Sweep It</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 80,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.textOnDark,
    letterSpacing: -0.5,
    marginTop: -24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textOnDarkSecondary,
    marginBottom: 32,
  },
  input: {
    height: 200,
    backgroundColor: Colors.cardBackgroundDark,
    borderWidth: 1.5,
    borderColor: Colors.cardBorderDark,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textOnDark,
    marginBottom: 28,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
