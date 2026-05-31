import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getUserName } from '@/services/userService';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

const APP_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0c141f',
    card: '#0c141f',
  },
};

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const name = await getUserName();
      // Hold splash for at least 1.5 s
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await SplashScreen.hideAsync();
      if (!name) {
        router.replace('/onboarding');
      }
    };
    init();
  }, []);

  return (
    <SafeAreaProvider style={{ backgroundColor: '#0c141f' }}>
      <ThemeProvider value={APP_THEME}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: '#0c141f' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
