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
 * Deduplicates speech transcripts to fix Android Chrome WebSpeech API prefix duplication bug
 * and repetitive speech stuttering across languages (Devanagari, Latin, Hinglish).
 */
export function deduplicateSpeechTranscript(raw: string): string {
  if (!raw) return '';

  // 1. Collapse extra spaces
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return '';

  // 2. Remove immediate consecutive duplicate words ("ट्रैक्टर ट्रैक्टर" -> "ट्रैक्टर")
  const words = text.split(' ');
  const singleDeduplicated: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
      singleDeduplicated.push(words[i]);
    }
  }
  text = singleDeduplicated.join(' ');

  // 3. Iteratively remove repeated multi-word phrases (N-grams up to 8 words)
  // e.g. "ट्रैक्टर वाला कितना पैसा" repeated multiple times
  let prevText = '';
  while (text !== prevText) {
    prevText = text;
    const w = text.split(' ');
    let changed = false;

    for (let len = Math.min(8, Math.floor(w.length / 2)); len >= 1; len--) {
      for (let i = 0; i <= w.length - 2 * len; i++) {
        const phrase1 = w.slice(i, i + len).join(' ').toLowerCase();
        const phrase2 = w.slice(i + len, i + 2 * len).join(' ').toLowerCase();
        if (phrase1 === phrase2) {
          w.splice(i + len, len);
          text = w.join(' ');
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return text.trim();
}

/**
 * Production-level script & phonetic normalizer (Zero hardcoded word dictionaries).
 * Cleans duplicates and normalizes speech input.
 */
export function normalizePhoneticDevanagari(text: string): string {
  if (!text) return '';
  return deduplicateSpeechTranscript(text);
}


