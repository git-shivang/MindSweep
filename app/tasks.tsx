import { useRouter } from 'expo-router';
import { useState } from 'react';
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

type Priority = 'High' | 'Medium' | 'Low';

type Task = {
  id: string;
  title: string;
  dueDate: string;
  priority: Priority;
};

const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Call Rahul', dueDate: 'Tomorrow', priority: 'High' },
  { id: '2', title: 'Submit BI report', dueDate: 'Friday', priority: 'High' },
  { id: '3', title: 'Buy groceries', dueDate: 'No due date', priority: 'Low' },
];

const PRIORITY_STYLES: Record<Priority, { backgroundColor: string; color: string }> = {
  High: { backgroundColor: '#fde8e8', color: '#c62828' },
  Medium: { backgroundColor: '#fff8e1', color: '#f9a825' },
  Low: { backgroundColor: '#f0f0f0', color: '#616161' },
};

function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

type TaskCardProps = {
  task: Task;
  isExpanded: boolean;
  isComplete: boolean;
  onPress: () => void;
  onToggleComplete: () => void;
};

function TaskCard({
  task,
  isExpanded,
  isComplete,
  onPress,
  onToggleComplete,
}: TaskCardProps) {
  const badge = PRIORITY_STYLES[task.priority];

  return (
    <TouchableOpacity
      style={[styles.card, isExpanded && styles.cardExpanded]}
      onPress={onPress}
      activeOpacity={0.9}>
      <View style={styles.cardHeader}>
        <Text
          style={[styles.taskTitle, isComplete && styles.taskTitleComplete]}
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

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={onToggleComplete}
            activeOpacity={0.7}>
            <View style={[styles.checkbox, isComplete && styles.checkboxChecked]}>
              {isComplete ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              {isComplete ? 'Completed' : 'Mark complete'}
            </Text>
          </TouchableOpacity>

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>({});

  const handleCardPress = (id: string) => {
    animateLayout();
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleToggleComplete = (id: string) => {
    animateLayout();
    setCompletedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Your Tasks</Text>

      <FlatList
        data={MOCK_TASKS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            isExpanded={expandedId === item.id}
            isComplete={!!completedIds[item.id]}
            onPress={() => handleCardPress(item.id)}
            onToggleComplete={() => handleToggleComplete(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4a90d9',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: '#4a90d9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  taskTitleComplete: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dueDatePreview: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 14,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4a90d9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4a90d9',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a90d9',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#4a90d9',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fde8e8',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#c62828',
    fontSize: 15,
    fontWeight: '600',
  },
});
