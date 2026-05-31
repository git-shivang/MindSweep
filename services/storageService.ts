import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredTask {
  id: string;
  title: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'MINDSWEEP_TASKS';

export const saveTasks = async (tasks: StoredTask[]): Promise<void> => {
  try {
    const json = JSON.stringify(tasks);
    await AsyncStorage.setItem(STORAGE_KEY, json);
    console.log('[Storage] saveTasks: saved', tasks.length, 'tasks');
  } catch (e) {
    console.error('[Storage] saveTasks: failed', e);
  }
};

export const loadTasks = async (): Promise<StoredTask[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    const tasks = jsonValue != null ? JSON.parse(jsonValue) : [];
    console.log('[Storage] loadTasks: loaded', tasks.length, 'tasks');
    return tasks;
  } catch (e) {
    console.error('[Storage] loadTasks: failed', e);
    return [];
  }
};

export const deleteTask = async (id: string): Promise<void> => {
  try {
    const tasks = await loadTasks();
    await saveTasks(tasks.filter((t) => t.id !== id));
  } catch (e) {
    console.error('Error deleting task', e);
  }
};

export const updateTask = async (updatedTask: StoredTask): Promise<void> => {
  try {
    const tasks = await loadTasks();
    const index = tasks.findIndex((t) => t.id === updatedTask.id);
    if (index > -1) {
      tasks[index] = updatedTask;
      await saveTasks(tasks);
    }
  } catch (e) {
    console.error('Error updating task', e);
  }
};

export const clearAllTasks = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing all tasks', e);
  }
};
