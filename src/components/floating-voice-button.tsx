import React, { useState } from 'react';
import { StyleSheet, Pressable, View, Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { usePathname } from 'expo-router';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { VoiceAssistantModal } from './voice-assistant-modal';
import { useLanguage } from '@/context/language-context';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

interface FloatingVoiceButtonProps {
  language?: 'hi' | 'en';
  iconOnly?: boolean;
}

export function FloatingVoiceButton({ language: propLanguage, iconOnly: propIconOnly }: FloatingVoiceButtonProps) {
  const theme = useTheme();
  const pathname = usePathname();
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

  const isChatScreen = pathname === '/chat';
  const isChowpalScreen = pathname === '/community' || pathname?.startsWith('/community');
  const isProfileScreen = pathname === '/profile' || pathname?.startsWith('/profile');
  const isHomeScreen = pathname === '/' || pathname === '/index' || pathname === '';
  const isIconOnly = propIconOnly !== undefined ? propIconOnly : !isHomeScreen;

  if (isChatScreen || isChowpalScreen || isProfileScreen) {
    return null;
  }

  return (
    <>
      <Animated.View entering={FadeIn.duration(400)} style={styles.fabContainer}>
        {/* Pulsing Backlight */}
        <Animated.View
          style={[
            styles.glowRing,
            isIconOnly && styles.glowRingIconOnly,
            { backgroundColor: '#059669' + '40' },
            animatedGlowStyle,
          ]}
        />

        <Pressable
          onPress={() => setIsModalOpen(true)}
          style={({ pressed }) => [
            styles.fabButton,
            isIconOnly && styles.fabButtonIconOnly,
            { backgroundColor: '#059669' },
            pressed && styles.fabPressed,
          ]}
          accessibilityLabel={language === 'hi' ? 'आवाज़ से पूछें' : 'Ask by Voice'}
          accessibilityRole="button"
        >
          <View style={isIconOnly ? styles.micCircleIconOnly : styles.micCircle}>
            <SymbolView
              name={{ ios: 'mic.fill', android: 'mic', web: 'mic' } as any}
              size={isIconOnly ? 22 : 18}
              tintColor="#FFFFFF"
            />
          </View>
          {!isIconOnly && (
            <ThemedText style={[styles.fabLabel, { color: '#FFFFFF' }]}>
              {language === 'hi' ? 'बोलकर पूछें' : 'Ask by Voice'}
            </ThemedText>
          )}
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
    borderRadius: 26,
  },
  glowRingIconOnly: {
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
  fabButtonIconOnly: {
    width: 48,
    height: 48,
    borderRadius: 24,
    paddingVertical: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  fabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.94 }],
  },
  micCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micCircleIconOnly: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
