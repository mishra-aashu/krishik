import React from 'react';
import { View, StyleSheet, Image, Platform, StyleProp, ViewStyle } from 'react-native';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

export interface AppLogoProps {
  size?: 'small' | 'medium' | 'large' | 'hero';
  showText?: boolean;
  showTagline?: boolean;
  showSubtitle?: boolean;
  welcomeText?: string;
  textColor?: string;
  language?: 'hi' | 'en';
  style?: StyleProp<ViewStyle>;
}

export function AppLogo({
  size = 'medium',
  showText = true,
  showTagline = true,
  showSubtitle = false,
  welcomeText,
  textColor = '#ffffff',
  language = 'hi',
  style
}: AppLogoProps) {
  // Dimensions based on size preset
  const iconSizes = {
    small: 36,
    medium: 52,
    large: 84,
    hero: 110,
  };

  const currentSize = iconSizes[size] || iconSizes.medium;

  return (
    <View style={[styles.container, style]}>
      {/* 1. Circular Plant Emblem */}
      <View style={[
        styles.iconWrapper,
        {
          width: currentSize,
          height: currentSize,
          borderRadius: currentSize / 2,
        }
      ]}>
        <Image
          source={require('@/assets/images/app_logo_icon.png')}
          style={styles.iconImage}
          resizeMode="cover"
        />
      </View>

      {/* 2. Text Content stacked cleanly underneath */}
      {showText && (
        <View style={styles.textContainer}>
          {/* Main App Name */}
          <ThemedText
            type="title"
            style={[
              styles.appName,
              { color: textColor },
              size === 'hero' && styles.appNameHero,
              size === 'small' && styles.appNameSmall,
            ]}
          >
            {language === 'hi' ? 'कृषिक मित्र' : 'Krishik Mitra'}
          </ThemedText>

          {/* AI Tagline Badge */}
          {showTagline && (
            <View style={[
              styles.taglineBadge,
              textColor !== '#ffffff' && {
                backgroundColor: 'rgba(46, 125, 50, 0.12)',
                borderColor: 'rgba(46, 125, 50, 0.35)',
              }
            ]}>
              <ThemedText
                type="smallBold"
                style={[
                  styles.taglineText,
                  { color: textColor === '#ffffff' ? '#ffffff' : '#1B5E20' }
                ]}
              >
                AI FOR AGRICULTURE
              </ThemedText>
            </View>
          )}

          {/* Optional Welcome Message */}
          {welcomeText && (
            <ThemedText type="subtitle" style={[styles.welcomeMsg, { color: textColor }]}>
              {welcomeText}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), 0 0 16px rgba(74, 222, 128, 0.45)',
      } as any,
      default: {
        elevation: 8,
      }
    })
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    gap: 0,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 0,
    ...Platform.select({
      web: {
        textShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
      } as any,
      default: {}
    })
  },
  appNameHero: {
    fontSize: 34,
  },
  appNameSmall: {
    fontSize: 18,
  },
  taglineBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
    marginBottom: 4,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      } as any,
      default: {}
    })
  },
  taglineText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    ...Platform.select({
      web: {
        textShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
      } as any,
      default: {}
    })
  },
  welcomeMsg: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.half,
  }
});
