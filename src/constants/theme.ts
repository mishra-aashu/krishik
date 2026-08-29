/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1D1A',
    background: '#FAF9F6', // Alabaster/Off-white
    backgroundElement: '#EAE8E1', // Soft Clay
    backgroundSelected: '#D7D4C9', // Selected Clay
    textSecondary: '#5C5E5A',
    primary: '#1E4620', // Forest Green
    accent: '#D4AF37', // Harvest Gold
    border: '#DFDDD7',
    chatUser: '#E2F0D9', // Soft light green for user chat bubbles
    chatBot: '#F0EFEA', // Soft light grey/cream for bot chat bubbles
    success: '#2E7D32',
    error: '#D32F2F',
    card: '#FFFFFF',
  },
  dark: {
    text: '#F1F3F0',
    background: '#0E140F', // Deep Forest Dark
    backgroundElement: '#1B221C', // Dark Forest Element
    backgroundSelected: '#28352A', // Selected dark forest
    textSecondary: '#A0A59E',
    primary: '#2E6F40', // Lush Green
    accent: '#E5A93B', // Warm Gold
    border: '#252F26',
    chatUser: '#1B3D22', // Dark green for user chat bubbles
    chatBot: '#212A22', // Darker forest for bot chat bubbles
    success: '#4CAF50',
    error: '#EF5350',
    card: '#161D17',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: Platform.select({
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    ios: 'System',
    default: 'sans-serif',
  }),
  bold: Platform.select({
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    ios: 'System',
    default: 'sans-serif-bold',
  }),
  serif: Platform.select({
    web: 'var(--font-serif)',
    ios: 'ui-serif',
    default: 'serif',
  }),
  rounded: Platform.select({
    web: 'var(--font-rounded)',
    ios: 'ui-rounded',
    default: 'normal',
  }),
  mono: Platform.select({
    web: 'var(--font-mono)',
    ios: 'ui-monospace',
    default: 'monospace',
  }),
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
