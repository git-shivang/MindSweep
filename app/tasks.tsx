import { Colors } from '@/constants/colors';
import { ExtractedTask } from '@/services/groqService';
import { deleteTask, loadTasks, StoredTask, updateTask } from '@/services/storageService';
import * as Haptics from 'expo-haptics';
import { useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
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

type Task = StoredTask;

type EditDraft = {
  title: string;
  dueDate: string;
  priority: Priority;
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
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExtractedTask[];
    if (!Array.isArray(parsed)) return null;
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

const PRIORITY_COLORS: Record<Priority, string> = {
  High: Colors.priorityHigh,
  Medium: Colors.priorityMedium,
  Low: Colors.priorityLow,
};

const PRIORITY_TEXT_COLORS: Record<Priority, string> = {
  High: Colors.textInverse,
  Medium: Colors.textPrimary,
  Low: Colors.textInverse,
};

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

function formatCreatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function animateLayout() {
  LayoutAnimation.configureNext({
    duration: 280,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.spring,
      springDamping: 0.85,
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
  isEditing: boolean;
  editDraft: EditDraft;
  onPress: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onEditStart: () => void;
  onEditChange: (field: keyof EditDraft, value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
};

function TaskCard({
  task,
  isExpanded,
  isEditing,
  editDraft,
  onPress,
  onToggleComplete,
  onDelete,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}: TaskCardProps) {
  const priorityColor = PRIORITY_COLORS[task.priority];
  const priorityTextColor = PRIORITY_TEXT_COLORS[task.priority];
  const canSave = editDraft.title.trim().length > 0;

  return (
    <TouchableOpacity
      style={[styles.card, isExpanded && styles.cardExpanded]}
      onPress={onPress}
      activeOpacity={0.9}>

      <View style={[styles.priorityStripe, { backgroundColor: priorityColor }]} />

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

        <View style={[styles.badge, { backgroundColor: priorityColor }]}>
          <Text style={[styles.badgeText, { color: priorityTextColor }]}>{task.priority}</Text>
        </View>
      </View>

      {!isExpanded && task.dueDate && task.dueDate !== 'No due date' ? (
        <Text style={styles.dueDatePreview}>📅 {task.dueDate}</Text>
      ) : null}

      {isExpanded ? (
        <View style={styles.expandedContent}>
          {isEditing ? (
            // ── Edit mode ─────────────────────────────────────
            <View style={styles.editForm}>
              <View style={styles.editField}>
                <Text style={styles.detailLabel}>Title</Text>
                <TextInput
                  style={styles.editInput}
                  value={editDraft.title}
                  onChangeText={(v) => onEditChange('title', v)}
                  placeholder="Task title"
                  placeholderTextColor={Colors.textOnDarkTertiary}
                  multiline
                  autoFocus
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.detailLabel}>Due date</Text>
                <TextInput
                  style={styles.editInput}
                  value={editDraft.dueDate}
                  onChangeText={(v) => onEditChange('dueDate', v)}
                  placeholder="e.g. Tomorrow, Friday, No due date"
                  placeholderTextColor={Colors.textOnDarkTertiary}
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.detailLabel}>Priority</Text>
                <View style={styles.prioritySelector}>
                  {PRIORITIES.map((p) => {
                    const active = editDraft.priority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityPill,
                          { borderColor: PRIORITY_COLORS[p] },
                          active && { backgroundColor: PRIORITY_COLORS[p] },
                        ]}
                        onPress={() => onEditChange('priority', p)}
                        activeOpacity={0.75}>
                        <Text
                          style={[
                            styles.priorityPillText,
                            { color: active ? PRIORITY_TEXT_COLORS[p] : Colors.textOnDarkSecondary },
                          ]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                  onPress={onEditSave}
                  disabled={!canSave}
                  activeOpacity={0.8}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={onEditCancel}
                  activeOpacity={0.75}>
                  <Text style={styles.cancelEditButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // ── View mode ─────────────────────────────────────
            <>
              <View style={styles.detailGrid}>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Due date</Text>
                  <Text style={styles.detailValue}>{task.dueDate}</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Priority</Text>
                  <View style={[styles.badgeSmall, { backgroundColor: priorityColor }]}>
                    <Text style={[styles.badgeText, { color: priorityTextColor }]}>{task.priority}</Text>
                  </View>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Created on</Text>
                  <Text style={styles.detailValue}>{formatCreatedAt(task.createdAt)}</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{task.completed ? 'Done' : 'Pending'}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={onEditStart}
                  activeOpacity={0.75}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={onDelete}
                  activeOpacity={0.75}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🌿</Text>
      <Text style={styles.emptyTitle}>All clear</Text>
      <Text style={styles.emptySubtitle}>
        No tasks yet. Go back and sweep your thoughts to get started.
      </Text>
    </View>
  );
}

const EMPTY_DRAFT: EditDraft = { title: '', dueDate: '', priority: 'Medium' };

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>(EMPTY_DRAFT);

  // ── Animations ──────────────────────────────────────────────
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-12);
  const listOpacity = useSharedValue(0);
  const listTranslateY = useSharedValue(24);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
    headerTranslateY.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
    listOpacity.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) });
    listTranslateY.value = withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const listStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
    transform: [{ translateY: listTranslateY.value }],
  }));
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (tasksParam) return;
    loadTasks().then((stored) => {
      if (stored && stored.length > 0) setTasks(stored);
    });
  }, []);

  useEffect(() => {
    const parsed = parseTasksFromParams(tasksParam);
    if (parsed) {
      setTasks(parsed);
      setExpandedId(null);
      setEditingId(null);
    }
  }, [tasksParam]);

  const completedCount = tasks.filter((t) => t.completed).length;

  const handleCardPress = (id: string) => {
    // Cancel any active edit when the user navigates between cards
    if (editingId) setEditingId(null);
    animateLayout();
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleToggleComplete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateLayout();
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const updated = { ...task, completed: !task.completed };
        updateTask(updated);
        return updated;
      }),
    );
  };

  const handleDelete = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    animateLayout();
    setTasks((prev) => prev.filter((task) => task.id !== id));
    deleteTask(id);
    if (editingId === id) setEditingId(null);
  };

  const handleEditStart = (task: Task) => {
    setEditDraft({ title: task.title, dueDate: task.dueDate, priority: task.priority });
    animateLayout();
    setEditingId(task.id);
  };

  const handleEditChange = (field: keyof EditDraft, value: string) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = (id: string) => {
    if (!editDraft.title.trim()) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const updated: Task = {
      ...task,
      title: editDraft.title.trim(),
      dueDate: editDraft.dueDate.trim() || 'No due date',
      priority: editDraft.priority,
    };

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    animateLayout();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    updateTask(updated);
    setEditingId(null);
  };

  const handleEditCancel = () => {
    animateLayout();
    setEditingId(null);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, headerStyle]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Tasks</Text>
        <Text style={styles.subtitle}>{completedCount}/{tasks.length} completed</Text>
      </Animated.View>

      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <Animated.View style={[styles.listContainer, listStyle]}>
          <FlatList
            data={tasks}
            keyExtractor={(item, index) => item.id ?? `task-${index}`}
            extraData={[tasks, expandedId, editingId, editDraft]}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TaskCard
                task={item}
                isExpanded={expandedId === item.id}
                isEditing={editingId === item.id}
                editDraft={editDraft}
                onPress={() => handleCardPress(item.id)}
                onToggleComplete={() => handleToggleComplete(item.id)}
                onDelete={() => handleDelete(item.id)}
                onEditStart={() => handleEditStart(item)}
                onEditChange={handleEditChange}
                onEditSave={() => handleEditSave(item.id)}
                onEditCancel={handleEditCancel}
              />
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundDark,
    paddingTop: 72,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.textOnDark,
    letterSpacing: -0.8,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textOnDarkSecondary,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  separator: {
    height: 12,
  },
  card: {
    backgroundColor: Colors.cardBackgroundDark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorderDark,
    padding: SPACING.lg,
    paddingLeft: SPACING.lg + 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 7,
  },
  priorityStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  checkboxHitArea: {
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnDark,
    lineHeight: 23,
  },
  taskTitleComplete: {
    textDecorationLine: 'line-through',
    color: Colors.textOnDarkTertiary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dueDatePreview: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: Colors.textOnDarkSecondary,
    marginLeft: 40,
  },
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorderDark,
    gap: SPACING.md,
  },
  // ── View mode ──
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  detailCell: {
    minWidth: '42%',
    flex: 1,
    gap: SPACING.xs,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textOnDarkTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  detailValue: {
    fontSize: 15,
    color: Colors.textOnDark,
    fontWeight: '500',
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  editButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  editButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.backgroundDarkElevated,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  // ── Edit mode ──
  editForm: {
    gap: SPACING.md,
  },
  editField: {
    gap: SPACING.xs + 2,
  },
  editInput: {
    backgroundColor: Colors.backgroundDarkElevated,
    borderWidth: 1.5,
    borderColor: Colors.cardBorderDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textOnDark,
    lineHeight: 22,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  priorityPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelEditButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorderDark,
    alignItems: 'center',
  },
  cancelEditButtonText: {
    color: Colors.textOnDarkSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  // ── Empty state ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textOnDark,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textOnDarkSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
