import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Colors, Spacing } from '@/constants/theme';
import { AppLogo } from './app-logo';

interface LanguageSelectionModalProps {
  visible: boolean;
  onSelectLanguage: (lang: 'hi' | 'en') => void;
  currentLanguage?: 'hi' | 'en';
}

export function LanguageSelectionModal({
  visible,
  onSelectLanguage,
  currentLanguage = 'hi',
}: LanguageSelectionModalProps) {
  const theme = useTheme() || Colors.dark;
  const { width } = useWindowDimensions();
  const isDark = theme.dark !== false;
  const isMobile = width < 640;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? '#0A2012' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(46, 125, 50, 0.30)',
              maxWidth: isMobile ? '92%' : 480,
            },
          ]}
        >
          {/* App Header Logo */}
          <View style={styles.headerContainer}>
            <AppLogo size="medium" showSubtitle={false} textColor={isDark ? '#FFFFFF' : '#051C0C'} />
            <ThemedText
              type="title"
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : '#051C0C' },
              ]}
            >
              भाषा चुनें • Select Language
            </ThemedText>
            <ThemedText
              type="small"
              style={[
                styles.subtitle,
                { color: isDark ? '#A3D9AC' : '#166534' },
              ]}
            >
              पसंदीदा भाषा चुनें • Choose your preferred language
            </ThemedText>
          </View>

          {/* Options Grid */}
          <View style={styles.optionsContainer}>
            {/* Option 1: Hindi */}
            <Pressable
              onPress={() => onSelectLanguage('hi')}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor:
                    currentLanguage === 'hi'
                      ? isDark
                        ? 'rgba(46, 125, 50, 0.35)'
                        : '#E8F5E9'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : '#F4FBF5',
                  borderColor:
                    currentLanguage === 'hi'
                      ? '#166534'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(46, 125, 50, 0.25)',
                },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.optionLeft}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor:
                        currentLanguage === 'hi'
                          ? '#166534'
                          : isDark
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(22,101,52,0.12)',
                    },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'character.book.closed.fill', android: 'translate', web: 'translate' } as any}
                    size={20}
                    tintColor={currentLanguage === 'hi' ? '#FFFFFF' : (isDark ? '#81C784' : '#166534')}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.optionTitleRow}>
                    <ThemedText
                      type="smallBold"
                      style={[
                        styles.optionTitle,
                        { color: isDark ? '#FFFFFF' : '#051C0C' },
                      ]}
                    >
                      हिंदी (Hindi)
                    </ThemedText>
                    {currentLanguage === 'hi' && (
                      <View style={styles.activeBadge}>
                        <ThemedText style={styles.activeBadgeText}>चयनित</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <SymbolView
                name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as any}
                size={20}
                tintColor={currentLanguage === 'hi' ? '#166534' : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)')}
              />
            </Pressable>

            {/* Option 2: English */}
            <Pressable
              onPress={() => onSelectLanguage('en')}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor:
                    currentLanguage === 'en'
                      ? isDark
                        ? 'rgba(46, 125, 50, 0.35)'
                        : '#E8F5E9'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : '#F4FBF5',
                  borderColor:
                    currentLanguage === 'en'
                      ? '#166534'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(46, 125, 50, 0.25)',
                },
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.optionLeft}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor:
                        currentLanguage === 'en'
                          ? '#166534'
                          : isDark
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(22,101,52,0.12)',
                    },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'globe', android: 'language', web: 'language' } as any}
                    size={20}
                    tintColor={currentLanguage === 'en' ? '#FFFFFF' : (isDark ? '#81C784' : '#166534')}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.optionTitleRow}>
                    <ThemedText
                      type="smallBold"
                      style={[
                        styles.optionTitle,
                        { color: isDark ? '#FFFFFF' : '#051C0C' },
                      ]}
                    >
                      English
                    </ThemedText>
                    {currentLanguage === 'en' && (
                      <View style={styles.activeBadge}>
                        <ThemedText style={styles.activeBadgeText}>Selected</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <SymbolView
                name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as any}
                size={20}
                tintColor={currentLanguage === 'en' ? '#166534' : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)')}
              />
            </Pressable>
          </View>

          {/* Footer note */}
          <ThemedText
            type="small"
            style={[
              styles.footerNote,
              { color: isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(5, 28, 12, 0.60)' },
            ]}
          >
            आप बाद में भी भाषा बदल सकते हैं • You can change anytime
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: Spacing.four,
    gap: Spacing.three,
    ...Platform.select({
      web: { boxShadow: '0 20px 40px rgba(0,0,0,0.45)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
      },
    }),
  },
  headerContainer: {
    alignItems: 'center',
    gap: 6,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
