/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useThemeContext } from '@/context/theme-context';
import { Colors } from '@/constants/theme';

export function useTheme() {
  try {
    const context = useThemeContext();
    if (context && context.theme) {
      return context.theme;
    }
  } catch (e) {
    // Fallback if rendered outside ThemeProvider
  }
  return Colors.dark;
}
