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
import { CustomMarkdown } from './custom-markdown';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { speakVernacular, stopSpeaking } from '@/services/voice-service';
import { processVoiceQuery, type VoiceQueryResult } from '@/services/voice-query-router';
import {
  startListeningSession,
  type ActiveListeningSession,
} from '@/services/speech-recognition-service';
import {
  getVoiceHistory,
  saveVoiceHistoryItem,
  deleteVoiceHistoryItem,
  clearVoiceHistory,
  type VoiceHistoryItem,
} from '@/services/voice-history-service';
import { LocalStorage } from '@/utils/storage';
import { useRouter } from 'expo-router';

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  language?: 'hi' | 'en';
}

type AssistantState = 'idle' | 'listening' | 'transcribing' | 'answering' | 'error';

function formatRelativeTime(timestamp: number, lang: 'hi' | 'en' = 'hi'): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) {
    return lang === 'hi' ? 'अभी-अभी' : 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return lang === 'hi' ? `${diffMin} मि. पहले` : `${diffMin}m ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return lang === 'hi' ? `${diffHr} घं. पहले` : `${diffHr}h ago`;
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function VoiceAssistantModal({
  visible,
  onClose,
  language = 'hi',
}: VoiceAssistantModalProps) {
  const theme = useTheme();
  const router = useRouter();
  const { farmState, farmSoil, farmCrop } = useAuth();

  const [currentLang, setCurrentLang] = useState<'hi' | 'en'>(language || 'hi');
  const [state, setState] = useState<AssistantState>('idle');
  const [transcribedQuery, setTranscribedQuery] = useState('');
  const [interimText, setInterimText] = useState('');
  const [result, setResult] = useState<VoiceQueryResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<VoiceHistoryItem[]>([]);
  const [playingHistoryId, setPlayingHistoryId] = useState<string | null>(null);

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

  // Sync state with language prop
  useEffect(() => {
    if (language) {
      setCurrentLang(language);
    }
  }, [language]);

  // Automatically start listening when modal opens
  useEffect(() => {
    if (visible) {
      setShowHistory(false);
      setPlayingHistoryId(null);
      loadHistory();
      const activeLang = language || currentLang || 'en';
      setCurrentLang(activeLang);
      beginListening(activeLang);
    } else {
      handleModalCleanup();
    }
  }, [visible, language]);

  const loadHistory = async () => {
    try {
      const items = await getVoiceHistory();
      setHistoryItems(items);
    } catch (err) {
      console.warn('[VoiceAssistant] Error loading history:', err);
    }
  };

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
    setShowHistory(false);
    setPlayingHistoryId(null);
  };

  const handleSwitchLanguage = async (newLang: 'hi' | 'en') => {
    if (newLang === currentLang) return;
    setCurrentLang(newLang);
    await LocalStorage.setItem('krishik_voice_lang', newLang);

    // If currently listening, restart listening in the new language
    if (state === 'listening') {
      beginListening(newLang);
    }
  };

  const beginListening = async (overrideLang?: 'hi' | 'en') => {
    const activeLang = overrideLang || currentLang;
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

      const session = await startListeningSession(activeLang, {
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
            handleExecuteQuery(clean, activeLang);
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
        activeLang === 'hi'
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
          currentLang === 'hi'
            ? 'आवाज़ साफ़ सुनाई नहीं दी। कृपया फिर से बोलें।'
            : 'Could not capture clear speech. Please speak again.'
        );
        return;
      }

      setTranscribedQuery(bestText);
      await handleExecuteQuery(bestText, currentLang);
    } catch (err: any) {
      console.error('[VoiceAssistant] Processing error:', err);
      setState('error');
      setErrorMessage(
        currentLang === 'hi'
          ? 'आवाज़ समझने में समस्या हुई। कृपया पुनः प्रयास करें।'
          : 'Failed to process voice input. Please try again.'
      );
    }
  };

  const handleExecuteQuery = async (queryText: string, langToUse?: 'hi' | 'en') => {
    const activeLang = langToUse || currentLang;
    try {
      setState('transcribing');
      const queryResult = await processVoiceQuery(
        queryText,
        {
          state: farmState,
          soilType: farmSoil,
          crop: farmCrop,
        },
        activeLang
      );

      setResult(queryResult);
      setState('answering');

      // Automatically speak the response aloud in vernacular Hindi / English
      playSpokenResponse(queryResult.text, activeLang);

      // Save to persistent voice history
      saveVoiceHistoryItem({
        query: queryText,
        answer: queryResult.text,
        source: queryResult.source,
        title: queryResult.title,
        language: activeLang,
      })
        .then(() => {
          loadHistory();
        })
        .catch((e) => {
          console.warn('[VoiceAssistant] Failed to save history:', e);
        });
    } catch (err: any) {
      console.error('[VoiceAssistant] AI Query execution error:', err);
      setState('error');
      setErrorMessage(
        activeLang === 'hi'
          ? 'उत्तर प्राप्त करने में त्रुटि हुई।'
          : 'Could not get response.'
      );
    }
  };

  const toggleHistoryView = () => {
    stopSpeaking();
    setIsSpeakingAudio(false);
    setPlayingHistoryId(null);

    if (!showHistory) {
      if (activeSessionRef.current) {
        activeSessionRef.current.abort();
        activeSessionRef.current = null;
      }
      setShowHistory(true);
      loadHistory();
    } else {
      setShowHistory(false);
      beginListening();
    }
  };

  const togglePlayHistoryAudio = (item: VoiceHistoryItem) => {
    if (playingHistoryId === item.id) {
      stopSpeaking();
      setPlayingHistoryId(null);
    } else {
      stopSpeaking();
      setPlayingHistoryId(item.id);
      speakVernacular(item.answer, {
        language: item.language,
        onDone: () => setPlayingHistoryId(null),
        onError: () => setPlayingHistoryId(null),
      });
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    if (playingHistoryId === id) {
      stopSpeaking();
      setPlayingHistoryId(null);
    }
    const updated = await deleteVoiceHistoryItem(id);
    setHistoryItems(updated);
  };

  const handleClearAllHistory = async () => {
    stopSpeaking();
    setPlayingHistoryId(null);
    await clearVoiceHistory();
    setHistoryItems([]);
  };

  const handleOpenHistoryItem = (item: VoiceHistoryItem) => {
    stopSpeaking();
    setTranscribedQuery(item.query);
    setResult({
      text: item.answer,
      source: item.source,
      title: item.title,
    });
    setShowHistory(false);
    setState('answering');
    playSpokenResponse(item.answer);
  };

  const handleTransferHistoryToChat = (item: VoiceHistoryItem) => {
    stopSpeaking();
    onClose();
    router.push({
      pathname: '/chat',
      params: {
        initialPrompt: item.query,
      },
    });
  };

  const playSpokenResponse = (textToSpeak: string, langToUse?: 'hi' | 'en') => {
    const activeLang = langToUse || currentLang;
    setIsSpeakingAudio(true);
    speakVernacular(textToSpeak, {
      language: activeLang,
      onDone: () => setIsSpeakingAudio(false),
      onError: () => setIsSpeakingAudio(false),
    });
  };

  const toggleAudioPlayback = () => {
    if (isSpeakingAudio) {
      stopSpeaking();
      setIsSpeakingAudio(false);
    } else if (result?.text) {
      playSpokenResponse(result.text, currentLang);
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

  const SUGGESTION_ITEMS = [
    {
      icon: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
      hi: 'गेहूं में पीला रतुआ का इलाज क्या है?',
      en: 'What is wheat yellow rust disease treatment?',
    },
    {
      icon: { ios: 'cloud.rain.fill', android: 'grain', web: 'grain' },
      hi: 'आज का मौसम व बारिश का अनुमान क्या है?',
      en: "Today's weather and rain forecast?",
    },
    {
      icon: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
      hi: 'मंडी में आज धान और गेहूं का क्या भाव है?',
      en: 'Current paddy and wheat mandi prices?',
    },
    {
      icon: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
      hi: 'खाद और यूरिया कब और कितना डालना चाहिए?',
      en: 'When and how much urea fertilizer to use?',
    },
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
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 14.5, fontWeight: '800', color: theme.text }}>
                  {currentLang === 'hi' ? 'कृषिक आवाज़ साथी' : 'Krishik Voice Assistant'}
                </ThemedText>
                <ThemedText numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 10.5, color: theme.textSecondary }}>
                  {currentLang === 'hi' ? 'अपनी भाषा में बोलकर पूछें' : 'Speak in your local language'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.headerRightRow}>
              <Pressable
                onPress={toggleHistoryView}
                style={({ pressed }) => [
                  styles.historyHeaderBtn,
                  {
                    backgroundColor: showHistory ? theme.primary : theme.primary + '18',
                    borderColor: showHistory ? theme.primary : theme.primary + '35',
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <SymbolView
                  name={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' } as any}
                  size={13}
                  tintColor={showHistory ? theme.onPrimary : theme.primary}
                />
                <ThemedText
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: showHistory ? theme.onPrimary : theme.primary,
                  }}
                >
                  {currentLang === 'hi' ? 'इतिहास' : 'History'}
                  {historyItems.length > 0 ? ` (${historyItems.length})` : ''}
                </ThemedText>
              </Pressable>

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
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            {showHistory ? (
              <View style={styles.historyContainer}>
                {/* History Header Controls */}
                <View style={styles.historySubheader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ThemedText style={{ fontSize: 13.5, fontWeight: '800', color: theme.text }}>
                      {currentLang === 'hi' ? 'पिछली बातचीत' : 'Voice History'}
                    </ThemedText>
                    {historyItems.length > 0 && (
                      <View style={[styles.countBadge, { backgroundColor: theme.primary + '18' }]}>
                        <ThemedText style={{ fontSize: 10.5, fontWeight: '800', color: theme.primary }}>
                          {historyItems.length}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {historyItems.length > 0 && (
                      <Pressable
                        onPress={handleClearAllHistory}
                        style={({ pressed }) => [
                          styles.clearHistoryBtn,
                          { borderColor: theme.border },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <ThemedText style={{ fontSize: 11, fontWeight: '600', color: theme.error }}>
                          {currentLang === 'hi' ? 'साफ़ करें' : 'Clear'}
                        </ThemedText>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={toggleHistoryView}
                      style={({ pressed }) => [
                        styles.backToMicBtn,
                        { backgroundColor: theme.primary },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <SymbolView
                        name={{ ios: 'mic.fill', android: 'mic', web: 'mic' } as any}
                        size={12}
                        tintColor={theme.onPrimary}
                      />
                      <ThemedText style={{ fontSize: 11.5, fontWeight: '700', color: theme.onPrimary }}>
                        {currentLang === 'hi' ? 'नया सवाल' : 'New Query'}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                {historyItems.length === 0 ? (
                  <View style={styles.emptyHistoryBox}>
                    <View style={[styles.emptyHistoryIcon, { backgroundColor: theme.primary + '14' }]}>
                      <SymbolView
                        name={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' } as any}
                        size={28}
                        tintColor={theme.primary}
                      />
                    </View>
                    <ThemedText style={{ fontSize: 15, fontWeight: '700', color: theme.text, marginTop: 8 }}>
                      {currentLang === 'hi' ? 'कोई आवाज़ इतिहास नहीं है' : 'No Voice History Yet'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                      {currentLang === 'hi'
                        ? 'आप जो भी सवाल आवाज़ से पूछेंगे, वे यहाँ सुरक्षित रहेंगे ताकि आप उन्हें कभी भी दोबारा सुन सकें।'
                        : 'Questions you ask by voice will be saved here so you can re-listen at any time.'}
                    </ThemedText>
                    <Pressable
                      onPress={toggleHistoryView}
                      style={({ pressed }) => [
                        styles.emptyAskBtn,
                        { backgroundColor: theme.primary },
                        pressed && { opacity: 0.88 },
                      ]}
                    >
                      <SymbolView
                        name={{ ios: 'mic.fill', android: 'mic', web: 'mic' } as any}
                        size={15}
                        tintColor={theme.onPrimary}
                      />
                      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: theme.onPrimary }}>
                        {currentLang === 'hi' ? 'बोलकर सवाल पूछें' : 'Ask Question Now'}
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.historyList}>
                    {historyItems.map((item) => {
                      const isPlaying = playingHistoryId === item.id;
                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.historyCard,
                            {
                              backgroundColor: theme.background,
                              borderColor: isPlaying ? theme.primary : theme.border,
                            },
                          ]}
                        >
                          {/* Top Question Row */}
                          <View style={styles.historyCardHeader}>
                            <View style={styles.historyQueryRow}>
                              <View style={[styles.historyMicBadge, { backgroundColor: theme.primary + '18' }]}>
                                <SymbolView
                                  name={{ ios: 'waveform', android: 'graphic_eq', web: 'graphic_eq' } as any}
                                  size={13}
                                  tintColor={theme.primary}
                                />
                              </View>
                              <ThemedText style={styles.historyQueryText} numberOfLines={2}>
                                {item.query}
                              </ThemedText>
                            </View>

                            <Pressable
                              onPress={() => handleDeleteHistoryItem(item.id)}
                              style={({ pressed }) => [
                                styles.deleteItemBtn,
                                pressed && { opacity: 0.7 },
                              ]}
                            >
                              <SymbolView
                                name={{ ios: 'trash', android: 'delete', web: 'delete' } as any}
                                size={13}
                                tintColor={theme.textSecondary}
                              />
                            </Pressable>
                          </View>

                          {/* Meta line: Time and Source */}
                          <View style={styles.historyMetaRow}>
                            <View style={[styles.historySourcePill, { backgroundColor: theme.primary + '14', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                              <SymbolView
                                name={
                                  item.source === 'weather'
                                    ? ({ ios: 'cloud.sun.fill', android: 'wb_sunny', web: 'wb_sunny' } as any)
                                    : item.source === 'mandi'
                                    ? ({ ios: 'banknote.fill', android: 'payments', web: 'payments' } as any)
                                    : ({ ios: 'leaf.fill', android: 'eco', web: 'eco' } as any)
                                }
                                size={11}
                                tintColor={theme.primary}
                              />
                              <ThemedText style={{ fontSize: 10, fontWeight: '700', color: theme.primary }}>
                                {item.source === 'weather'
                                  ? (currentLang === 'hi' ? 'मौसम' : 'Weather')
                                  : item.source === 'mandi'
                                  ? (currentLang === 'hi' ? 'मंडी भाव' : 'Mandi')
                                  : (currentLang === 'hi' ? 'कृषि सलाह' : 'Agri Advice')}
                              </ThemedText>
                            </View>
                            <ThemedText style={{ fontSize: 10.5, color: theme.textSecondary }}>
                              {formatRelativeTime(item.timestamp, currentLang)}
                            </ThemedText>
                          </View>

                          {/* Answer Snippet with CustomMarkdown */}
                          <View style={styles.historyAnswerBox}>
                            <CustomMarkdown text={item.answer} />
                          </View>

                          {/* History Card Actions */}
                          <View style={styles.historyCardActions}>
                            <Pressable
                              onPress={() => togglePlayHistoryAudio(item)}
                              style={({ pressed }) => [
                                styles.historyAudioBtn,
                                {
                                  backgroundColor: isPlaying ? theme.primary : theme.backgroundSelected,
                                  borderColor: isPlaying ? theme.primary : theme.border,
                                },
                                pressed && { opacity: 0.8 },
                              ]}
                            >
                              <SymbolView
                                name={{
                                  ios: isPlaying ? 'speaker.wave.3.fill' : 'speaker.wave.2',
                                  android: isPlaying ? 'volume_up' : 'volume_up',
                                  web: isPlaying ? 'volume_up' : 'volume_up',
                                } as any}
                                size={13}
                                tintColor={isPlaying ? theme.onPrimary : theme.primary}
                              />
                              <ThemedText
                                style={{
                                  fontSize: 11,
                                  fontWeight: '700',
                                  color: isPlaying ? theme.onPrimary : theme.text,
                                }}
                              >
                                {isPlaying
                                  ? (currentLang === 'hi' ? 'बोल रहे हैं...' : 'Playing...')
                                  : (currentLang === 'hi' ? 'आवाज़ सुनें' : 'Listen')}
                              </ThemedText>
                            </Pressable>

                            <Pressable
                              onPress={() => handleOpenHistoryItem(item)}
                              style={({ pressed }) => [
                                styles.historyExpandBtn,
                                { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                                pressed && { opacity: 0.8 },
                              ]}
                            >
                              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: theme.text }}>
                                {currentLang === 'hi' ? 'पूरा देखें' : 'View Full'}
                              </ThemedText>
                            </Pressable>

                            <Pressable
                              onPress={() => handleTransferHistoryToChat(item)}
                              style={({ pressed }) => [
                                styles.historyChatBtn,
                                { backgroundColor: theme.backgroundSelected, borderColor: theme.border },
                                pressed && { opacity: 0.8 },
                              ]}
                            >
                              <SymbolView
                                name={{ ios: 'bubble.left.and.bubble.right', android: 'chat', web: 'chat' } as any}
                                size={12}
                                tintColor={theme.primary}
                              />
                              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>
                                {currentLang === 'hi' ? 'चैट में' : 'In Chat'}
                              </ThemedText>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <>
                {/* 1. STATE: LISTENING */}
            {state === 'listening' && (
              <View style={styles.centerSection}>
                {/* Bilingual Language Switcher Pill */}
                <View
                  style={[
                    styles.langSwitcherPill,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => handleSwitchLanguage('hi')}
                    style={({ pressed }) => [
                      styles.langTabBtn,
                      currentLang === 'hi' && [
                        styles.langTabBtnActive,
                        { backgroundColor: theme.primary },
                      ],
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'character.book.closed.fill', android: 'translate', web: 'translate' } as any}
                      size={13}
                      tintColor={currentLang === 'hi' ? theme.onPrimary : theme.textSecondary}
                    />
                    <ThemedText
                      style={[
                        styles.langTabLabel,
                        { color: currentLang === 'hi' ? theme.onPrimary : theme.textSecondary },
                        currentLang === 'hi' && styles.langTabLabelActive,
                      ]}
                    >
                      हिंदी में बोलें
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSwitchLanguage('en')}
                    style={({ pressed }) => [
                      styles.langTabBtn,
                      currentLang === 'en' && [
                        styles.langTabBtnActive,
                        { backgroundColor: theme.primary },
                      ],
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'globe', android: 'language', web: 'language' } as any}
                      size={13}
                      tintColor={currentLang === 'en' ? theme.onPrimary : theme.textSecondary}
                    />
                    <ThemedText
                      style={[
                        styles.langTabLabel,
                        { color: currentLang === 'en' ? theme.onPrimary : theme.textSecondary },
                        currentLang === 'en' && styles.langTabLabelActive,
                      ]}
                    >
                      Speak in English
                    </ThemedText>
                  </Pressable>
                </View>

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
                      tintColor={theme.onPrimary}
                    />
                  </Pressable>
                </View>

                <ThemedText style={styles.stateTitle}>
                  {interimText
                    ? (currentLang === 'hi' ? 'आप बोल रहे हैं...' : 'Speaking...')
                    : (currentLang === 'hi' ? 'सुन रहे हैं... बोलिए' : 'Listening... Speak now')}
                </ThemedText>
                <ThemedText style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
                  {interimText
                    ? (currentLang === 'hi'
                        ? 'रुकते ही उत्तर स्वतः आ जाएगा, या नीचे बटन दबाएं'
                        : 'Pause speaking to auto-answer, or tap button below')
                    : (currentLang === 'hi'
                        ? 'अपनी भाषा में बोलें या नीचे दिए सवाल चुनें'
                        : 'Speak clearly into mic or select a question below')}
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
                        {currentLang === 'hi' ? 'लाइव आवाज़ पहचान:' : 'Live speech detected:'}
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
                    tintColor={theme.onPrimary}
                  />
                  <ThemedText style={[styles.doneRecordingText, { color: theme.onPrimary }]}>
                    {currentLang === 'hi' ? 'बोलना पूरा हुआ ›' : 'Done Speaking ›'}
                  </ThemedText>
                </Pressable>

                {/* Prompt Suggestions */}
                <View style={styles.suggestionsContainer}>
                  <ThemedText style={[styles.suggestionHeader, { color: theme.textSecondary }]}>
                    {currentLang === 'hi' ? 'उदाहरण के लिए ऐसे पूछें:' : 'Example questions:'}
                  </ThemedText>
                  {SUGGESTION_ITEMS.map((item, idx) => {
                    const qText = currentLang === 'hi' ? item.hi : item.en;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          if (activeSessionRef.current) {
                            activeSessionRef.current.abort();
                            activeSessionRef.current = null;
                          }
                          setTranscribedQuery(qText);
                          handleExecuteQuery(qText, currentLang);
                        }}
                        style={({ pressed }) => [
                          styles.suggestionChip,
                          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                          pressed && { backgroundColor: theme.backgroundSelected },
                        ]}
                      >
                        <View style={[styles.suggestionIconBox, { backgroundColor: theme.primary + '18' }]}>
                          <SymbolView
                            name={item.icon as any}
                            size={14}
                            tintColor={theme.primary}
                          />
                        </View>
                        <ThemedText style={{ fontSize: 13, color: theme.text, flex: 1, fontWeight: '600' }} numberOfLines={1}>
                          {qText}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Recent Voice Queries Quick Access */}
                {historyItems.length > 0 && (
                  <View style={styles.recentQueriesContainer}>
                    <View style={styles.recentQueriesHeader}>
                      <ThemedText style={[styles.suggestionHeader, { color: theme.textSecondary }]}>
                        {currentLang === 'hi' ? 'हाल ही में पूछे गए सवाल:' : 'Recently asked questions:'}
                      </ThemedText>
                      <Pressable onPress={toggleHistoryView}>
                        <ThemedText style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>
                          {currentLang === 'hi' ? 'सभी इतिहास ›' : 'View history ›'}
                        </ThemedText>
                      </Pressable>
                    </View>
                    {historyItems.slice(0, 2).map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => handleOpenHistoryItem(item)}
                        style={({ pressed }) => [
                          styles.recentQueryChip,
                          { backgroundColor: theme.background, borderColor: theme.border },
                          pressed && { backgroundColor: theme.backgroundSelected },
                        ]}
                      >
                        <SymbolView
                          name={{ ios: 'clock.arrow.circlepath', android: 'history', web: 'history' } as any}
                          size={12}
                          tintColor={theme.primary}
                        />
                        <ThemedText style={{ fontSize: 12, color: theme.text, flex: 1 }} numberOfLines={1}>
                          {item.query}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 10, color: theme.textSecondary }}>
                          {formatRelativeTime(item.timestamp, currentLang)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 2. STATE: TRANSCRIBING / PROCESSING */}
            {state === 'transcribing' && (
              <View style={styles.centerSection}>
                <View style={[styles.processingOrb, { backgroundColor: theme.primary + '15' }]}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>

                <ThemedText style={styles.stateTitle}>
                  {currentLang === 'hi' ? 'समझ रहे हैं...' : 'Processing speech...'}
                </ThemedText>
                <ThemedText style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
                  {currentLang === 'hi'
                    ? 'सटीक कृषि सलाह तैयार की जा रही है'
                    : 'Preparing localized agricultural advice'}
                </ThemedText>

                {transcribedQuery ? (
                  <View style={[styles.recognizedQueryBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <ThemedText style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>
                      {currentLang === 'hi' ? 'आपका सवाल:' : 'Your Question:'}
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
                        {result.title || (currentLang === 'hi' ? 'कृषिक सलाह' : 'Advice')}
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
                          ? (currentLang === 'hi' ? 'बोल रहे हैं...' : 'Speaking...')
                          : (currentLang === 'hi' ? 'फिर से सुनें' : 'Listen')}
                      </ThemedText>
                    </Pressable>
                  </View>

                  {/* Main Answer Text (Formatted beautifully with CustomMarkdown) */}
                  <View style={styles.markdownWrapper}>
                    <CustomMarkdown text={result.text} />
                  </View>
                </View>

                {/* Bottom Voice Controls */}
                <View style={styles.answeringActionsRow}>
                  <Pressable
                    onPress={() => beginListening(currentLang)}
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
                      {currentLang === 'hi' ? 'और पूछें' : 'Ask More'}
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
                      {currentLang === 'hi' ? 'पूरी चैट देखें' : 'View Full Chat'}
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
                  {currentLang === 'hi' ? 'क्षमा करें' : 'Notice'}
                </ThemedText>
                <ThemedText style={[styles.stateSubtitle, { color: theme.textSecondary }]}>
                  {errorMessage || (currentLang === 'hi' ? 'कुछ गड़बड़ हुई' : 'Something went wrong')}
                </ThemedText>

                <Pressable
                  onPress={() => beginListening(currentLang)}
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
                    {currentLang === 'hi' ? 'पुनः प्रयास करें' : 'Try Again'}
                  </ThemedText>
                </Pressable>
              </View>
            )}
              </>
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
    gap: 8,
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  voiceLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
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
  langSwitcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: Spacing.two,
    alignSelf: 'center',
  },
  langTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  langTabBtnActive: {
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
      },
      default: {
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  langTabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  langTabLabelActive: {
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  suggestionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
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
    gap: 12,
    width: '100%',
    overflow: 'hidden',
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
  markdownWrapper: {
    width: '100%',
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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  historyContainer: {
    gap: 12,
  },
  historySubheader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  clearHistoryBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  backToMicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyHistoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyAskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginTop: 16,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    overflow: 'hidden',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  historyQueryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  historyMicBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyQueryText: {
    fontSize: 13.5,
    fontWeight: '700',
    flex: 1,
  },
  deleteItemBtn: {
    padding: 4,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historySourcePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  historyAnswerBox: {
    paddingVertical: 2,
  },
  historyCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  historyAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyExpandBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  recentQueriesContainer: {
    width: '100%',
    marginTop: 18,
    gap: 8,
  },
  recentQueriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentQueryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
