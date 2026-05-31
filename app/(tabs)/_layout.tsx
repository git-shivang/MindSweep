import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabConfig = {
  label: string;
  icon: (focused: boolean) => React.ReactNode;
};

const TAB_CONFIG: Record<string, TabConfig> = {
  index: {
    label: 'Capture',
    icon: (focused) => (
      <MaterialIcons name="mic" size={21} color={focused ? Colors.textInverse : Colors.outline} />
    ),
  },
  tasks: {
    label: 'Tasks',
    icon: (focused) => (
      <MaterialIcons name="format-list-bulleted" size={21} color={focused ? Colors.textInverse : Colors.outline} />
    ),
  },
  settings: {
    label: 'Settings',
    icon: (focused) => (
      <MaterialIcons name="settings" size={21} color={focused ? Colors.textInverse : Colors.outline} />
    ),
  },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name];
          if (!config) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.75}
              style={styles.tabItem}>
              {isFocused ? (
                <View style={styles.pill}>
                  {config.icon(true)}
                  <Text style={styles.pillLabel}>{config.label}</Text>
                </View>
              ) : (
                <>
                  {config.icon(false)}
                  <Text style={styles.inactiveLabel}>{config.label}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    // transparent so the screen content shows behind/around the bar
    backgroundColor: 'transparent',
    paddingTop: 8,
    pointerEvents: 'box-none',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 72,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: 0.1,
  },
  inactiveLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.outline,
  },
});
