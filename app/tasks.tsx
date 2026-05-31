import { Colors } from '@/constants/colors';
import { ExtractedTask } from '@/services/groqService';
import { useRouter } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

type Priority = 'High' | 'Medium' | 'Low';

type TasksRouteParams = {
  tasks?: string | string[];
};

type Task = {
  id: string;
  title: string;
  dueDate: string;
  priority: Priority;
  completed: boolean;
  createdAt: number;
};

function mapExtractedToTasks(extracted: ExtractedTask[]): Task[] {
  const now = Date.now();
  return extracted.map((item, index) => ({
    id: `${now}-${index}`,
    title: item.title,
    dueDate: item.dueDate ?? 'No due date',
    priority: item.priority,
    completed: false,
    createdAt: now + index,
  }));
}

function parseTasksFromParams(tasksParam: string | string[] | undefined): Task[] | null {
  const raw = Array.isArray(tasksParam) ? tasksParam[0] : tasksParam;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ExtractedTask[];
    if (!Array.isArray(parsed)) {
      return null;
    }
    return mapExtractedToTasks(parsed);
  } catch {
    return null;
  }
}

const MOCK_TASKS: Task[] = [
  {
    id: '1735689600001',
    title: 'Call Rahul',
    dueDate: 'Tomorrow',
    priority: 'High',
    completed: false,
    createdAt: 1735689600001,
  },
  {
    id: '1735776000002',
    title: 'Submit BI report',
    dueDate: 'Friday',
    priority: 'High',
    completed: false,
    createdAt: 1735776000002,
  },
  {
    id: '1735862400003',
    title: 'Buy groceries',
    dueDate: 'No due date',
    priority: 'Low',
    completed: true,
    createdAt: 1735862400003,
  },
];

const PRIORITY_STYLES: Record<Priority, { backgroundColor: string; color: string }> = {
  High: { backgroundColor: Colors.priorityHigh, color: Colors.textInverse },
  Medium: { backgroundColor: Colors.priorityMedium, color: Colors.textPrimary },
  Low: { backgroundColor: Colors.priorityLow, color: Colors.textInverse },
};

function formatCreatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function animateLayout() {
  LayoutAnimation.configureNext({
    duration: 300,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.spring,
      springDamping: 0.82,
    },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
}

type TaskCardProps = {
  task: Task;
  isExpanded: boolean;
  onPress: () => void;
  onToggleComplete: () => void;
};

function TaskCard({ task, isExpanded, onPress, onToggleComplete }: TaskCardProps) {
  const badge = PRIORITY_STYLES[task.priority];

  return (
    <TouchableOpacity
      style={[styles.card, isExpanded && styles.cardExpanded]}
      onPress={onPress}
      activeOpacity={0.92}>
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.checkboxHitArea}
          onPress={onToggleComplete}
          activeOpacity={0.7}>
          <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
            {task.completed ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
        </TouchableOpacity>

        <Text
          style={[styles.taskTitle, task.completed && styles.taskTitleComplete]}
          numberOfLines={isExpanded ? undefined : 1}>
          {task.title}
        </Text>

        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{task.priority}</Text>
        </View>
      </View>

      {!isExpanded && task.dueDate ? (
        <Text style={styles.dueDatePreview}>Due: {task.dueDate}</Text>
      ) : null}

      {isExpanded ? (
        <View style={styles.expandedContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Title</Text>
            <Text style={styles.detailValue}>{task.title}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due date</Text>
            <Text style={styles.detailValue}>{task.dueDate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Priority</Text>
            <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{task.priority}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created on</Text>
            <Text style={styles.detailValue}>{formatCreatedAt(task.createdAt)}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.editButton} activeOpacity={0.7}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} activeOpacity={0.7}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const route = useRoute();
  const routeParams = route.params as TasksRouteParams | undefined;
  const tasksParam = routeParams?.tasks;

  const initialTasks = useMemo(
    () => parseTasksFromParams(tasksParam) ?? MOCK_TASKS,
    [tasksParam],
  );

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const parsed = parseTasksFromParams(tasksParam);
    if (parsed) {
      setTasks(parsed);
      setExpandedId(null);
    } else if (!tasksParam) {
      setTasks(MOCK_TASKS);
      setExpandedId(null);
    }
  }, [tasksParam]);

  const handleCardPress = (id: string) => {
    animateLayout();
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleToggleComplete = (id: string) => {
    animateLayout();
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Your Tasks</Text>
        <Text style={styles.subtitle}>
          {tasks.length} task{tasks.length === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        extraData={tasks}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            isExpanded={expandedId === item.id}
            onPress={() => handleCardPress(item.id)}
            onToggleComplete={() => handleToggleComplete(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    paddingTop: 72,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textOnDark,
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textOnDarkSecondary,
  },
  list: {
    paddingBottom: SPACING.xl,
  },
  separator: {
    height: SPACING.md,
  },
  card: {
    backgroundColor: Colors.cardBackgroundDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorderDark,
    padding: SPACING.lg,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  checkboxHitArea: {
    paddingTop: 2,
  },
  taskTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textOnDark,
    lineHeight: 24,
  },
  taskTitleComplete: {
    textDecorationLine: 'line-through',
    color: Colors.textOnDarkTertiary,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dueDatePreview: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: Colors.textOnDarkSecondary,
  },
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorderDark,
    gap: SPACING.md,
  },
  detailRow: {
    gap: SPACING.xs,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textOnDarkTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.textOnDark,
    lineHeight: 22,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  editButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDarkElevated,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
});
