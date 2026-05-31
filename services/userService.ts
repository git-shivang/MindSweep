import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_NAME_KEY = 'mindsweep_user_name';

export const saveUserName = async (name: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_NAME_KEY, name.trim());
  } catch (e) {
    console.error('[UserService] saveUserName failed', e);
  }
};

export const getUserName = async (): Promise<string | null> => {
  try {
    const value = await AsyncStorage.getItem(USER_NAME_KEY);
    return value?.trim() || null;
  } catch (e) {
    console.error('[UserService] getUserName failed', e);
    return null;
  }
};

export const clearUserName = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_NAME_KEY);
  } catch (e) {
    console.error('[UserService] clearUserName failed', e);
  }
};

/** Returns up to 2 uppercase initials from a full name. */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
