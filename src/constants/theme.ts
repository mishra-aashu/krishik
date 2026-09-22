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
    // Surfaces — luxurious True OLED Pure Black (Zero blue tint)
    text: '#FFFFFF',                  // Pure Crisp White
    textSecondary: '#A1A1AA',         // Refined Muted Zinc Secondary
    background: '#000000',            // True OLED Pitch Black (#000000)
    backgroundElement: '#121215',     // Pure Charcoal Dark Card (#121215)
    backgroundSelected: 'rgba(255, 255, 255, 0.08)', // Highlight Surface
    // Brand — crisp minimalist white & harvest gold in dark mode
    primary: '#FFFFFF',               // Pure White Primary Accent
    primaryDark: '#E4E4E7',           // Zinc White Accent
    primaryLight: 'rgba(255, 255, 255, 0.08)', // Soft White Tint
    accent: '#F59E0B',                // Rich Warm Golden Harvest (Amber 500)
    accentLight: 'rgba(245, 158, 11, 0.15)', // Golden Soft Glow
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    // Chrome & Surfaces
    border: 'rgba(255, 255, 255, 0.12)', // Subtle Pure Neutral Border
    borderAccent: 'rgba(255, 255, 255, 0.25)',
    glassBackground: 'rgba(9, 9, 11, 0.92)', // Pure Black Glass Backdrop
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    cardShadow: 'rgba(0, 0, 0, 0.65)',
    cardGlow: 'rgba(255, 255, 255, 0.1)',
    // Navigation & Tabs
    tabActive: '#FFFFFF',             // Pure White Active Tab
    tabInactive: '#A1A1AA',           // Muted Zinc Inactive Tab
    tabActiveBg: 'rgba(255, 255, 255, 0.08)',
    tabGlow: 'rgba(255, 255, 255, 0.15)',
    // Chat
    chatUser: '#18181B',              // Pure Charcoal User Bubble
    chatBot: '#121215',               // True Dark Bot Bubble
    chatBotBorder: 'rgba(255, 255, 255, 0.12)',
    // States & Feedback
    success: '#34D399',               // Mint Green
    warning: '#FBBF24',               // Warm Gold
    error: '#F87171',                 // Coral Red
    card: '#121215',
    onPrimary: '#000000',             // Pure Black text/icon on White pills
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
