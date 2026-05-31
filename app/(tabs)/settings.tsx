import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { clearAllTasks } from '@/services/storageService';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SPACING = { xs: 4, sm: 8, md: 16, lg: 24 } as const;

type SettingRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  icon?: React.ReactNode;
  showChevron?: boolean;
};

function SettingRow({ label, value, onPress, destructive, icon, showChevron }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : null}
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
        {label}
      </Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {showChevron ? (
        <MaterialIcons name="chevron-right" size={20} color={Colors.outline} />
      ) : null}
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleSuggest = () => {
    Linking.openURL(
      'mailto:mail2me.shivang@gmail.com?subject=MindSweep%20Suggestion&body=Hi%20Shivang%2C%0A%0A'
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Tasks',
      'This will permanently delete all saved tasks. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllTasks();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={contentStyle}>

          {/* AI */}
          <Section title="AI">
            <SettingRow
              label="Powered by Groq"
              value="AI Ready"
              icon={<MaterialIcons name="auto-awesome" size={18} color={Colors.primaryLight} />}
            />
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <SettingRow
              label="Theme"
              value="Dark"
              icon={<MaterialIcons name="dark-mode" size={18} color={Colors.outline} />}
            />
          </Section>

          {/* Data */}
          <Section title="Data">
            <SettingRow
              label="Clear All Tasks"
              onPress={handleClearAll}
              destructive
              icon={<MaterialIcons name="delete-outline" size={18} color={Colors.error} />}
              showChevron
            />
          </Section>

          {/* About */}
          <Section title="About">
            <SettingRow
              label="App"
              value="MindSweep"
              icon={<MaterialIcons name="info-outline" size={18} color={Colors.outline} />}
            />
            <View style={styles.divider} />
            <SettingRow
              label="Version"
              value="1.0.0"
              icon={<MaterialIcons name="tag" size={18} color={Colors.outline} />}
            />
            <View style={styles.divider} />
            <SettingRow
              label="Built with"
              value="Expo + Groq AI"
              icon={<MaterialIcons name="code" size={18} color={Colors.outline} />}
            />
            <View style={styles.divider} />
            <SettingRow
              label="Creator"
              value="Shivang Rai"
              icon={<MaterialIcons name="person-outline" size={18} color={Colors.outline} />}
            />
          </Section>

          {/* Feedback */}
          <Section title="Feedback">
            <SettingRow
              label="Share Suggestions"
              onPress={handleSuggest}
              icon={<MaterialIcons name="email" size={18} color={Colors.primaryLight} />}
              showChevron
            />
          </Section>

        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.onSurface,
    letterSpacing: -0.8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: SPACING.lg,
    paddingBottom: 110,
  },
  section: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.outline,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  rowIcon: {
    width: 24,
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  rowLabelDestructive: {
    color: Colors.error,
  },
  rowValue: {
    fontSize: 14,
    color: Colors.outline,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginLeft: 48,
  },
});
