import React, { useState } from 'react';
import { StyleSheet, Pressable, View, Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { VoiceAssistantModal } from './voice-assistant-modal';
import { useLanguage } from '@/context/language-context';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

interface FloatingVoiceButtonProps {
  language?: 'hi' | 'en';
}

export function FloatingVoiceButton({ language: propLanguage }: FloatingVoiceButtonProps) {
  const theme = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  let contextLang: 'hi' | 'en' = 'hi';
  try {
    const { language: currentLang } = useLanguage();
    if (currentLang === 'hi' || currentLang === 'en') {
      contextLang = currentLang;
    }
  } catch {
    // If used outside LanguageProvider fallback
  }
  const language = propLanguage || contextLang;

  // Subtle pulsing glow
  const glowScale = useSharedValue(1);
  React.useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <>
      <Animated.View entering={FadeIn.duration(400)} style={styles.fabContainer}>
        {/* Pulsing Backlight */}
        <Animated.View
          style={[
            styles.glowRing,
            { backgroundColor: theme.primary + '30' },
            animatedGlowStyle,
          ]}
        />

        <Pressable
          onPress={() => setIsModalOpen(true)}
          style={({ pressed }) => [
            styles.fabButton,
            { backgroundColor: theme.dark ? '#059669' : theme.primary },
            pressed && styles.fabPressed,
          ]}
          accessibilityLabel={language === 'hi' ? 'आवाज़ से पूछें' : 'Ask by Voice'}
          accessibilityRole="button"
        >
          <View style={styles.micCircle}>
            <SymbolView
              name={{ ios: 'mic.fill', android: 'mic', web: 'mic' } as any}
              size={18}
              tintColor="#FFFFFF"
            />
          </View>
          <ThemedText style={styles.fabLabel}>
            {language === 'hi' ? 'बोलकर पूछें' : 'Ask by Voice'}
          </ThemedText>
        </Pressable>
      </Animated.View>

      <VoiceAssistantModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        language={language}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 18,
    bottom: 84, // Sits comfortably above the mobile bottom tab bar (height ~65px)
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 26,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(22, 163, 74, 0.45)',
        cursor: 'pointer',
        outlineStyle: 'none',
      } as any,
      default: {
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  micCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
