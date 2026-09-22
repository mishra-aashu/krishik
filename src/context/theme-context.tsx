import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as RNuseColorScheme } from 'react-native';
import { LocalStorage } from '@/utils/storage';
import { Colors } from '@/constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  colorScheme: 'light' | 'dark';
  theme: typeof Colors.light | typeof Colors.dark;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = RNuseColorScheme() || 'dark';
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    async function loadTheme() {
      const savedMode = await LocalStorage.getItem('app_theme_mode');
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        setThemeModeState(savedMode);
      } else {
        setThemeModeState('dark');
      }
    }
    loadTheme();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      setColorScheme(systemScheme === 'dark' ? 'dark' : 'light');
    } else {
      setColorScheme(themeMode);
    }
  }, [themeMode, systemScheme]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await LocalStorage.setItem('app_theme_mode', mode);
  };

  const theme = Colors[colorScheme];

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, colorScheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context && context.theme) {
    return context.theme;
  }
  return Colors.dark;
}
