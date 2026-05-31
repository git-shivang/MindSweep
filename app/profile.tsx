import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { loadTasks, StoredTask } from '@/services/storageService';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SPACING = { xs: 4, sm: 8, md: 16, lg: 24 } as const;

// ── Stats calculation ────────────────────────────────────────────

type Stats = {
  total: number;
  completed: number;
  completionRate: number;
  topPriority: 'High' | 'Medium' | 'Low' | '—';
  storageBytes: number;
  lastSyncLabel: string;
};

function calcStats(tasks: StoredTask[]): Stats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const priorityCounts = { High: 0, Medium: 0, Low: 0 };
  tasks.forEach((t) => { priorityCounts[t.priority]++; });
  const topPriority = total > 0
    ? (Object.entries(priorityCounts).sort((a, b) => b[1] - a[1])[0][0] as 'High' | 'Medium' | 'Low')
    : '—';

  const storageBytes = new TextEncoder().encode(JSON.stringify(tasks)).length;

  const newest = tasks.reduce((max, t) => Math.max(max, t.createdAt), 0);
  const lastSyncLabel = newest > 0
    ? new Date(newest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never';

  return { total, completed, completionRate, topPriority, storageBytes, lastSyncLabel };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ── Sub-components ───────────────────────────────────────────────

function StatCard({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function ActionRow({
  icon,
  label,
  sublabel,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.actionIcon, destructive && styles.actionIconDestructive]}>
        <MaterialIcons
          name={icon as any}
          size={18}
          color={destructive ? Colors.error : Colors.primaryLight}
        />
      </View>
      <View style={styles.actionText}>
        <Text style={[styles.actionLabel, destructive && { color: Colors.error }]}>{label}</Text>
        {sublabel ? <Text style={styles.actionSublabel}>{sublabel}</Text> : null}
      </View>
      <MaterialIcons name="chevron-right" size={20} color={Colors.outline} />
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<StoredTask[]>([]);
  const [loading, setLoading] = useState(true);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);

  useEffect(() => {
    loadTasks().then((t) => {
      setTasks(t);
      setLoading(false);
      opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    });
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const stats = calcStats(tasks);

  const handleViewCompleted = () => {
    router.push('/(tabs)/tasks');
  };

  const exportFile = async (filename: string, content: string, mimeType: string, dialogTitle: string) => {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Not supported', 'Sharing is not available on this device or Expo Go. Use a development build to export files.');
      return;
    }

    const dir = FileSystem.cacheDirectory;
    if (!dir) {
      Alert.alert('Export failed', 'Cache directory is unavailable on this device.');
      return;
    }

    try {
      const path = dir + filename;
      await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType, dialogTitle, UTI: mimeType });
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'An unknown error occurred.');
    }
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(tasks, null, 2);
    exportFile('mindsweep_tasks.json', json, 'application/json', 'Export Tasks (JSON)');
  };

  const handleExportCSV = () => {
    const header = 'Title,Priority,Due Date,Status,Created\n';
    const rows = tasks.map((t) =>
      [
        `"${t.title.replace(/"/g, '""')}"`,
        t.priority,
        t.dueDate,
        t.completed ? 'Completed' : 'Pending',
        new Date(t.createdAt).toLocaleDateString('en-US'),
      ].join(',')
    ).join('\n');
    exportFile('mindsweep_tasks.csv', header + rows, 'text/csv', 'Export Tasks (CSV)');
  };

  const priorityColor: Record<string, string> = {
    High: Colors.priorityHigh,
    Medium: Colors.priorityMedium,
    Low: Colors.priorityLow,
    '—': Colors.outline,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} activeOpacity={0.7}>
          <MaterialIcons name="close" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        <Animated.View style={contentStyle}>

          {/* ── Avatar ── */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>SR</Text>
            </View>
            <Text style={styles.displayName}>Shivang Rai</Text>
            <Text style={styles.displaySub}>MindSweep User</Text>
          </View>

          {/* ── Stats ── */}
          <SectionHeader title="Your Stats" />
          <View style={styles.statsGrid}>
            <StatCard value={String(stats.total)} label="Tasks Created" />
            <StatCard value={String(stats.completed)} label="Completed" accent={Colors.success} />
            <StatCard value={`${stats.completionRate}%`} label="Completion Rate" accent={Colors.primaryLight} />
            <StatCard
              value={stats.topPriority}
              label="Top Priority"
              accent={priorityColor[stats.topPriority]}
            />
          </View>

          {/* ── Quick Actions ── */}
          <SectionHeader title="Quick Actions" />
          <View style={styles.card}>
            <ActionRow
              icon="check-circle-outline"
              label="View Completed Tasks"
              sublabel={`${stats.completed} task${stats.completed === 1 ? '' : 's'} done`}
              onPress={handleViewCompleted}
            />
            <View style={styles.divider} />
            <ActionRow
              icon="file-download"
              label="Export as JSON"
              sublabel="Full task data"
              onPress={handleExportJSON}
            />
            <View style={styles.divider} />
            <ActionRow
              icon="table-chart"
              label="Export as CSV"
              sublabel="Open in spreadsheet"
              onPress={handleExportCSV}
            />
          </View>

          {/* ── Account Info ── */}
          <SectionHeader title="Account" />
          <View style={styles.card}>
            <InfoRow label="App" value="MindSweep" />
            <View style={styles.divider} />
            <InfoRow label="Version" value="1.0.0" />
            <View style={styles.divider} />
            <InfoRow label="Last Task Added" value={stats.lastSyncLabel} />
            <View style={styles.divider} />
            <InfoRow label="Storage Used" value={loading ? '—' : formatBytes(stats.storageBytes)} />
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  navSpacer: { width: 36 },

  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textInverse,
    letterSpacing: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  displaySub: {
    fontSize: 14,
    color: Colors.outline,
  },

  // Section header
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.outline,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginLeft: 4,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.outline,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginLeft: 52,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(192, 193, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDestructive: {
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
  },
  actionText: { flex: 1, gap: 2 },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  actionSublabel: {
    fontSize: 12,
    color: Colors.outline,
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.outline,
    fontWeight: '400',
  },
});
