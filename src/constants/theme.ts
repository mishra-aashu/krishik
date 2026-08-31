/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Surfaces — pure, minimal, modern
    text: '#0A1A0E',
    background: '#FFFFFF',
    backgroundElement: '#F2F8F3',     // Very light sage
    backgroundSelected: '#E0F0E4',    // Crisp green selected tint
    textSecondary: '#4D6B54',         // Natural forest secondary
    // Brand — deep, confident, trustworthy
    primary: '#166534',               // Rich Deep Emerald
    accent: '#D97706',                // Warm Amber (not gold)
    // Chrome
    border: '#D1E4D4',                // Soft sage border
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
    // Surfaces — warm dark, NOT grey/blue/neon
    text: '#E8F0EA',
    background: '#0C1410',            // Very deep warm dark-green black
    backgroundElement: '#131F17',     // Elevated card surface
    backgroundSelected: '#1C3224',    // Pressed/selected state
    textSecondary: '#7A9E83',         // Warm sage secondary
    // Brand — rich, balanced, natural (NOT neon)
    primary: '#4ADE80',               // Green-400, vivid but not neon
    accent: '#FBB024',                // Rich warm gold
    // Chrome
    border: '#1E3527',                // Dark sage border
    // Chat
    chatUser: '#14392A',              // Dark forest-green user bubble
    chatBot: '#151D17',               // Near-surface bot bubble
    onPrimary: '#0C1410',
    // States
    success: '#4ADE80',               // Same as primary
    error: '#F87171',                 // Soft coral red
    card: '#101810',
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
export const MaxContentWidth = 800;
