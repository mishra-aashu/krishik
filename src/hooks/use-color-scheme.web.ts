import { useEffect, useState } from 'react';
import { useThemeContext } from '@/context/theme-context';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  let colorScheme = 'light';
  try {
    const { colorScheme: activeScheme } = useThemeContext();
    colorScheme = activeScheme;
  } catch (e) {
    const { useColorScheme: useRNColorScheme } = require('react-native');
    colorScheme = useRNColorScheme() || 'light';
  }

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
