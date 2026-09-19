/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    dark: false,
    // Surfaces — pure, minimal, modern
    text: '#0A1A0E',
    background: '#FFFFFF',
    backgroundElement: '#F2F8F3',     // Very light sage
    backgroundSelected: '#E0F0E4',    // Crisp green selected tint
    textSecondary: '#4D6B54',         // Natural forest secondary
    // Brand — deep, confident, trustworthy
    primary: '#166534',               // Rich Deep Emerald
    accent: '#D97706',                // Warm Amber
    // Chrome
    border: '#A2C2A9',                // Soft sage border
    // Chat
    chatUser: '#DCFCE7',              // Clean mint-green user bubble
    chatBot: '#F4F7F4',               // Neutral white-sage bot bubble
    // States
    success: '#15803D',               // Strong green
    error: '#B91C1C',                 // Deep red
    card: '#FFFFFF',
    onPrimary: '#FFFFFF',
  },
  dark: {
    dark: true,
    // Surfaces — sleek pure black & obsidian
    text: '#F3F4F6',
    background: '#09090B',            // Pure sleek obsidian black
    backgroundElement: '#141417',     // Elevated dark card surface
    backgroundSelected: '#242429',    // Pressed/selected state
    textSecondary: '#9CA3AF',         // Soft neutral gray secondary
    // Brand
    primary: '#22C55E',               // Vibrant Emerald Accent
    accent: '#FBB024',                // Rich warm gold
    // Chrome
    border: '#27272A',                // Dark neutral border
    // Chat
    chatUser: '#1E293B',              // Slate dark user bubble
    chatBot: '#141417',               // Obsidian bot bubble
    onPrimary: '#FFFFFF',
    // States
    success: '#22C55E',               // Green
    error: '#F87171',                 // Soft coral red
    card: '#141417',
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 80 }) ?? 80;
export const MaxContentWidth = 1000;
