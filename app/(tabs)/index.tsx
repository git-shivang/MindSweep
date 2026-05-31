import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  ExtractedTask,
  extractTasksFromGroq,
  GroqServiceError,
  transcribeAudio,
} from '@/services/groqService';
import { loadTasks, saveTasks, StoredTask } from '@/services/storageService';
import { Audio } from 'expo-av';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [savedTaskCount, setSavedTaskCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingStartRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      loadTasks().then((tasks) => setSavedTaskCount(tasks.length));
    }, []),
  );

  // Stop any in-progress recording if the component unmounts
  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const handleSweepIt = async () => {
    const brainDump = thoughts.trim();
    if (!brainDump || loading) return;

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

  const startRecording = async () => {
    setError(null);
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission is required for voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      recordingStartRef.current = Date.now();
      setIsRecording(true);
    } catch {
      setError('Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    setIsRecording(false);
    try {
      const elapsed = Date.now() - recordingStartRef.current;
      if (elapsed < 1000) {
        await recording.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
        setError('Recording too short — hold the mic button for at least 1 second.');
        return;
      }

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      recordingRef.current = null;

      const uri = recording.getURI();
      if (!uri) {
        setError('Recording failed — no audio captured. Please try again.');
        return;
      }

      setIsTranscribing(true);
      const transcript = await transcribeAudio(uri);
      setThoughts((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
    } catch (err) {
      if (err instanceof GroqServiceError) {
        setError(err.message);
      } else {
        setError('Transcription failed. Please try again.');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const micDisabled = loading || isTranscribing;
  const sweepDisabled = loading || isRecording || isTranscribing;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>MindSweep</Text>
      <Text style={styles.subtitle}>Clear your mind, capture your tasks</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Type or speak your thoughts..."
          placeholderTextColor={Colors.textOnDarkTertiary}
          value={thoughts}
          onChangeText={setThoughts}
          textAlignVertical="top"
          editable={!loading && !isTranscribing}
        />

        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={handleMicPress}
          disabled={micDisabled}
          activeOpacity={0.75}>
          {isTranscribing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <MaterialIcons
              name={isRecording ? 'mic-off' : 'mic'}
              size={20}
              color={isRecording ? Colors.textInverse : Colors.primary}
            />
          )}
        </TouchableOpacity>
      </View>

      {isRecording ? (
        <Text style={styles.recordingStatus}>● Recording — tap mic to stop</Text>
      ) : isTranscribing ? (
        <Text style={styles.recordingStatus}>Transcribing your voice...</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.button, sweepDisabled && styles.buttonDisabled]}
        activeOpacity={0.85}
        onPress={handleSweepIt}
        disabled={sweepDisabled}>
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
  inputWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  input: {
    height: 200,
    backgroundColor: Colors.cardBackgroundDark,
    borderWidth: 1.5,
    borderColor: Colors.cardBorderDark,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 48,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textOnDark,
  },
  micButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.cardBackgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  recordingStatus: {
    fontSize: 13,
    color: Colors.textOnDarkSecondary,
    marginBottom: 12,
    marginLeft: 4,
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
