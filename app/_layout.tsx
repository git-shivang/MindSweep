import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

// Force DarkTheme with our app background so there is never a white flash
const APP_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0c141f',
    card: '#0c141f',
  },
};

export default function RootLayout() {
  useEffect(() => {
    // Hold the splash for at least 1.5 s so it's visible on fast devices
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider style={{ backgroundColor: '#0c141f' }}>
      <ThemeProvider value={APP_THEME}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: '#0c141f' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
