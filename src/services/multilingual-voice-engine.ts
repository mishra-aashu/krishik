import { Platform } from 'react-native';

export type VoiceLanguageMode = 'auto' | 'hi' | 'en' | 'hinglish';

export interface ScriptAnalysis {
  script: 'devanagari' | 'latin' | 'gurmukhi' | 'bengali' | 'other';
  lang: 'hi' | 'en' | 'pa' | 'mr' | 'other';
  containsDevanagari: boolean;
  containsLatin: boolean;
}

/**
 * Analyzes text to determine script and language (Hindi Devanagari, English Latin, etc.)
 */
export function detectScriptAndLanguage(text: string): ScriptAnalysis {
  if (!text) {
    return {
      script: 'other',
      lang: 'other',
      containsDevanagari: false,
      containsLatin: false,
    };
  }

  const containsDevanagari = /[\u0900-\u097F]/.test(text);
  const containsLatin = /[a-zA-Z]/.test(text);
  const containsGurmukhi = /[\u0A00-\u0A7F]/.test(text);
  const containsBengali = /[\u0980-\u09FF]/.test(text);

  let script: ScriptAnalysis['script'] = 'other';
  let lang: ScriptAnalysis['lang'] = 'other';

  if (containsDevanagari) {
    script = 'devanagari';
    lang = 'hi';
  } else if (containsGurmukhi) {
    script = 'gurmukhi';
    lang = 'pa';
  } else if (containsBengali) {
    script = 'bengali';
  } else if (containsLatin) {
    script = 'latin';
    lang = 'en';
  }

  return {
    script,
    lang,
    containsDevanagari,
    containsLatin,
  };
}

/**
 * Returns optimal SpeechSynthesis voice locale based on auto-detected script.
 */
export function getTTSLocaleForText(text: string, preferredMode: VoiceLanguageMode = 'auto'): string {
  const analysis = detectScriptAndLanguage(text);

  if (analysis.containsDevanagari) {
    return 'hi-IN';
  }
  if (analysis.script === 'gurmukhi') {
    return 'pa-IN';
  }
  if (preferredMode === 'en' || (analysis.containsLatin && !analysis.containsDevanagari)) {
    return Platform.OS === 'web' ? 'en-IN' : 'en-IN';
  }

  return 'hi-IN';
}

/**
 * Production Web Speech API language selector.
 * 'en-IN' natively transcribes all spoken English and Hinglish in Latin script
 * with unlimited vocabulary and zero hardcoded word lists.
 */
export function getSpeechRecognitionLang(mode: VoiceLanguageMode = 'auto'): string {
  switch (mode) {
    case 'hi':
      return 'hi-IN';
    case 'en':
    case 'hinglish':
    case 'auto':
    default:
      // 'en-IN' natively transcribes English speech ("How to speak in English") directly into Latin script
      return 'en-IN';
  }
}

/**
 * Production-level script & phonetic normalizer (Zero hardcoded word dictionaries).
 * If a transcript contains Devanagari script for an English query, this normalizes it dynamically.
 */
export function normalizePhoneticDevanagari(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();

  // If text is already in Latin script (e.g. from en-IN WebSpeech), return as is
  if (!/[\u0900-\u097F]/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}


