import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { getTTSLocaleForText } from './multilingual-voice-engine';

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
 * Trims spoken text to an ultra-concise, crisp summary (max 2-3 sentences / ~30-35 words)
 * so farmers get direct practical info instantly without getting bored.
 */
export function extractVoiceSummaryForSpeech(text: string, isHindi: boolean = true, maxWords: number = 35): string {
  if (!text) return '';

  const sentences = text
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return text;

  let summary = '';
  let wordCount = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sWords = sentence.split(/\s+/).length;

    if (wordCount + sWords <= maxWords || summary === '') {
      summary += (summary ? ' ' : '') + sentence;
      wordCount += sWords;
      if (wordCount >= maxWords || i >= 1) {
        break;
      }
    } else {
      break;
    }
  }

  return summary || text;
}

/**
 * Strips markdown symbols, links, hashtags, table borders, emojis,
 * smartly converts numeric ranges (e.g. 12-24 -> 12 से 24 / 12 to 24),
 * and trims to an ultra-concise spoken audio summary (max 30-35 words).
 */
export function cleanTextForSpeech(text: string, language?: 'hi' | 'en', trimForAudio: boolean = true): string {
  if (!text) return '';

  // Auto-detect Hindi if Devanagari characters are present or language === 'hi'
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(text);

  let processed = text
    // Remove markdown links [label](url) -> label
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove raw URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown headers (### Header -> Header)
    .replace(/#{1,6}\s+/g, '')
    // Remove bold, italic, strikethrough markers (**bold** -> bold, *italic* -> italic)
    .replace(/[*_~]{1,3}/g, '')
    // Remove bullet points and list dashes (- item -> item)
    .replace(/^[\s]*[-+*]\s+/gm, '')
    // Remove markdown table borders and pipes
    .replace(/\|/g, ' ')
    // Remove common emojis so TTS doesn't read out emoji names
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  // 1. Smart Numeric Ranges: "12-24" or "3-4" -> "12 से 24" (Hindi) / "12 to 24" (English)
  const rangeReplacer = isHindi ? '$1 से $2' : '$1 to $2';
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/g, rangeReplacer);

  // 2. Smart Dimensions: "3x4" or "3X4" or "3×4" -> "3 गुणा 4" (Hindi) / "3 by 4" (English)
  const dimReplacer = isHindi ? '$1 गुणा $2' : '$1 by $2';
  processed = processed.replace(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/g, dimReplacer);

  // 3. Smart Units & Symbols
  if (isHindi) {
    processed = processed
      .replace(/(\d+)\s*°C\b/gi, '$1 डिग्री सेल्सियस')
      .replace(/(\d+)\s*%/g, '$1 प्रतिशत')
      .replace(/(\d+)\s*kg\b/gi, '$1 किलो')
      .replace(/(\d+)\s*cm\b/gi, '$1 सेंटीमीटर')
      .replace(/(\d+)\s*mm\b/gi, '$1 मिलीमीटर')
      .replace(/(\w+|\d+)\s*\/\s*(\w+|\d+)/g, '$1 प्रति $2');
  } else {
    processed = processed
      .replace(/(\d+)\s*°C\b/gi, '$1 degrees Celsius')
      .replace(/(\d+)\s*%/g, '$1 percent')
      .replace(/(\d+)\s*kg\b/gi, '$1 kilograms')
      .replace(/(\d+)\s*cm\b/gi, '$1 centimeters')
      .replace(/(\d+)\s*mm\b/gi, '$1 millimeters')
      .replace(/(\w+|\d+)\s*\/\s*(\w+|\d+)/g, '$1 per $2');
  }

  // 4. Remove any remaining isolated hyphens so TTS engines never read them as "minus"
  processed = processed
    .replace(/\s*[-–—]\s*/g, ' ')
    // Clean excessive spaces, newlines, and punctuation
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 5. Trim to ultra-concise audio summary if trimForAudio is enabled
  if (trimForAudio) {
    processed = extractVoiceSummaryForSpeech(processed, isHindi, 35);
  }

  return processed;
}

/**
 * Speaks text out loud in clean vernacular Hindi/English with elder-friendly cadence.
 */
export async function speakVernacular(
  text: string,
  options: VoiceSpeakOptions = {}
): Promise<void> {
  const clean = cleanTextForSpeech(text, options.language);
  if (!clean) return;

  try {
    // Stop any ongoing speech first
    await stopSpeaking();

    // Auto-detect Hindi (Devanagari) vs English (Latin) vs Regional scripts for matching TTS voice
    let langCode = getTTSLocaleForText(clean, options.language as any);

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
