import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { deleteTask, loadTasks, StoredTask, updateTask } from '@/services/storageService';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

type Priority = 'High' | 'Medium' | 'Low';
type Task = StoredTask;
type EditDraft = { title: string; dueDate: string; priority: Priority };
type FilterType = 'all' | 'incomplete' | 'completed';
type SortType = 'priority' | 'dueDate' | 'status' | 'createdAt';

const PRIORITY_COLORS: Record<Priority, string> = {
  High: Colors.priorityHigh,
  Medium: Colors.priorityMedium,
  Low: Colors.priorityLow,
};

const PRIORITY_CHIP_BG: Record<Priority, string> = {
  High: 'rgba(239, 68, 68, 0.15)',
  Medium: 'rgba(245, 158, 11, 0.15)',
  Low: 'rgba(107, 114, 128, 0.15)',
};

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

function formatCreatedAt(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dueDateScore(dueDate: string): number {
  const d = dueDate.toLowerCase().trim();
  if (d === 'today') return 0;
  if (d === 'tomorrow') return 1;
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const wi = weekdays.indexOf(d);
  if (wi !== -1) return 2 + wi;
  if (d === 'this week') return 10;
  if (d === 'next week') return 20;
  if (d === 'no due date') return 999;
  const parsed = Date.parse(dueDate);
  if (!isNaN(parsed)) return 100 + parsed / 86_400_000;
  return 500;
}

function animateLayout() {
  LayoutAnimation.configureNext({
    duration: 280,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.spring, springDamping: 0.85 },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
}

// ── TaskCard ─────────────────────────────────────────────────────

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
  task, isExpanded, isEditing, editDraft,
  onPress, onToggleComplete, onDelete,
  onEditStart, onEditChange, onEditSave, onEditCancel,
}: TaskCardProps) {
  const pc = PRIORITY_COLORS[task.priority];
  const chipBg = PRIORITY_CHIP_BG[task.priority];
  const canSave = editDraft.title.trim().length > 0;
  const statusColor = task.completed ? Colors.success : Colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isExpanded && { borderColor: pc },
        task.completed && { borderColor: Colors.success + '55' },
      ]}
      onPress={onPress}
      activeOpacity={0.88}>

      <View style={[styles.priorityStripe, { backgroundColor: task.completed ? Colors.success : pc }]} />

      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={onToggleComplete} activeOpacity={0.7} style={styles.checkboxHit}>
          <View style={[
            styles.checkbox,
            { borderColor: isExpanded ? pc : Colors.outlineVariant },
            task.completed && { backgroundColor: Colors.success, borderColor: Colors.success },
          ]}>
            {task.completed ? <MaterialIcons name="check" size={13} color={Colors.textInverse} /> : null}
          </View>
        </TouchableOpacity>

        <View style={styles.titleArea}>
          <Text style={[styles.taskTitle, task.completed && styles.taskTitleComplete]}
            numberOfLines={isExpanded ? undefined : 1}>
            {task.title}
          </Text>
          {task.completed ? (
            <Text style={styles.completedLabel}>Completed</Text>
          ) : !isExpanded && task.dueDate && task.dueDate !== 'No due date' ? (
            <View style={styles.dueDateRow}>
              <MaterialIcons name="event" size={11} color={Colors.outline} />
              <Text style={styles.dueDateText}>{task.dueDate}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.priorityChip, { backgroundColor: chipBg }]}>
          <Text style={[styles.priorityChipText, { color: pc }]}>{task.priority}</Text>
        </View>

        <MaterialIcons
          name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={Colors.outline}
        />
      </View>

      {isExpanded ? (
        <View style={styles.expandedContent}>
          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.editField}>
                <Text style={styles.detailLabel}>TITLE</Text>
                <TextInput
                  style={styles.editInput}
                  value={editDraft.title}
                  onChangeText={(v) => onEditChange('title', v)}
                  placeholder="Task title"
                  placeholderTextColor={Colors.outline}
                  multiline
                  autoFocus
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.detailLabel}>DUE DATE</Text>
                <TextInput
                  style={styles.editInput}
                  value={editDraft.dueDate}
                  onChangeText={(v) => onEditChange('dueDate', v)}
                  placeholder="e.g. Tomorrow, Friday..."
                  placeholderTextColor={Colors.outline}
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.detailLabel}>PRIORITY</Text>
                <View style={styles.prioritySelector}>
                  {PRIORITIES.map((p) => {
                    const active = editDraft.priority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.priorityPill,
                          { borderColor: PRIORITY_COLORS[p] },
                          active && { backgroundColor: PRIORITY_CHIP_BG[p] },
                        ]}
                        onPress={() => onEditChange('priority', p)}
                        activeOpacity={0.75}>
                        <Text style={[styles.priorityPillText, { color: PRIORITY_COLORS[p] }]}>{p}</Text>
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
                <TouchableOpacity style={styles.cancelEditButton} onPress={onEditCancel} activeOpacity={0.75}>
                  <Text style={styles.cancelEditButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.innerPanel}>
                <View style={styles.detailGrid}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>DUE DATE</Text>
                      <Text style={styles.detailValue}>{task.dueDate}</Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>PRIORITY</Text>
                      <Text style={[styles.priorityValue, { color: pc }]}>{task.priority.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>CREATED</Text>
                      <Text style={styles.detailValue}>{formatCreatedAt(task.createdAt)}</Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>STATUS</Text>
                      <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={styles.detailValue}>{task.completed ? 'Done' : 'In Progress'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.editButton} onPress={onEditStart} activeOpacity={0.75}>
                  <MaterialIcons name="edit" size={15} color={Colors.primaryLight} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={onDelete} activeOpacity={0.75}>
                  <MaterialIcons name="delete-outline" size={15} color={Colors.error} />
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

// ── Empty state ───────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🌿</Text>
      <Text style={styles.emptyTitle}>All clear</Text>
      <Text style={styles.emptySubtitle}>No tasks yet. Tap Capture to sweep your thoughts.</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────

const EMPTY_DRAFT: EditDraft = { title: '', dueDate: '', priority: 'Medium' };

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>(EMPTY_DRAFT);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeSort, setActiveSort] = useState<SortType>('status');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Reload from storage every time this tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadTasks().then((stored) => setTasks(stored));
    }, []),
  );

  const counts = useMemo(() => ({
    all: tasks.length,
    incomplete: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  }), [tasks]);

  const filteredAndSorted = useMemo(() => {
    const filtered = tasks.filter((t) => {
      if (activeFilter === 'incomplete') return !t.completed;
      if (activeFilter === 'completed') return t.completed;
      return true;
    });
    return [...filtered].sort((a, b) => {
      switch (activeSort) {
        case 'priority': return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        case 'dueDate':  return dueDateScore(a.dueDate) - dueDateScore(b.dueDate);
        case 'status':   return Number(a.completed) - Number(b.completed);
        case 'createdAt': return b.createdAt - a.createdAt;
      }
    });
  }, [tasks, activeFilter, activeSort]);

  const displayedTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredAndSorted;
    return filteredAndSorted.filter((t) => t.title.toLowerCase().includes(q));
  }, [filteredAndSorted, searchQuery]);

  const closeSearch = () => { setIsSearchActive(false); setSearchQuery(''); };

  // Animations
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

  const completedCount = tasks.filter((t) => t.completed).length;

  const handleCardPress = (id: string) => {
    if (editingId) setEditingId(null);
    animateLayout();
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const handleToggleComplete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateLayout();
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const updated = { ...t, completed: !t.completed };
      updateTask(updated);
      return updated;
    }));
  };

  const handleDelete = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    animateLayout();
    setTasks((prev) => prev.filter((t) => t.id !== id));
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

  const handleEditCancel = () => { animateLayout(); setEditingId(null); };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* ── Nav bar (no back button in tab mode) ── */}
      <Animated.View style={[styles.navBar, headerStyle]}>
        <Text style={styles.navTitle}>MindSweep</Text>
        <TouchableOpacity style={styles.avatar} activeOpacity={0.8} onPress={() => router.push('/profile')}>
          <Text style={styles.avatarInitials}>SR</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Stats header ── */}
      <Animated.View style={[styles.statsHeader, headerStyle]}>
        <View style={styles.statsTopRow}>
          <Text style={styles.statsLabel}>Your Tasks</Text>
          <TouchableOpacity
            onPress={() => (isSearchActive ? closeSearch() : setIsSearchActive(true))}
            activeOpacity={0.7}
            style={styles.searchIconBtn}>
            <MaterialIcons
              name={isSearchActive ? 'close' : 'search'}
              size={22}
              color={isSearchActive ? Colors.primaryLight : Colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.statsCount}>
          <Text style={styles.statsCountAccent}>{completedCount}/{tasks.length} </Text>
          completed
        </Text>
        {isSearchActive ? (
          <TextInput
            style={styles.searchBar}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tasks by name..."
            placeholderTextColor={Colors.outline}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        ) : null}
      </Animated.View>

      {/* ── List ── */}
      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <Animated.View style={[styles.listContainer, listStyle]}>

          {/* Filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}>
            {([
              { key: 'all', label: 'All' },
              { key: 'incomplete', label: 'Incomplete' },
              { key: 'completed', label: 'Completed' },
            ] as { key: FilterType; label: string }[]).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.75}>
                <Text style={[styles.filterTabText, activeFilter === tab.key && styles.filterTabTextActive]}>
                  {tab.label} ({counts[tab.key]})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sort bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sortScroll}
            contentContainerStyle={styles.sortBar}>
            <Text style={styles.sortLabel}>Sort by</Text>
            {([
              { key: 'status', label: 'Status' },
              { key: 'priority', label: 'Priority' },
              { key: 'dueDate', label: 'Due Date' },
              { key: 'createdAt', label: 'Created On' },
            ] as { key: SortType; label: string }[]).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortChip, activeSort === opt.key && styles.sortChipActive]}
                onPress={() => setActiveSort(opt.key)}
                activeOpacity={0.75}>
                <Text style={[styles.sortChipText, activeSort === opt.key && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Task list or filter-empty state */}
          {displayedTasks.length === 0 ? (
            <View style={styles.filterEmptyState}>
              {searchQuery.trim() ? (
                <>
                  <Text style={styles.filterEmptyIcon}>🔍</Text>
                  <Text style={styles.filterEmptyTitle}>No results for "{searchQuery}"</Text>
                  <Text style={styles.filterEmptySubtitle}>Try a different search term.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.filterEmptyIcon}>📭</Text>
                  <Text style={styles.filterEmptyTitle}>No {activeFilter} tasks</Text>
                  <Text style={styles.filterEmptySubtitle}>Try a different filter.</Text>
                </>
              )}
            </View>
          ) : (
            <FlatList
              data={displayedTasks}
              keyExtractor={(item, i) => item.id ?? `task-${i}`}
              extraData={[displayedTasks, expandedId, editingId, editDraft]}
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
              ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: 0.5,
  },

  statsHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  statsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 13,
    color: Colors.outline,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  searchIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    marginTop: 14,
    height: 42,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.onSurface,
  },
  statsCount: { fontSize: 28, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: -0.5 },
  statsCountAccent: { color: Colors.primaryLight },

  listContainer: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 110 },

  filterScroll: { paddingLeft: 20, marginBottom: 10, flexGrow: 0 },
  filterScrollContent: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  filterTab: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterTabText: { fontSize: 13, fontWeight: '500', color: Colors.onSurfaceVariant },
  filterTabTextActive: { color: Colors.textInverse, fontWeight: '600' },

  sortScroll: { flexGrow: 0, marginBottom: 14 },
  sortBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingRight: 20, gap: 8 },
  sortLabel: { fontSize: 12, color: Colors.outline, fontWeight: '500', marginRight: 2 },
  sortChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortChipActive: { borderColor: Colors.primaryLight },
  sortChipText: { fontSize: 12, color: Colors.outline, fontWeight: '500' },
  sortChipTextActive: { color: Colors.primaryLight, fontWeight: '600' },

  filterEmptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  filterEmptyIcon: { fontSize: 40, marginBottom: 14 },
  filterEmptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.onSurfaceVariant, marginBottom: 8, textTransform: 'capitalize' },
  filterEmptySubtitle: { fontSize: 14, color: Colors.outline, textAlign: 'center' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48, paddingBottom: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.onSurface, marginBottom: 10 },
  emptySubtitle: { fontSize: 15, color: Colors.outline, textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    paddingLeft: SPACING.lg + 4,
    overflow: 'hidden',
  },
  priorityStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkboxHit: { padding: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  titleArea: { flex: 1, gap: 3 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: Colors.onSurface, lineHeight: 21 },
  taskTitleComplete: { textDecorationLine: 'line-through', color: Colors.outline },
  completedLabel: { fontSize: 12, color: Colors.outline, fontWeight: '400' },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueDateText: { fontSize: 12, color: Colors.outline },
  priorityChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  priorityChipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  expandedContent: { marginTop: SPACING.md, gap: SPACING.sm },
  innerPanel: { backgroundColor: Colors.backgroundDim, borderRadius: 12, padding: SPACING.md },
  detailGrid: { gap: SPACING.md },
  detailRow: { flexDirection: 'row', gap: SPACING.md },
  detailCell: { flex: 1, gap: 4 },
  detailLabel: { fontSize: 10, fontWeight: '600', color: Colors.outline, letterSpacing: 0.8, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, color: Colors.onSurface, fontWeight: '500' },
  priorityValue: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  editButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: Colors.primaryLight + '55', backgroundColor: 'rgba(192, 193, 255, 0.06)' },
  editButtonText: { color: Colors.primaryLight, fontSize: 14, fontWeight: '600' },
  deleteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: Colors.error + '55', backgroundColor: 'rgba(255, 180, 171, 0.06)' },
  deleteButtonText: { color: Colors.error, fontSize: 14, fontWeight: '600' },

  editForm: { gap: SPACING.md },
  editField: { gap: 6 },
  editInput: { backgroundColor: Colors.backgroundDim, borderWidth: 1.5, borderColor: Colors.outlineVariant, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.onSurface, lineHeight: 22 },
  prioritySelector: { flexDirection: 'row', gap: SPACING.sm },
  priorityPill: { flex: 1, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, alignItems: 'center' },
  priorityPillText: { fontSize: 12, fontWeight: '700' },
  editActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { color: Colors.textInverse, fontSize: 14, fontWeight: '700' },
  cancelEditButton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.outlineVariant, alignItems: 'center' },
  cancelEditButtonText: { color: Colors.onSurfaceVariant, fontSize: 14, fontWeight: '600' },
});
