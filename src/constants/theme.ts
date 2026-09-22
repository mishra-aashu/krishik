/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    dark: false,
    // Surfaces — lush, minimal, modern
    text: '#0F172A',                  // Rich Slate Blue-Grey for supreme readability
    textSecondary: '#475569',         // Muted Slate Secondary
    background: '#F8FAF8',            // Soft natural mint off-white
    backgroundElement: '#FFFFFF',     // Pure white card surface
    backgroundSelected: '#ECFDF5',    // Soft emerald selected tint
    // Brand — vibrant, rich emerald & warm harvest gold
    primary: '#059669',               // Vibrant Rich Emerald (Green 600)
    primaryDark: '#047857',           // Deep Forest Emerald (Green 700)
    primaryLight: '#D1FAE5',          // Soft Emerald Tint (Green 100)
    accent: '#D97706',                // Warm Harvest Amber (Amber 600)
    accentLight: '#FEF3C7',           // Warm Golden Soft Surface (Amber 100)
    accentGlow: 'rgba(217, 119, 6, 0.15)',
    // Chrome & Surfaces
    border: '#E2E8F0',                // Soft neutral border
    borderAccent: 'rgba(5, 150, 105, 0.25)', // Emerald-tinted border accent
    glassBackground: 'rgba(255, 255, 255, 0.88)', // Glassmorphism backdrop
    glassBorder: 'rgba(5, 150, 105, 0.18)',
    cardShadow: 'rgba(15, 23, 42, 0.06)',
    cardGlow: 'rgba(5, 150, 105, 0.12)',
    // Navigation & Tabs
    tabActive: '#059669',
    tabInactive: '#64748B',
    tabActiveBg: '#ECFDF5',
    tabGlow: 'rgba(5, 150, 105, 0.2)',
    // Chat
    chatUser: '#D1FAE5',              // Soft emerald user bubble
    chatBot: '#FFFFFF',               // Pristine elevated bot bubble
    chatBotBorder: '#E2E8F0',
    // States & Feedback
    success: '#10B981',               // Bright Emerald Success
    warning: '#F59E0B',               // Warm Amber Warning
    error: '#EF4444',                 // Vibrant Red
    card: '#FFFFFF',
    onPrimary: '#FFFFFF',
    onAccent: '#FFFFFF',
  },
  dark: {
    dark: true,
    // Surfaces — luxurious deep midnight obsidian slate
    text: '#F8FAFC',                  // Crisp Ice White
    textSecondary: '#94A3B8',         // Refined Slate Secondary
    background: '#0B131F',            // Deep Midnight Obsidian Slate (#0B131F)
    backgroundElement: '#1E293B',     // Elevated Card Charcoal Slate (#1E293B)
    backgroundSelected: 'rgba(52, 211, 153, 0.12)', // Highlight Surface
    // Brand — soothing soft sage emerald & harvest gold
    primary: '#34D399',               // Soft Soothing Sage Emerald (Green 400 - Eye Friendly)
    primaryDark: '#059669',           // Deep Forest Emerald
    primaryLight: 'rgba(52, 211, 153, 0.12)', // Soft Sage Tint
    accent: '#F59E0B',                // Rich Warm Golden Harvest (Amber 500)
    accentLight: 'rgba(245, 158, 11, 0.15)', // Golden Soft Glow
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    // Chrome & Surfaces
    border: 'rgba(255, 255, 255, 0.1)', // Refined Subtle Slate Border
    borderAccent: 'rgba(52, 211, 153, 0.25)',
    glassBackground: 'rgba(15, 23, 42, 0.88)', // Pristine Slate 900 Glass Backdrop
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    cardShadow: 'rgba(0, 0, 0, 0.45)',
    cardGlow: 'rgba(52, 211, 153, 0.15)',
    // Navigation & Tabs
    tabActive: '#34D399',
    tabInactive: '#94A3B8',
    tabActiveBg: 'rgba(52, 211, 153, 0.12)',
    tabGlow: 'rgba(52, 211, 153, 0.2)',
    // Chat
    chatUser: '#163E2D',              // Rich Emerald Dark User Bubble
    chatBot: '#1E293B',               // Charcoal Slate Bot Bubble
    chatBotBorder: 'rgba(255, 255, 255, 0.1)',
    // States & Feedback
    success: '#34D399',               // Mint Green
    warning: '#FBBF24',               // Warm Gold
    error: '#F87171',                 // Coral Red
    card: '#1E293B',
    onPrimary: '#064E3B',
    onAccent: '#FFFFFF',
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
