/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useThemeContext } from '@/context/theme-context';

export function useTheme() {
  try {
    const { theme } = useThemeContext();
    return theme;
  } catch (e) {
    const { Colors } = require('@/constants/theme');
    const { useColorScheme } = require('./use-color-scheme');
    const scheme = useColorScheme();
    const themeName = scheme === 'dark' ? 'dark' : 'light';
    return Colors[themeName];
  }
}
