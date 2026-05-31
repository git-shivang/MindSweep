import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import {
  ExtractedTask,
  extractTasksFromGroq,
  GroqServiceError,
  transcribeAudio,
} from '@/services/groqService';
import { loadTasks, saveTasks, StoredTask } from '@/services/storageService';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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

// ── Waveform ────────────────────────────────────────────────────
const NUM_BARS = 20;
const BAR_MIN_H = 3;
const BAR_MAX_H = 28;

function WaveBar({
  tick,
  amplitude,
  index,
}: {
  tick: SharedValue<number>;
  amplitude: SharedValue<number>;
  index: number;
}) {
  const centerFactor =
    1 - Math.abs(index - (NUM_BARS - 1) / 2) / ((NUM_BARS - 1) / 2);
  const phaseOffset = (index / NUM_BARS) * Math.PI * 3.5;

  const style = useAnimatedStyle(() => {
    const wave = Math.abs(Math.sin(tick.value + phaseOffset));
    const h = BAR_MIN_H + (BAR_MAX_H - BAR_MIN_H) * (0.25 + centerFactor * 0.75) * wave * amplitude.value;
    return { height: Math.max(BAR_MIN_H, h) };
  });

  return <Animated.View style={[waveBarStyle, style]} />;
}

const waveBarStyle: object = {
  width: 1,
  borderRadius: 1,
  backgroundColor: '#c7d2fe',
  alignSelf: 'flex-end',
  shadowColor: '#818cf8',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 1,
  shadowRadius: 5,
};

function Waveform({
  tick,
  amplitude,
}: {
  tick: SharedValue<number>;
  amplitude: SharedValue<number>;
}) {
  return (
    <View style={waveformStyle}>
      {Array.from({ length: NUM_BARS }, (_, i) => (
        <WaveBar key={i} tick={tick} amplitude={amplitude} index={i} />
      ))}
    </View>
  );
}

