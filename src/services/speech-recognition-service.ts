import { Platform } from 'react-native';
import { startRecording, stopRecording, transcribeAudio } from './transcription-service';
import { getSpeechRecognitionLang, normalizePhoneticDevanagari, deduplicateSpeechTranscript } from './multilingual-voice-engine';

export interface SpeechRecognitionHandlers {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (errorMessage: string) => void;
  onStateChange?: (state: 'listening' | 'processing') => void;
}

export interface ActiveListeningSession {
  stop: () => Promise<string>;
  abort: () => void;
}

/**
 * Checks if the browser supports native Web Speech API (Chrome, Edge, Safari, Android Chrome).
 */
export function isWebSpeechSupported(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/**
 * Starts a voice listening session:
 * 1. On Web with SpeechRecognition: Uses browser's native live speech-to-text for instant
 *    vernacular recognition (hi-IN / en-IN), real-time volume detection, and auto-silence submission.
 * 2. On other platforms / fallback: Uses microphone recording and Groq Whisper Large v3.
 */
export async function startListeningSession(
  language: 'hi' | 'en' | 'hinglish' = 'hi',
  handlers: SpeechRecognitionHandlers = {}
): Promise<ActiveListeningSession> {
  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
  const hasWebSpeech = isWebSpeechSupported();

  console.log(`[SpeechService] Starting session. Platform: ${Platform.OS}, WebSpeech: ${hasWebSpeech}`);

  if (isWeb && hasWebSpeech) {
    return startWebSpeechSession(language, handlers);
  } else {
    return startFallbackSession(language, handlers);
  }
}

/**
 * Web Speech API implementation with live interim feedback and volume analyser
 */
async function startWebSpeechSession(
  language: 'hi' | 'en' | 'hinglish',
  handlers: SpeechRecognitionHandlers
): Promise<ActiveListeningSession> {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const recognition = new SpeechRecognitionClass();
  recognition.lang = getSpeechRecognitionLang(language as any);
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let stream: MediaStream | null = null;
  let cleanupVolume: (() => void) | null = null;
  let silenceTimer: any = null;
  let finalTranscript = '';
  let accumulatedInterim = '';
  let isStopped = false;
  let hasReceivedSpeech = false;

  // 1. Setup AudioContext volume analyser only if navigator.mediaDevices is available
  // On mobile browsers, delay or wrap in try/catch to avoid locking mic hardware before WebSpeech
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  if (!isMobile) {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        cleanupVolume = setupWebVolumeAnalyser(stream, (vol) => {
          if (!isStopped && handlers.onVolumeChange) {
            handlers.onVolumeChange(vol);
          }
        });
      }
    } catch (micErr) {
      console.warn('[SpeechService] Mic stream for volume failed, continuing with recognition:', micErr);
    }
  }

  const resetSilenceTimer = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    // When user stops speaking for 1.7 seconds, auto-submit
    silenceTimer = setTimeout(() => {
      const bestText = deduplicateSpeechTranscript((finalTranscript + ' ' + accumulatedInterim).trim());
      if (bestText.length > 0 && !isStopped) {
        console.log('[SpeechService] Auto-silence detected after speech, finalizing:', bestText);
        finalizeSpeech(bestText);
      }
    }, 1700);
  };

  const finalizeSpeech = (text: string) => {
    if (isStopped) return;
    isStopped = true;
    if (silenceTimer) clearTimeout(silenceTimer);

    try {
      recognition.stop();
    } catch {}

    cleanupResources();

    const normalized = deduplicateSpeechTranscript(normalizePhoneticDevanagari(text.trim()));

    if (handlers.onStateChange) handlers.onStateChange('processing');
    if (handlers.onFinalResult) handlers.onFinalResult(normalized);
  };

  const cleanupResources = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (cleanupVolume) {
      cleanupVolume();
      cleanupVolume = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
  };

  recognition.onresult = (event: any) => {
    const finalParts: string[] = [];
    const interimParts: string[] = [];

    for (let i = 0; i < event.results.length; i++) {
      const item = event.results[i];
      const text = (item[0]?.transcript || '').trim();
      if (!text) continue;

      if (item.isFinal) {
        if (finalParts.length > 0) {
          const lastPart = finalParts[finalParts.length - 1];
          // If the new segment extends or duplicates the previous, replace it
          if (text.toLowerCase().startsWith(lastPart.toLowerCase())) {
            finalParts[finalParts.length - 1] = text;
          } else if (!lastPart.toLowerCase().includes(text.toLowerCase())) {
            finalParts.push(text);
          }
        } else {
          finalParts.push(text);
        }
      } else {
        interimParts.push(text);
      }
    }

    const currentFinal = deduplicateSpeechTranscript(finalParts.join(' '));
    const currentInterim = deduplicateSpeechTranscript(interimParts.join(' '));

    finalTranscript = currentFinal;
    accumulatedInterim = currentInterim;

    const rawCombined = (currentFinal + ' ' + currentInterim).trim();
    const combined = deduplicateSpeechTranscript(rawCombined);

    if (combined.length > 0) {
      hasReceivedSpeech = true;
      const normalizedCombined = normalizePhoneticDevanagari(combined);
      if (handlers.onInterimResult) {
        handlers.onInterimResult(normalizedCombined);
      }
      resetSilenceTimer();
    }
  };

  recognition.onerror = (event: any) => {
    console.warn('[SpeechService] WebSpeech error:', event.error);
    if (event.error === 'no-speech') {
      // User hasn't spoken yet; keep listening unless manually stopped
      return;
    }
    if (event.error === 'not-allowed') {
      cleanupResources();
      isStopped = true;
      if (handlers.onError) {
        handlers.onError(
          language === 'hi'
            ? 'माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग्स में अनुमति दें।'
            : 'Microphone permission denied. Please allow microphone access.'
        );
      }
    }
  };

  recognition.onend = () => {
    console.log('[SpeechService] WebSpeech ended');
    if (!isStopped) {
      const candidate = deduplicateSpeechTranscript((finalTranscript + ' ' + accumulatedInterim).trim());
      if (candidate.length > 0) {
        finalizeSpeech(candidate);
      } else {
        cleanupResources();
      }
    }
  };

  try {
    recognition.start();
  } catch (err: any) {
    console.error('[SpeechService] Failed to start WebSpeech:', err);
    cleanupResources();
    throw err;
  }

  return {
    stop: async () => {
      isStopped = true;
      if (silenceTimer) clearTimeout(silenceTimer);
      try {
        recognition.stop();
      } catch {}
      cleanupResources();
      const res = (finalTranscript + ' ' + accumulatedInterim).trim();
      return normalizePhoneticDevanagari(res);
    },
    abort: () => {
      isStopped = true;
      if (silenceTimer) clearTimeout(silenceTimer);
      try {
        recognition.abort();
      } catch {}
      cleanupResources();
    },
  };
}

