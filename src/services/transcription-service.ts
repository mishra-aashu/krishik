import { Platform } from 'react-native';
import { Audio } from 'expo-av';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

let nativeRecording: Audio.Recording | null = null;
let webMediaRecorder: any = null; // Use any to prevent Web-only MediaRecorder TypeScript issues on native builds
let webAudioChunks: Blob[] = [];

/**
 * Start recording audio. Resolves when recording successfully begins.
 */
export async function startRecording(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !navigator.mediaDevices) {
      throw new Error('Audio recording is not supported on this browser/platform.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    
    webAudioChunks = [];
    mediaRecorder.ondataavailable = (event: any) => {
      if (event.data && event.data.size > 0) {
        webAudioChunks.push(event.data);
      }
    };

    mediaRecorder.start();
    webMediaRecorder = mediaRecorder;
  } else {
    // Request Native Permissions
    const permission = await Audio.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error('Microphone permission is required to record voice input.');
    }

    // Set Audio Mode for recording and playback in silent mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    nativeRecording = recording;
  }
}

/**
 * Stop recording audio. Resolves with the local URI or Blob URL of the recorded file.
 */
export async function stopRecording(): Promise<string> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      if (!webMediaRecorder) {
        reject(new Error('No recording session in progress.'));
        return;
      }

      webMediaRecorder.onstop = () => {
        const audioBlob = new Blob(webAudioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Stop all tracks to release microphone hardware
        if (webMediaRecorder.stream) {
          webMediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
        }
        webMediaRecorder = null;
        resolve(audioUrl);
      };

      webMediaRecorder.stop();
    });
  } else {
    if (!nativeRecording) {
      throw new Error('No recording session in progress.');
    }

    await nativeRecording.stopAndUnloadAsync();
    const uri = nativeRecording.getURI();
    nativeRecording = null;

    // Reset Audio Mode to default playback mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    if (!uri) {
      throw new Error('Failed to retrieve recording file URI.');
    }
    return uri;
  }
}

/**
 * Transcribe an audio file using Groq Whisper API.
 */
export async function transcribeAudio(
  fileUri: string,
  lang: 'hi' | 'en' | 'hinglish'
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API Key is not configured.');
  }

  const formData = new FormData();
  formData.append('model', 'whisper-large-v3');

  // Inject prompts and language hints to help Whisper transcribe Indian farming terms accurately
  if (lang === 'hi') {
    formData.append('language', 'hi');
    formData.append('prompt', 'किसान, खेती, फसल, खाद, यूरिया, कीट, कीटनाशक, सिंचाई, मिट्टी, मंडी भाव, मौसम');
  } else if (lang === 'hinglish') {
    formData.append('prompt', 'fasal, kheti, khad, urea, keet, keetnashak, sinchai, mitti, mandi bhav, mausam, kisan');
  } else {
    formData.append('language', 'en');
  }

  if (Platform.OS === 'web') {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    formData.append('file', blob, 'recording.webm');
  } else {
    const filename = fileUri.split('/').pop() || 'recording.m4a';
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: 'audio/m4a',
    } as any);
  }

  console.log(`[Whisper] Sending request for: ${fileUri} on platform: ${Platform.OS}`);

  const response = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[Whisper] API Error:', response.status, errText);
    throw new Error(`Whisper transcription failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.text || '';
}
