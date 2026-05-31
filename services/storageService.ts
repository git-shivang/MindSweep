
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
}

const STORAGE_KEY = 'MINDSWEEP_TASKS';

export const saveTasks = async (tasks: Task[]): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(tasks);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Error saving tasks', e);
  }
};

export const loadTasks = async (): Promise<Task[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error loading tasks', e);
    return [];
  }
};

export const deleteTask = async (id: string): Promise<void> => {
  try {
    const tasks = await loadTasks();
    const updatedTasks = tasks.filter(task => task.id !== id);
    await saveTasks(updatedTasks);
  } catch (e) {
    console.error('Error deleting task', e);
  }
};

export const updateTask = async (updatedTask: Task): Promise<void> => {
  try {
    const tasks = await loadTasks();
    const taskIndex = tasks.findIndex(task => task.id === updatedTask.id);
    if (taskIndex > -1) {
      tasks[taskIndex] = updatedTask;
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