/**
 * Fallback session using MediaRecorder / Native audio + Groq Whisper
 */
async function startFallbackSession(
  language: 'hi' | 'en' | 'hinglish',
  handlers: SpeechRecognitionHandlers
): Promise<ActiveListeningSession> {
  await startRecording();

  return {
    stop: async () => {
      if (handlers.onStateChange) handlers.onStateChange('processing');
      const uri = await stopRecording();
      const transcribed = await transcribeAudio(uri, language);
      if (handlers.onFinalResult) {
        handlers.onFinalResult(transcribed);
      }
      return transcribed;
    },
    abort: () => {
      stopRecording().catch(() => {});
    },
  };
}

/**
 * Web AudioContext volume analyzer to measure real-time vocal input
 */
function setupWebVolumeAnalyser(
  stream: MediaStream,
  onVolume: (vol: number) => void
): () => void {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return () => {};

    const audioContext = new AudioCtx();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.4;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let active = true;
    let frameId: number | null = null;

    const tick = () => {
      if (!active) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      // Convert to 0.0 - 1.0 range
      const normalized = Math.min(1, Math.max(0, avg / 55));
      onVolume(normalized);
      frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      active = false;
      if (frameId) cancelAnimationFrame(frameId);
      try {
        source.disconnect();
        audioContext.close();
      } catch {}
    };
  } catch {
    return () => {};
  }
}
