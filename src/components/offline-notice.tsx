import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { ThemedText } from './themed-text';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';

interface OfflineNoticeProps {
  language: 'hi' | 'en' | 'hinglish';
}

export default function OfflineNotice({ language }: OfflineNoticeProps) {
  const netInfo = useNetInfo();
  const theme = useTheme();

  // If connected is true or null (still initializing), don't show the offline notice
  if (netInfo.isConnected === true || netInfo.isConnected === null) {
    return null;
  }

  const getMessage = () => {
    switch (language) {
      case 'hi':
        return 'ऑफ़लाइन मोड • सहेजा गया डेटा दिखाया जा रहा है';
      case 'hinglish':
        return 'Offline Mode • Saved data dikhaya ja raha hai';
      case 'en':
      default:
        return 'Offline Mode • Showing cached data';
    }
  };

  return (
    <Animated.View
      entering={SlideInUp.duration(300)}
      exiting={SlideOutUp.duration(300)}
      style={[
        styles.container,
        {
          backgroundColor: theme.dark ? '#2D1E1E' : '#FFF3F3',
          borderColor: theme.dark ? '#4E2C2C' : '#FFCDD2',
        },
      ]}
    >
      <View style={styles.content}>
        <SymbolView
          name={{ ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' } as any}
          size={16}
          tintColor={theme.dark ? '#E57373' : '#D32F2F'}
        />
        <ThemedText
          type="smallBold"
          style={[
            styles.text,
            { color: theme.dark ? '#FFCDD2' : '#C62828' },
          ]}
        >
          {getMessage()}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    width: '100%',
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  text: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
});
