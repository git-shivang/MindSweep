import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { saveUserName } from '@/services/userService';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const canContinue = name.trim().length > 1;

  const handleContinue = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    await saveUserName(name.trim());
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Branding */}
        <View style={styles.brand}>
          <MaterialCommunityIcons name="brain" size={52} color={Colors.primary} />
          <Text style={styles.appName}>MindSweep</Text>
        </View>

        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>
            We'll personalise your experience and display it on your profile.
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>YOUR NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Alex Johnson"
            placeholderTextColor={Colors.outline}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.button, !canContinue && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || saving}
          activeOpacity={0.85}>
          {saving ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.buttonText}>Let's go →</Text>
          )}
        </TouchableOpacity>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 36,
    paddingBottom: 40,
  },
  brand: {
    alignItems: 'center',
    gap: 10,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
    letterSpacing: -0.5,
  },
  heading: {
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.onSurface,
    letterSpacing: -1,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.outline,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 18,
    color: Colors.onSurface,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: 0.2,
  },
});
