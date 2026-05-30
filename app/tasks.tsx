import { useRouter } from 'expo-router';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  { id: '3', title: 'Buy groceries', dueDate: '', priority: 'Low' },
];

const PRIORITY_STYLES: Record<Priority, { backgroundColor: string; color: string }> = {
  High: { backgroundColor: '#fde8e8', color: '#c62828' },
  Medium: { backgroundColor: '#fff8e1', color: '#f9a825' },
  Low: { backgroundColor: '#f0f0f0', color: '#616161' },
};

function TaskCard({ task }: { task: Task }) {
  const badge = PRIORITY_STYLES[task.priority];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{task.priority}</Text>
        </View>
      </View>
      {task.dueDate ? (
        <Text style={styles.dueDate}>Due: {task.dueDate}</Text>
      ) : null}
    </View>
  );
}

export default function TasksScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Your Tasks</Text>

      <FlatList
        data={MOCK_TASKS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskCard task={item} />}
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
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dueDate: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});
