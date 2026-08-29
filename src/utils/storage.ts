import { Platform } from 'react-native';

const nativeMemoryCache: Record<string, string> = {};

export const LocalStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return window.localStorage.getItem(key);
      }
      return nativeMemoryCache[key] || null;
    } catch (e) {
      console.error('Storage getItem error:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        window.localStorage.setItem(key, value);
        return;
      }
      nativeMemoryCache[key] = value;
    } catch (e) {
      console.error('Storage setItem error:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        window.localStorage.removeItem(key);
        return;
      }
      delete nativeMemoryCache[key];
    } catch (e) {
      console.error('Storage removeItem error:', e);
    }
  }
};
