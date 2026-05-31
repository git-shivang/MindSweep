import { Colors } from '@/constants/colors';
import {
  ExtractedTask,
  extractTasksFromGroq,
  GroqServiceError,
} from '@/services/groqService';
import { loadTasks, saveTasks, StoredTask } from '@/services/storageService';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const [thoughts, setThoughts] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [savedTaskCount, setSavedTaskCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadTasks().then((tasks) => setSavedTaskCount(tasks.length));
    }, []),
  );

  const handleSweepIt = async () => {
    const brainDump = thoughts.trim();
    if (!brainDump || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
  const extracted = await extractTasksFromGroq(brainDump);
  setExtractedTasks(extracted);
  const now = Date.now();
  const tasksToSave: StoredTask[] = extracted.map((item, i) => ({
    id: `${now}-${i}`,
    title: item.title,
    dueDate: item.dueDate ?? 'No due date',
    priority: item.priority,
    completed: false,
    createdAt: now + i,
  }));
  const existing = await loadTasks();
  const merged = [...tasksToSave, ...existing];
  await saveTasks(merged);
  setSavedTaskCount(merged.length);
  setThoughts('');
  router.push('/tasks');
} catch (err) {
  setExtractedTasks([]);

  if (err instanceof GroqServiceError) {
    setError(err.message);
  } else {
    setError('Something went wrong while extracting tasks. Please try again.');
  }
} finally {
  setLoading(false);
}
  };

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
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        activeOpacity={0.85}
        onPress={handleSweepIt}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.textInverse} />
        ) : (
          <Text style={styles.buttonText}>Sweep It</Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {savedTaskCount > 0 ? (
        <TouchableOpacity
          style={styles.viewTasksButton}
          activeOpacity={0.8}
          onPress={() => router.push('/tasks')}>
          <Text style={styles.viewTasksText}>
            View saved tasks ({savedTaskCount})
          </Text>
        </TouchableOpacity>
      ) : null}
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
    justifyContent: 'center',
    minHeight: 54,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    lineHeight: 20,
  },
  viewTasksButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  viewTasksText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
