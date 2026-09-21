import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export interface VoiceSpeakOptions {
  language?: 'hi' | 'en';
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: any) => void;
}

let activeSpeechListeners: {
  onDone?: () => void;
  onError?: (error: any) => void;
} = {};

/**
 * Strips markdown symbols, links, hashtags, table borders, and emojis
 * to prepare clean, natural text for vernacular text-to-speech.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  return text
    // Remove markdown links [label](url) -> label
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove raw URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown headers (### Header -> Header)
    .replace(/#{1,6}\s+/g, '')
    // Remove bold and italic markers (**bold** -> bold, *italic* -> italic)
    .replace(/[*_~]{1,3}/g, '')
    // Remove bullet points and list dashes (- item -> item)
    .replace(/^[\s]*[-+*]\s+/gm, '')
    // Remove markdown table borders and pipes
    .replace(/\|/g, ' ')
    // Remove common emojis so TTS doesn't read out "folded hands emoji" or "corn emoji"
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    // Clean excessive spaces, newlines, and punctuation
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Speaks text out loud in clean vernacular Hindi/English with elder-friendly cadence.
 */
export async function speakVernacular(
  text: string,
  options: VoiceSpeakOptions = {}
): Promise<void> {
  const clean = cleanTextForSpeech(text);
  if (!clean) return;

  try {
    // Stop any ongoing speech first
    await stopSpeaking();

    // Auto-detect Hindi (Devanagari) vs English (Latin) script to use matching voice engine
    const containsDevanagari = /[\u0900-\u097F]/.test(clean);
    let langCode = containsDevanagari ? 'hi-IN' : (options.language === 'en' ? 'en-IN' : (Platform.OS === 'web' ? 'en-IN' : 'en-US'));

    const speechRate = options.rate ?? (Platform.OS === 'ios' ? 0.88 : 0.90);
    const speechPitch = options.pitch ?? 1.0;

    activeSpeechListeners = {
      onDone: options.onDone,
      onError: options.onError,
    };

    if (options.onStart) {
      options.onStart();
    }

    Speech.speak(clean, {
      language: langCode,
      rate: speechRate,
      pitch: speechPitch,
      onDone: () => {
        if (activeSpeechListeners.onDone) {
          activeSpeechListeners.onDone();
        }
      },
      onError: (err) => {
        console.warn('[VoiceService] Speech synthesis error:', err);
        if (activeSpeechListeners.onError) {
          activeSpeechListeners.onError(err);
        }
      },
    });
  } catch (err) {
    console.warn('[VoiceService] Failed to invoke Speech.speak:', err);
    if (options.onError) {
      options.onError(err);
    }
  }
}

/**
 * Stops any active speech synthesis immediately.
 */
export async function stopSpeaking(): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    Speech.stop();
  } catch (err) {
    console.warn('[VoiceService] Speech.stop error:', err);
  }
}

/**
 * Checks if speech is currently active.
 */
export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
