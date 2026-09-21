import { LocalStorage } from '@/utils/storage';

export interface VoiceHistoryItem {
  id: string;
  query: string;
  answer: string;
  timestamp: number;
  source: 'weather' | 'mandi' | 'ai';
  title?: string;
  language: 'hi' | 'en';
}

const STORAGE_KEY = 'krishik_voice_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Retrieves saved voice queries and answers from LocalStorage
 */
export async function getVoiceHistory(): Promise<VoiceHistoryItem[]> {
  try {
    const raw = await LocalStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: VoiceHistoryItem[] = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.warn('[VoiceHistory] Failed to load history:', err);
    return [];
  }
}

/**
 * Saves a new voice query and response to LocalStorage
 */
export async function saveVoiceHistoryItem(item: {
  query: string;
  answer: string;
  source: 'weather' | 'mandi' | 'ai';
  title?: string;
  language?: 'hi' | 'en';
}): Promise<VoiceHistoryItem> {
  const newItem: VoiceHistoryItem = {
    id: `vh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    query: item.query.trim(),
    answer: item.answer.trim(),
    timestamp: Date.now(),
    source: item.source,
    title: item.title,
    language: item.language || 'hi',
  };

  try {
    const existing = await getVoiceHistory();
    // Filter out duplicates with identical query asked in the last 15 seconds
    const filtered = existing.filter(
      (h) => !(h.query.toLowerCase() === newItem.query.toLowerCase() && Date.now() - h.timestamp < 15000)
    );
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[VoiceHistory] Failed to save history:', err);
  }

  return newItem;
}

/**
 * Deletes a single item from voice history by ID
 */
export async function deleteVoiceHistoryItem(id: string): Promise<VoiceHistoryItem[]> {
  try {
    const existing = await getVoiceHistory();
    const updated = existing.filter((item) => item.id !== id);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[VoiceHistory] Failed to delete item:', err);
    return [];
  }
}

/**
 * Clears all voice history
 */
export async function clearVoiceHistory(): Promise<void> {
  try {
    await LocalStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[VoiceHistory] Failed to clear history:', err);
  }
}