const waveformStyle: object = {
  flexDirection: 'row',
  alignItems: 'flex-end',
  gap: 1.5,
  height: BAR_MAX_H + 4,
  marginTop: 10,
};
// ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const [thoughts, setThoughts] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [savedTaskCount, setSavedTaskCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingStartRef = useRef<number>(0);

  // ── Animations ──────────────────────────────────────────────
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);
  const micScale = useSharedValue(1);
  const micOpacity = useSharedValue(1);
  const sweepScale = useSharedValue(1);
  const waveTick = useSharedValue(0);
  const waveAmplitude = useSharedValue(0);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, []);

  useEffect(() => {
    if (isRecording) {
      waveAmplitude.value = withTiming(1, { duration: 300 });
      waveTick.value = withRepeat(
        withTiming(Math.PI * 2, { duration: 1200, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      waveAmplitude.value = withTiming(0, { duration: 400 });
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      micScale.value = withRepeat(
        withSequence(withTiming(1.18, { duration: 650 }), withTiming(1, { duration: 650 })),
        -1,
      );
      micOpacity.value = withRepeat(
        withSequence(withTiming(0.65, { duration: 650 }), withTiming(1, { duration: 650 })),
        -1,
      );
    } else {
      micScale.value = withSpring(1, { damping: 12 });
      micOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
    opacity: micOpacity.value,
  }));

  const sweepAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sweepScale.value }],
  }));
  // ────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      loadTasks().then((tasks) => setSavedTaskCount(tasks.length));
    }, []),
  );

  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const handleSweepIt = async () => {
    const brainDump = thoughts.trim();
    if (!brainDump || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/tasks');
    } catch (err) {
      setExtractedTasks([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      recordingStartRef.current = Date.now();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsRecording(true);
    } catch {
      setError('Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    setIsRecording(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
    if (isRecording) stopRecording();
    else startRecording();
  };

  const micDisabled = loading || isTranscribing;
  const sweepDisabled = loading || isRecording || isTranscribing;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* ── Header bar ────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
          <MaterialIcons name="menu" size={24} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>

        <Text style={styles.headerBrand}>MindSweep</Text>

        <TouchableOpacity style={styles.avatar} activeOpacity={0.8}>
          <MaterialIcons name="person" size={20} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* ── Main content ──────────────────────────────────── */}
      <Animated.View style={[styles.content, contentStyle]}>

        <View style={styles.headingBlock}>
          <View style={styles.brandIconWrap}>
            <MaterialCommunityIcons name="brain" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>MindSweep</Text>
          <Text style={styles.subtitle}>Speak or type — we'll handle the rest</Text>
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              isInputFocused && styles.inputFocused,
              isRecording && styles.inputRecording,
            ]}
            multiline
            placeholder={"Dump your thoughts here...\nAI will extract the tasks."}
            placeholderTextColor={Colors.outline}
            value={thoughts}
            onChangeText={setThoughts}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            textAlignVertical="top"
            editable={!loading && !isTranscribing}
          />

          <View style={styles.micColumn}>
            <Animated.View style={micAnimatedStyle}>
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonActive]}
                onPress={handleMicPress}
                disabled={micDisabled}
                activeOpacity={0.8}>
                {isTranscribing ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <MaterialIcons
                    name={isRecording ? 'mic-off' : 'mic'}
                    size={22}
                    color={Colors.textInverse}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
            {isRecording ? <Waveform tick={waveTick} amplitude={waveAmplitude} /> : null}
          </View>
        </View>

        {isRecording ? (
          <View style={styles.statusRow}>
            <View style={styles.recordingDot} />
            <Text style={styles.statusText}>Recording — tap mic to stop</Text>
          </View>
        ) : isTranscribing ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={Colors.primaryLight} style={{ marginRight: 8 }} />
            <Text style={styles.statusText}>Transcribing your voice...</Text>
          </View>
        ) : (
          <View style={styles.statusRow} />
        )}

        <Animated.View style={sweepAnimatedStyle}>
          <TouchableOpacity
            style={[styles.button, sweepDisabled && styles.buttonDisabled]}
            activeOpacity={0.88}
            onPress={handleSweepIt}
            onPressIn={() => { sweepScale.value = withSpring(0.97, { damping: 15 }); }}
            onPressOut={() => { sweepScale.value = withSpring(1, { damping: 12 }); }}
            disabled={sweepDisabled}>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.textInverse} />
                <Text style={styles.loadingText}>Analyzing thoughts...</Text>
              </View>
            ) : (
              <View style={styles.buttonInner}>
                <MaterialCommunityIcons name="broom" size={20} color={Colors.textInverse} />
                <Text style={styles.buttonText}>Sweep It</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {savedTaskCount > 0 ? (
          <TouchableOpacity
            style={styles.viewTasksButton}
            activeOpacity={0.8}
            onPress={() => router.push('/tasks')}>
            <MaterialIcons name="history" size={18} color={Colors.onSurfaceVariant} />
            <Text style={styles.viewTasksText}>
              View saved tasks ({savedTaskCount})
            </Text>
          </TouchableOpacity>
        ) : null}

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──────────────────────────────────────────────────
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Main content ────────────────────────────────────────────
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headingBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandIconWrap: {
    marginBottom: 3,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.onSurface,
    letterSpacing: -2,
    lineHeight: 56,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    lineHeight: 24,
    textAlign: 'center',
  },

  // ── Input ───────────────────────────────────────────────────
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    height: 120,
    backgroundColor: '#0c0f14',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.onSurface,
  },
  inputFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  inputRecording: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },

  // ── Mic column (button + waveform) ──────────────────────────
  micColumn: {
    width: 52,
    alignItems: 'center',
  },

  // ── Mic button ──────────────────────────────────────────────
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  micButtonActive: {
    backgroundColor: Colors.error,
    shadowColor: Colors.error,
  },

  // ── Status ──────────────────────────────────────────────────
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    marginBottom: 16,
    paddingLeft: 2,
  },
  recordingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.error,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },

  // ── Sweep button ────────────────────────────────────────────
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 7,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Error ───────────────────────────────────────────────────
  errorText: {
    marginTop: 14,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── View tasks ──────────────────────────────────────────────
  viewTasksButton: {
    marginTop: 12,
    paddingVertical: 17,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewTasksText: {
    color: Colors.onSurface,
    fontSize: 15,
    fontWeight: '600',
  },
});
