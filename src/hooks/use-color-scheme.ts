import { useThemeContext } from '@/context/theme-context';

export function useColorScheme() {
  try {
    const { colorScheme } = useThemeContext();
    return colorScheme;
  } catch (e) {
    const { useColorScheme: useRNColorScheme } = require('react-native');
    return useRNColorScheme() || 'light';
  }
}
