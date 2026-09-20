import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  FadeInUp,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { speakVernacular, stopSpeaking } from '@/services/voice-service';
import { processVoiceQuery, type VoiceQueryResult } from '@/services/voice-query-router';
import {
  startListeningSession,
  type ActiveListeningSession,
} from '@/services/speech-recognition-service';
import { useRouter } from 'expo-router';

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  language?: 'hi' | 'en';
}

type AssistantState = 'idle' | 'listening' | 'transcribing' | 'answering' | 'error';

export function VoiceAssistantModal({
  visible,
  onClose,
  language = 'hi',
}: VoiceAssistantModalProps) {
  const theme = useTheme();
  const router = useRouter();
  const { farmState, farmSoil, farmCrop } = useAuth();

  const [state, setState] = useState<AssistantState>('idle');
  const [transcribedQuery, setTranscribedQuery] = useState('');
  const [interimText, setInterimText] = useState('');
  const [result, setResult] = useState<VoiceQueryResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);

  const activeSessionRef = useRef<ActiveListeningSession | null>(null);

  // Pulse & volume animation for recording orb
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const volumeScale = useSharedValue(1);

  useEffect(() => {
    if (state === 'listening') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 900 }),
          withTiming(1, { duration: 900 })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.25, { duration: 900 }),
          withTiming(0.65, { duration: 900 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = 1;
      pulseOpacity.value = 0.6;
      volumeScale.value = 1;
    }
  }, [state]);

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * volumeScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Automatically start listening when modal opens
  useEffect(() => {
    if (visible) {
      beginListening();
    } else {
      handleModalCleanup();
    }
  }, [visible]);

  const handleModalCleanup = () => {
    stopSpeaking();
    if (activeSessionRef.current) {
      activeSessionRef.current.abort();
      activeSessionRef.current = null;
    }
    setState('idle');
    setTranscribedQuery('');
    setInterimText('');
    setResult(null);
    setErrorMessage(null);
    setIsSpeakingAudio(false);
  };

  const beginListening = async () => {
    try {
      await stopSpeaking();
      if (activeSessionRef.current) {
        activeSessionRef.current.abort();
        activeSessionRef.current = null;
      }

      setIsSpeakingAudio(false);
      setErrorMessage(null);
      setResult(null);
      setTranscribedQuery('');
      setInterimText('');
      setState('listening');

      const session = await startListeningSession(language, {
        onInterimResult: (text) => {
          setInterimText(text);
        },
        onVolumeChange: (vol) => {
          volumeScale.value = withTiming(1 + vol * 0.45, { duration: 80 });
        },
        onStateChange: (newState) => {
          if (newState === 'processing') {
            setState('transcribing');
          }
        },
        onFinalResult: (text) => {
          const clean = text.trim();
          if (clean.length > 0) {
            setTranscribedQuery(clean);
            handleExecuteQuery(clean);
          }
        },
        onError: (errText) => {
          setState('error');
          setErrorMessage(errText);
        },
      });

      activeSessionRef.current = session;
    } catch (err: any) {
      console.error('[VoiceAssistant] Start listening error:', err);
      setState('error');
      setErrorMessage(
        language === 'hi'
          ? 'माइक्रोफ़ोन चालू नहीं हो सका। कृपया ब्राउज़र में अनुमति जांचें।'
          : 'Could not access microphone. Please check browser permissions.'
      );
    }
  };

  const finishListeningAndProcess = async () => {
    if (state !== 'listening' || !activeSessionRef.current) return;

    try {
      setState('transcribing');
      const text = await activeSessionRef.current.stop();
      activeSessionRef.current = null;

      const bestText = (text || interimText).trim();
      if (!bestText) {
        setState('error');
        setErrorMessage(
          language === 'hi'
            ? 'आवाज़ साफ़ सुनाई नहीं दी। कृपया फिर से बोलें।'
            : 'Could not capture clear speech. Please speak again.'
        );
        return;
      }

      setTranscribedQuery(bestText);
      await handleExecuteQuery(bestText);
    } catch (err: any) {
      console.error('[VoiceAssistant] Processing error:', err);
      setState('error');
      setErrorMessage(
        language === 'hi'
          ? 'आवाज़ समझने में समस्या हुई। कृपया पुनः प्रयास करें।'
          : 'Failed to process voice input. Please try again.'
      );
    }
  };

  const handleExecuteQuery = async (queryText: string) => {
    try {
      setState('transcribing');
      const queryResult = await processVoiceQuery(
        queryText,
        {
          state: farmState,
          soilType: farmSoil,
          crop: farmCrop,
        },
        language
      );

      setResult(queryResult);
      setState('answering');

      // Automatically speak the response aloud in vernacular Hindi
      playSpokenResponse(queryResult.text);
    } catch (err: any) {
      console.error('[VoiceAssistant] AI Query execution error:', err);
      setState('error');
      setErrorMessage(
        language === 'hi'
          ? 'उत्तर प्राप्त करने में त्रुटि हुई।'
          : 'Could not get response.'
      );
    }
  };

  const playSpokenResponse = (textToSpeak: string) => {
    setIsSpeakingAudio(true);
    speakVernacular(textToSpeak, {
      language,
      onDone: () => setIsSpeakingAudio(false),
      onError: () => setIsSpeakingAudio(false),
    });
  };

  const toggleAudioPlayback = () => {
    if (isSpeakingAudio) {
      stopSpeaking();
      setIsSpeakingAudio(false);
    } else if (result?.text) {
      playSpokenResponse(result.text);
    }
  };

  const handleTransferToChat = () => {
    stopSpeaking();
    onClose();
    router.push({
      pathname: '/chat',
      params: {
        initialPrompt: transcribedQuery,
      },
    });
  };

  const SUGGESTION_CHIPS = [
    language === 'hi' ? '🌾 गेहूं में पीला रतुआ का इलाज क्या है?' : 'Wheat yellow rust treatment?',
    language === 'hi' ? '🌦️ आज का मौसम कैसा रहेगा?' : 'How is today weather?',
    language === 'hi' ? '💰 मंडी में आज धान का क्या भाव है?' : 'What is paddy mandi rate?',
    language === 'hi' ? '💧 खाद और यूरिया कब डालना चाहिए?' : 'When to apply urea fertilizer?',
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInUp.springify().damping(18)}
          style={[
            styles.sheetContainer,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.voiceLogoBadge, { backgroundColor: theme.primary + '18' }]}>
                <SymbolView
                  name={{ ios: 'waveform', android: 'graphic_eq', web: 'graphic_eq' } as any}
                  size={16}
                  tintColor={theme.primary}
                />
              </View>
              <View>
                <ThemedText style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>
                  {language === 'hi' ? 'कृषिक आवाज़ साथी' : 'Krishik Voice Assistant'}
                </ThemedText>
                <ThemedText style={{ fontSize: 10.5, color: theme.textSecondary }}>
                  {language === 'hi' ? 'अपनी भाषा में बोलकर पूछें' : 'Speak in your local language'}
                </ThemedText>
              </View>
            </View>

            <Pressable
              onPress={() => {
                stopSpeaking();
                onClose();
              }}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && { opacity: 0.8 },
              ]}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' } as any}
                size={14}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. STATE: LISTENING */}
            {state === 'listening' && (
              <View style={styles.centerSection}>
                <View style={styles.micOrbWrapper}>
                  <Animated.View
                    style={[
                      styles.pulsingRing,
                      { backgroundColor: theme.primary + '30' },
                      animatedOrbStyle,
                    ]}
                  />
                  <Pressable
                    onPress={finishListeningAndProcess}
                    style={[styles.micOrbButton, { backgroundColor: theme.primary }]}
                  >
                    <SymbolView
                      name={{ ios: 'mic.fill', android: 'mic', web: 'mic' } as any}
                      size={32}
                      tintColor="#FFFFFF"
                    />
                  </Pressable>
                </View>

                <ThemedText style={styles.stateTitle}>
                  {interimText
                    ? (language === 'hi' ? 'आप बोल रहे हैं...' : 'Speaking...')
                    : (language === 'hi' ? 'सुन रहे हैं... बोलिए' : 'Listening... Speak now')}
                </ThemedText>
                <ThemedText style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
                  {interimText
                    ? (language === 'hi'
                        ? 'रुकते ही उत्तर स्वतः आ जाएगा, या नीचे बटन दबाएं'
                        : 'Pause speaking to auto-answer, or tap button below')
                    : (language === 'hi'
                        ? 'अपनी भाषा में बोलें या नीचे दिए सवाल चुनें'
                        : 'Speak in your language or select a suggestion')}
                </ThemedText>

                {/* Live Speech Recognition Bubble */}
                {interimText ? (
                  <View
                    style={[
                      styles.liveSpeechBox,
                      {
                        backgroundColor: theme.primary + '14',
                        borderColor: theme.primary + '40',
                      },
                    ]}
                  >
                    <View style={styles.liveSpeechHeaderRow}>
                      <View style={[styles.liveBlinkingDot, { backgroundColor: theme.primary }]} />
                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>
                        {language === 'hi' ? 'लाइव आवाज़ पहचान:' : 'Live speech detected:'}
                      </ThemedText>
                    </View>
                    <ThemedText style={{ fontSize: 14.5, fontWeight: '700', color: theme.text, marginTop: 4 }}>
                      "{interimText}"
                    </ThemedText>
                  </View>
                ) : null}

                <Pressable
                  onPress={finishListeningAndProcess}
                  style={({ pressed }) => [
                    styles.doneRecordingBtn,
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' } as any}
                    size={16}
                    tintColor="#FFFFFF"
                  />
                  <ThemedText style={styles.doneRecordingText}>
                    {language === 'hi' ? 'बोलना पूरा हुआ ›' : 'Done Speaking ›'}
                  </ThemedText>
                </Pressable>

                {/* Prompt Suggestions */}
                <View style={styles.suggestionsContainer}>
                  <ThemedText style={[styles.suggestionHeader, { color: theme.textSecondary }]}>
                    {language === 'hi' ? 'उदाहरण के लिए ऐसे पूछें:' : 'Example questions:'}
                  </ThemedText>
                  {SUGGESTION_CHIPS.map((chip, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        if (activeSessionRef.current) {
                          activeSessionRef.current.abort();
                          activeSessionRef.current = null;
                        }
                        setTranscribedQuery(chip);
                        handleExecuteQuery(chip);
                      }}
                      style={({ pressed }) => [
                        styles.suggestionChip,
                        { backgroundColor: theme.background, borderColor: theme.border },
                        pressed && { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <ThemedText style={{ fontSize: 12, color: theme.text }}>
                        {chip}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* 2. STATE: TRANSCRIBING / PROCESSING */}
            {state === 'transcribing' && (
              <View style={styles.centerSection}>
                <View style={[styles.processingOrb, { backgroundColor: theme.primary + '15' }]}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>

                <ThemedText style={styles.stateTitle}>
                  {language === 'hi' ? 'समझ रहे हैं...' : 'Processing speech...'}
                </ThemedText>
                <ThemedText style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
                  {language === 'hi'
                    ? 'सटीक कृषि सलाह तैयार की जा रही है'
                    : 'Preparing localized agricultural advice'}
                </ThemedText>

                {transcribedQuery ? (
                  <View style={[styles.recognizedQueryBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <ThemedText style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>
                      {language === 'hi' ? 'आपका सवाल:' : 'Your Question:'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginTop: 3 }}>
                      "{transcribedQuery}"
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            )}

            {/* 3. STATE: ANSWERING */}
            {state === 'answering' && result && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.answeringContainer}>
                {/* Recognized Query Pill */}
                <View style={[styles.questionPill, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
                  <SymbolView
                    name={{ ios: 'person.crop.circle', android: 'person', web: 'person' } as any}
                    size={14}
                    tintColor={theme.primary}
                  />
                  <ThemedText style={{ fontSize: 12.5, fontWeight: '700', color: theme.primary, flex: 1 }} numberOfLines={2}>
                    {transcribedQuery}
                  </ThemedText>
                </View>

                {/* Answer Card */}
                <View style={[styles.answerCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <View style={styles.answerCardHeader}>
                    <View style={styles.answerSourceBadge}>
                      <SymbolView
                        name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                        size={14}
                        tintColor={theme.primary}
                      />
                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>
                        {result.title || (language === 'hi' ? 'कृषिक सलाह' : 'Advice')}
                      </ThemedText>
                    </View>

                    {/* Audio Wave / Speaker Indicator */}
                    <Pressable
                      onPress={toggleAudioPlayback}
                      style={({ pressed }) => [
                        styles.audioToggleBtn,
                        {
                          backgroundColor: isSpeakingAudio ? theme.primary : theme.backgroundSelected,
                          borderColor: isSpeakingAudio ? theme.primary : theme.border,
                        },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <SymbolView
                        name={{
                          ios: isSpeakingAudio ? 'speaker.wave.3.fill' : 'speaker.slash.fill',
                          android: isSpeakingAudio ? 'volume_up' : 'volume_off',
                          web: isSpeakingAudio ? 'volume_up' : 'volume_off',
                        } as any}
                        size={13}
                        tintColor={isSpeakingAudio ? '#FFFFFF' : theme.textSecondary}
                      />
                      <ThemedText
                        style={{
                          fontSize: 10.5,
                          fontWeight: '700',
                          color: isSpeakingAudio ? '#FFFFFF' : theme.textSecondary,
                        }}
                      >
                        {isSpeakingAudio
                          ? (language === 'hi' ? 'बोल रहे हैं...' : 'Speaking...')
                          : (language === 'hi' ? 'फिर से सुनें' : 'Listen')}
                      </ThemedText>
                    </Pressable>
                  </View>

                  {/* Main Answer Text (Formatted clearly for reading) */}
                  <ThemedText style={styles.answerContentText}>
                    {result.text}
                  </ThemedText>
                </View>

                {/* Bottom Voice Controls */}
                <View style={styles.answeringActionsRow}>
                  <Pressable
                    onPress={beginListening}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: theme.primary },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'mic.fill', android: 'mic', web: 'mic' } as any}
                      size={15}
                      tintColor="#FFFFFF"
                    />
                    <ThemedText style={styles.actionBtnText}>
                      {language === 'hi' ? 'और पूछें' : 'Ask More'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={handleTransferToChat}
                    style={({ pressed }) => [
                      styles.actionButtonSecondary,
                      { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'chat', web: 'chat' } as any}
                      size={15}
                      tintColor={theme.primary}
                    />
                    <ThemedText style={[styles.actionBtnTextSecondary, { color: theme.primary }]}>
                      {language === 'hi' ? 'पूरी चैट देखें' : 'View Full Chat'}
                    </ThemedText>
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {/* 4. STATE: ERROR */}
            {state === 'error' && (
              <View style={styles.centerSection}>
                <View style={[styles.errorIconCircle, { backgroundColor: theme.error + '15' }]}>
                  <SymbolView
                    name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' } as any}
                    size={28}
                    tintColor={theme.error}
                  />
                </View>
                <ThemedText style={[styles.errorTitle, { color: theme.error }]}>
                  {language === 'hi' ? 'क्षमा करें' : 'Notice'}
                </ThemedText>
                <ThemedText style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
                  {errorMessage || (language === 'hi' ? 'कुछ गड़बड़ हुई' : 'Something went wrong')}
                </ThemedText>

                <Pressable
                  onPress={beginListening}
                  style={({ pressed }) => [
                    styles.retryBtn,
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' } as any}
                    size={14}
                    tintColor="#FFFFFF"
                  />
                  <ThemedText style={styles.doneRecordingText}>
                    {language === 'hi' ? 'पुनः प्रयास करें' : 'Try Again'}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: Spacing.four,
    ...Platform.select({
      web: {
        maxWidth: 520,
        alignSelf: 'center',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    padding: Spacing.three,
  },
  centerSection: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  micOrbWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.two,
    position: 'relative',
  },
  pulsingRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  micOrbButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(22, 163, 74, 0.4)',
      },
      default: {
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  processingOrb: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 12.5,
    marginTop: 4,
    textAlign: 'center',
  },
  liveSpeechBox: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 14,
    marginBottom: 4,
  },
  liveSpeechHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBlinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  doneRecordingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 18,
  },
  doneRecordingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginTop: 16,
  },
  suggestionsContainer: {
    width: '100%',
    marginTop: 22,
    gap: 8,
  },
  suggestionHeader: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  suggestionChip: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  recognizedQueryBox: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  answeringContainer: {
    gap: 12,
  },
  questionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  answerCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  answerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  answerSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  audioToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  answerContentText: {
    fontSize: 14.5,
    lineHeight: 22,
  },
  answeringActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnTextSecondary: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
});
