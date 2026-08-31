import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { Colors, Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/auth-context';
import { LocalStorage } from '@/utils/storage';
import { sendMessageToGroq, type ModelMode } from '@/services/chat-service';
import { CustomMarkdown } from '@/components/custom-markdown';
import Animated, {
  FadeInRight,
  FadeInLeft,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { startRecording, stopRecording, transcribeAudio } from '@/services/transcription-service';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  crop: string;
  timestamp: string;
  messages: ChatMessage[];
}

export default function ChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ prefill?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);

  // Profile context from global auth context
  const { farmState, farmSoil, farmCrop } = useAuth();

  // Chat settings
  const [language, setLanguage] = useState<'hi' | 'en' | 'hinglish'>('hi');
  const isCompactHeader = width < 400;
  const [model, setModel] = useState<ModelMode>('fast');

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Multi-session state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Voice & speech states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Animated mic scaling for flashing/pulsing effect when recording
  const micScale = useSharedValue(1);
  const micOpacity = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      micScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 500 }),
          withTiming(1.0, { duration: 500 })
        ),
        -1,
        false
      );
      micOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 500 }),
          withTiming(1.0, { duration: 500 })
        ),
        -1,
        false
      );
    } else {
      micScale.value = withTiming(1.0, { duration: 200 });
      micOpacity.value = withTiming(1.0, { duration: 200 });
    }
  }, [isRecording]);

  const animatedMicStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: micScale.value }],
      opacity: micOpacity.value,
    };
  });

  // Stop reading aloud when leaving the chat
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleVoiceInput = async () => {
    if (isRecording) {
      try {
        const uri = await stopRecording();
        setIsRecording(false);
        setIsTranscribing(true);
        setErrorMsg(null);
        
        const transcribedText = await transcribeAudio(uri, language);
        if (transcribedText.trim()) {
          setInputValue(transcribedText);
        }
      } catch (err: any) {
        console.error('Recording/transcription error:', err);
        setErrorMsg(err.message || 'Failed to process voice input.');
        setIsRecording(false);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      try {
        setErrorMsg(null);
        await startRecording();
        setIsRecording(true);
      } catch (err: any) {
        console.error('Failed to start recording:', err);
        setErrorMsg(err.message || 'Microphone access failed.');
        setIsRecording(false);
      }
    }
  };

  const toggleSpeech = async (msg: ChatMessage) => {
    if (speakingMessageId === msg.id) {
      Speech.stop();
      setSpeakingMessageId(null);
    } else {
      Speech.stop();
      setSpeakingMessageId(msg.id);
      
      const cleanText = msg.content
        .replace(/[#*`_-]/g, '') // remove markdown symbols
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // replace links with plain text
        .trim();
        
      Speech.speak(cleanText, {
        language: language === 'hi' ? 'hi-IN' : 'en-US',
        rate: 0.85,
        onDone: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null),
      });
    }
  };

  // Load profile and settings
  useEffect(() => {
    async function loadConfig() {
      // Load language preference
      const savedLang = await LocalStorage.getItem('chat_lang');
      if (savedLang === 'hi' || savedLang === 'en' || savedLang === 'hinglish') {
        setLanguage(savedLang);
      }

      // Load model preference
      const savedModel = await LocalStorage.getItem('chat_model');
      if (savedModel === 'smart' || savedModel === 'fast') {
        setModel(savedModel);
      }

      // Load sessions history
      const savedSessions = await LocalStorage.getItem('chat_sessions');
      let loadedSessions: ChatSession[] = [];
      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions);
          if (Array.isArray(parsed)) {
            loadedSessions = parsed;
          }
        } catch (e) {
          console.error('Error parsing chat sessions:', e);
        }
      }

      // Also migrate old 'chat_history' if present
      const oldHistory = await LocalStorage.getItem('chat_history');
      if (oldHistory && loadedSessions.length === 0) {
        try {
          const parsedHistory = JSON.parse(oldHistory);
          if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            const firstMsg = parsedHistory.find(m => m.role === 'user')?.content || 'Previous Chat';
            const title = firstMsg.slice(0, 30) + (firstMsg.length > 30 ? '...' : '');
            const newSession: ChatSession = {
              id: Date.now().toString(),
              title,
              crop: farmCrop || 'Wheat',
              timestamp: new Date().toLocaleDateString(),
              messages: parsedHistory,
            };
            loadedSessions = [newSession];
            await LocalStorage.setItem('chat_sessions', JSON.stringify(loadedSessions));
            await LocalStorage.removeItem('chat_history');
          }
        } catch (e) {
          console.error('Error migrating old history:', e);
        }
      }

      setSessions(loadedSessions);

      if (loadedSessions.length > 0) {
        // Load the most recent session
        setActiveSessionId(loadedSessions[0].id);
        setMessages(loadedSessions[0].messages);
      } else {
        // Create an initial empty session
        const initialSessionId = Date.now().toString();
        const initialSession: ChatSession = {
          id: initialSessionId,
          title: savedLang === 'hi' ? 'नया संवाद' : 'New Conversation',
          crop: farmCrop ? farmCrop.split(' ')[0] : 'Wheat',
          timestamp: new Date().toLocaleDateString(),
          messages: [],
        };
        setSessions([initialSession]);
        setActiveSessionId(initialSessionId);
        setMessages([]);
        await LocalStorage.setItem('chat_sessions', JSON.stringify([initialSession]));
      }
    }
    loadConfig();
  }, [farmCrop]);

  // Handle incoming prefill queries from other screens
  useEffect(() => {
    if (params.prefill) {
      const prefillQuery = params.prefill;
      // Clear the param so it doesn't trigger again on subsequent mounts
      router.setParams({ prefill: undefined });
      
      // Delay slightly to ensure context has loaded
      setTimeout(() => {
        handleSendQuery(prefillQuery);
      }, 300);
    }
  }, [params.prefill]);

  // Save active session messages & auto-title
  const updateActiveSessionMessages = async (newMessages: ChatMessage[]) => {
    setMessages(newMessages);

    let sessionTitleUpdate = {};
    const firstUserMsg = newMessages.find(m => m.role === 'user');
    if (firstUserMsg) {
      const cleanTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
      const currentSession = sessions.find(s => s.id === activeSessionId);
      if (currentSession && (currentSession.title === 'New Conversation' || currentSession.title === 'नया संवाद')) {
        sessionTitleUpdate = { title: cleanTitle };
      }
    }

    const updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: newMessages,
          ...sessionTitleUpdate
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    await LocalStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
  };

  const handleNewChat = async () => {
    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: language === 'hi' ? 'नया संवाद' : 'New Conversation',
      crop: farmCrop ? farmCrop.split(' ')[0] : 'Wheat',
      timestamp: new Date().toLocaleDateString(),
      messages: [],
    };
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setActiveSessionId(newSessionId);
    setMessages([]);
    await LocalStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
    setIsDrawerOpen(false);
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setMessages(session.messages);
      setIsDrawerOpen(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);

    if (activeSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        setActiveSessionId(updatedSessions[0].id);
        setMessages(updatedSessions[0].messages);
      } else {
        const newSessionId = Date.now().toString();
        const newSession: ChatSession = {
          id: newSessionId,
          title: language === 'hi' ? 'नया संवाद' : 'New Conversation',
          crop: farmCrop ? farmCrop.split(' ')[0] : 'Wheat',
          timestamp: new Date().toLocaleDateString(),
          messages: [],
        };
        setSessions([newSession]);
        setActiveSessionId(newSessionId);
        setMessages([]);
        await LocalStorage.setItem('chat_sessions', JSON.stringify([newSession]));
        return;
      }
    }

    await LocalStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
  };

  const handleClearAllChats = async () => {
    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: language === 'hi' ? 'नया संवाद' : 'New Conversation',
      crop: farmCrop ? farmCrop.split(' ')[0] : 'Wheat',
      timestamp: new Date().toLocaleDateString(),
      messages: [],
    };
    setSessions([newSession]);
    setActiveSessionId(newSessionId);
    setMessages([]);
    await LocalStorage.setItem('chat_sessions', JSON.stringify([newSession]));
    setIsDrawerOpen(false);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    setInputValue('');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    await updateActiveSessionMessages(newMessages);
    scrollToBottom();

    setIsLoading(true);

    try {
      // Limit context window — the service layer will further trim if needed
      const historyPayload = newMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content.length > 2000 
          ? msg.content.slice(0, 2000) + '\n... [truncated/छोटा किया गया]' 
          : msg.content
      }));

      const botReply = await sendMessageToGroq(
        historyPayload,
        { state: farmState, soilType: farmSoil, crop: farmCrop },
        model
      );

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...newMessages, botMsg];
      await updateActiveSessionMessages(finalMessages);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'API connection failed. Please check your internet connection.');
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleClearChat = async () => {
    await updateActiveSessionMessages([]);
  };

  const toggleLanguage = async (lang: 'hi' | 'en' | 'hinglish') => {
    setLanguage(lang);
    await LocalStorage.setItem('chat_lang', lang);
  };

  const toggleModel = async () => {
    const nextModel: ModelMode = model === 'fast' ? 'smart' : 'fast';
    setModel(nextModel);
    await LocalStorage.setItem('chat_model', nextModel);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
          enabled={Platform.OS !== 'web'}
        >
          {/* Header Panel */}
          <View style={[styles.headerPanel, { borderBottomColor: theme.border }]}>
            <View style={[styles.headerInfoRow, { flexShrink: 1 }]}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && { opacity: 0.7 }
                ]}
              >
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any}
                  size={20}
                  tintColor={theme.primary}
                />
              </Pressable>

              <View style={styles.avatarMini}>
                <SymbolView
                  name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                  size={16}
                  tintColor={theme.primary}
                />
              </View>
              <View style={{ flexShrink: 1 }}>
                <ThemedText type="smallBold" numberOfLines={1}>Krishik Mitra AI</ThemedText>
                <ThemedText type="small" numberOfLines={1} style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '600' }}>
                  Context: {farmState} • {farmCrop.split(' ')[0]}
                </ThemedText>
              </View>
            </View>

            <View style={styles.headerControls}>
              <Pressable
                onPress={() => setIsDrawerOpen(true)}
                style={({ pressed }) => [
                  styles.controlIconBtn,
                  pressed && { opacity: 0.8 }
                ]}
              >
                <SymbolView
                  name={{ ios: 'line.horizontal.3', android: 'menu', web: 'menu' } as any}
                  size={20}
                  tintColor={theme.primary}
                />
              </Pressable>

              <Pressable
                onPress={() => setIsMenuOpen(true)}
                style={({ pressed }) => [
                  styles.controlIconBtn,
                  pressed && { opacity: 0.8 }
                ]}
              >
                <SymbolView
                  name={{ ios: 'ellipsis.vertical', android: 'more_vert', web: 'more_vert' } as any}
                  size={20}
                  tintColor={theme.primary}
                />
              </Pressable>
            </View>
          </View>



          {/* Chat Messages Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={scrollToBottom}
          >
            {messages.length === 0 ? (
              <Animated.View
                entering={FadeInDown.duration(400).springify()}
                style={styles.welcomeContainer}
              >
                <View style={[styles.welcomeLogo, { backgroundColor: theme.backgroundElement }]}>
                  <SymbolView
                    name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                    size={44}
                    tintColor={theme.primary}
                  />
                </View>
                <ThemedText type="smallBold" style={styles.welcomeTitle}>
                  Namaste! I am your Krishik Mitra (कृषिक मित्र).
                </ThemedText>
                <ThemedText type="small" style={[styles.welcomeSub, { color: theme.textSecondary }]}>
                  I'm configured with your farm profile in **{farmState}** growing **{farmCrop.split(' ')[0]}** on **{farmSoil.split(' ')[0]}** soil. Ask me anything!
                </ThemedText>

                <View style={styles.presetContainer}>
                  <ThemedText type="code" style={styles.presetHeader}>SUGGESTED QUESTIONS:</ThemedText>
                  
                  <Pressable
                    onPress={() => handleSendQuery(
                      `मेरी ${farmCrop.split(' ')[0]} की फसल के लिए नाइट्रोजन, फास्फोरस और पोटाश (NPK) की सही मात्रा कितनी होनी चाहिए?`
                    )}
                    style={({ pressed }) => [
                      styles.presetBubble,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      pressed && { backgroundColor: theme.backgroundSelected }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                      <SymbolView
                        name={{ ios: 'plus.minus.and.percent', android: 'calculate', web: 'calculate' } as any}
                        size={15}
                        tintColor={theme.primary}
                      />
                      <ThemedText type="small">Fertilizer doses for my {farmCrop.split(' ')[0]}</ThemedText>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSendQuery(
                      `मेरी मिट्टी ${farmSoil.split(' ')[0]} है। इसमें जल निकासी (drainage) और नमी बनाए रखने के लिए क्या उपाय करें?`
                    )}
                    style={({ pressed }) => [
                      styles.presetBubble,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      pressed && { backgroundColor: theme.backgroundSelected }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                      <SymbolView
                        name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' } as any}
                        size={15}
                        tintColor={theme.primary}
                      />
                      <ThemedText type="small">Water retention in {farmSoil.split(' ')[0]}</ThemedText>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSendQuery(
                      `मेरी ${farmCrop.split(' ')[0]} की फसल में लगने वाले मुख्य कीट कौन से हैं और उनसे बचाव के जैविक उपाय बताएं।`
                    )}
                    style={({ pressed }) => [
                      styles.presetBubble,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      pressed && { backgroundColor: theme.backgroundSelected }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                      <SymbolView
                        name={{ ios: 'ladybug.fill', android: 'bug_report', web: 'bug_report' } as any}
                        size={15}
                        tintColor={theme.primary}
                      />
                      <ThemedText type="small">Common pests & organic cures</ThemedText>
                    </View>
                  </Pressable>
                </View>
              </Animated.View>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <Animated.View
                    key={msg.id}
                    entering={isUser ? FadeInRight.duration(350).springify() : FadeInLeft.duration(350).springify()}
                    style={styles.messageRowContainer}
                  >
                    {!isUser && (
                      <View style={styles.botHeaderRow}>
                        <View style={[styles.avatarBubble, { backgroundColor: theme.primary }]}>
                          <SymbolView
                            name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                            size={12}
                            tintColor={theme.onPrimary}
                          />
                        </View>
                        <ThemedText type="smallBold" style={[styles.botSenderName, { color: theme.textSecondary }]}>
                          Krishik Mitra AI
                        </ThemedText>
                      </View>
                    )}

                    <View
                      style={[
                        styles.messageRow,
                        isUser ? styles.userRow : styles.botRow
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          isUser
                            ? [styles.userBubble, { backgroundColor: theme.chatUser }]
                            : [styles.botBubble, { backgroundColor: theme.chatBot, borderColor: theme.border }]
                        ]}
                      >
                        {isUser ? (
                          <ThemedText type="small" style={{ color: theme.text }}>
                            {msg.content}
                          </ThemedText>
                        ) : (
                          <CustomMarkdown text={msg.content} />
                        )}
                        <View style={styles.bubbleFooter}>
                          <ThemedText
                            type="code"
                            style={[
                              styles.timestamp,
                              { color: theme.textSecondary }
                            ]}
                          >
                            {msg.timestamp}
                          </ThemedText>

                          {!isUser && (
                            <Pressable
                              onPress={() => toggleSpeech(msg)}
                              style={({ pressed }) => [
                                styles.listenButton,
                                pressed && { opacity: 0.7 }
                              ]}
                            >
                              <SymbolView
                                name={speakingMessageId === msg.id ? "stop.fill" : "speaker.wave.2.fill" as any}
                                size={14}
                                tintColor={speakingMessageId === msg.id ? theme.error : theme.primary}
                              />
                              <ThemedText
                                type="code"
                                style={[
                                  styles.listenText,
                                  { color: speakingMessageId === msg.id ? theme.error : theme.primary }
                                ]}
                              >
                                {speakingMessageId === msg.id ? (language === 'hi' ? 'रोकें' : 'Stop') : (language === 'hi' ? 'सुनें' : 'Listen')}
                              </ThemedText>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}

            {/* Loading Indicator / Bot Typing */}
            {isLoading && (
              <Animated.View
                entering={FadeInLeft.duration(350).springify()}
                style={styles.messageRowContainer}
              >
                <View style={styles.botHeaderRow}>
                  <View style={[styles.avatarBubble, { backgroundColor: theme.primary }]}>
                    <SymbolView
                      name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                      size={12}
                      tintColor={theme.onPrimary}
                    />
                  </View>
                  <ThemedText type="smallBold" style={[styles.botSenderName, { color: theme.textSecondary }]}>
                    Krishik Mitra AI
                  </ThemedText>
                </View>
                <View style={[styles.messageRow, styles.botRow]}>
                  <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: theme.chatBot, borderColor: theme.border, paddingVertical: Spacing.two }]}>
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={theme.primary} />
                      <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 11 }}>
                        Mitra is typing agricultural advice...
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Error Message display */}
            {errorMsg && (
              <View style={styles.errorContainer}>
                <ThemedView type="backgroundElement" style={[styles.errorCard, { borderColor: theme.error }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                    <SymbolView
                      name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' } as any}
                      size={14}
                      tintColor={theme.error}
                    />
                    <ThemedText type="smallBold" style={{ color: theme.error }}>Error</ThemedText>
                  </View>
                  <ThemedText type="small" style={{ marginVertical: Spacing.one }}>{errorMsg}</ThemedText>
                  <Pressable
                    onPress={() => {
                      if (messages.length > 0) {
                        const lastUserMsg = messages[messages.length - 1];
                        if (lastUserMsg.role === 'user') {
                          handleSendQuery(lastUserMsg.content);
                        }
                      }
                    }}
                    style={[styles.retryBtn, { backgroundColor: theme.error }]}
                  >
                    <ThemedText type="code" style={{ color: '#ffffff', fontWeight: '700' }}>Retry</ThemedText>
                  </Pressable>
                </ThemedView>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View style={[styles.inputBar, { borderTopColor: theme.border }]}>
            <AnimatedPressable
              onPress={handleVoiceInput}
              disabled={isLoading || isTranscribing}
              style={[
                styles.micButton,
                { backgroundColor: isRecording ? theme.error : theme.primary + '18' },
                (isLoading || isTranscribing) && { opacity: 0.5 },
                animatedMicStyle
              ]}
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <SymbolView
                  name={isRecording ? "stop.fill" : "mic.fill" as any}
                  size={18}
                  tintColor={isRecording ? theme.onPrimary : theme.primary}
                />
              )}
            </AnimatedPressable>

            <TextInput
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }
              ]}
              placeholder={
                isRecording 
                  ? (language === 'hi' ? "बोलिए, हम सुन रहे हैं..." : "Speak now, we are listening...") 
                  : isTranscribing 
                    ? (language === 'hi' ? "आवाज को अनुवाद किया जा रहा है..." : "Transcribing voice...") 
                    : (language === 'hi' ? "फसल या खाद के बारे में पूछें..." : "Ask about crops...")
              }
              placeholderTextColor={theme.textSecondary}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={() => handleSendQuery(inputValue)}
              editable={!isLoading && !isRecording && !isTranscribing}
            />

            <Pressable
              onPress={() => handleSendQuery(inputValue)}
              disabled={isLoading || !inputValue.trim() || isRecording || isTranscribing}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: theme.primary },
                (isLoading || !inputValue.trim() || isRecording || isTranscribing) && { opacity: 0.5 },
                pressed && { opacity: 0.8 }
              ]}
            >
              <ThemedText style={[styles.sendIcon, { color: theme.onPrimary }]}>➔</ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Sidebar Drawer Overlay */}
      {isDrawerOpen && (
        <View style={styles.drawerBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDrawerOpen(false)} />
          <ThemedView type="card" style={[styles.drawerContainer, { backgroundColor: theme.chatBot, borderColor: theme.border }]}>
            <View style={styles.drawerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                <SymbolView
                  name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                  size={18}
                  tintColor={theme.primary}
                />
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                  संवाद इतिहास / Chat History
                </ThemedText>
              </View>
              <Pressable onPress={() => setIsDrawerOpen(false)} style={styles.closeDrawerBtn}>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 16, fontWeight: '700' }}>✕</ThemedText>
              </Pressable>
            </View>

            <View style={[styles.drawerProfileCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="code" style={{ fontSize: 10, color: theme.primary, fontWeight: '700' }}>
                सक्रिय प्रोफ़ाइल / ACTIVE PROFILE
              </ThemedText>
              <ThemedText type="small" style={{ fontSize: 12, marginTop: 2, fontWeight: '600' }}>
                {farmState} • {farmCrop.split('(')[0]}
              </ThemedText>
            </View>

            <Pressable
              onPress={handleNewChat}
              style={({ pressed }) => [
                styles.newChatBtn,
                { borderColor: theme.primary },
                pressed && { opacity: 0.8 }
              ]}
            >
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' } as any}
                size={16}
                tintColor={theme.primary}
              />
              <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 14 }}>
                नया संवाद / Start New Chat
              </ThemedText>
            </Pressable>

            <ThemedText type="code" style={styles.historySectionLabel}>
              पिछले संवाद / PREVIOUS CHATS
            </ThemedText>
            
            <ScrollView style={styles.drawerScrollView} contentContainerStyle={{ gap: Spacing.two }}>
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <Pressable
                    key={session.id}
                    onPress={() => handleSelectSession(session.id)}
                    style={({ pressed }) => [
                      styles.sessionItem,
                      { backgroundColor: theme.backgroundElement, borderColor: isActive ? theme.primary : theme.border },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                      <SymbolView
                        name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'chat', web: 'chat' } as any}
                        size={14}
                        tintColor={isActive ? theme.primary : theme.textSecondary}
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          type="smallBold"
                          numberOfLines={1}
                          style={{ fontSize: 12, color: isActive ? theme.primary : theme.text }}
                        >
                          {session.title}
                        </ThemedText>
                        <ThemedText type="code" style={{ fontSize: 9, color: theme.textSecondary }}>
                          {session.timestamp} • {session.crop}
                        </ThemedText>
                      </View>
                    </View>
                    
                    <Pressable
                      onPress={() => handleDeleteSession(session.id)}
                      style={{ padding: Spacing.one }}
                    >
                      <SymbolView
                        name={{ ios: 'trash', android: 'delete', web: 'delete' } as any}
                        size={14}
                        tintColor={theme.error}
                      />
                    </Pressable>
                  </Pressable>
                );
              })}
            </ScrollView>

          </ThemedView>
        </View>
      )}

      {/* Dropdown Menu Overlay */}
      {isMenuOpen && (
        <View style={styles.menuBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMenuOpen(false)} />
          <ThemedView type="card" style={[styles.dropdownMenu, { backgroundColor: theme.chatBot, borderColor: theme.border }]}>
            <Pressable
              onPress={() => {
                toggleModel();
                setIsMenuOpen(false);
              }}
              style={({ pressed }) => [
                styles.menuOption,
                pressed && { backgroundColor: theme.backgroundElement }
              ]}
            >
              <ThemedText style={{ fontSize: 13, color: theme.text, fontWeight: '600' }}>
                {model === 'fast' ? ' Switch to Smart Model' : '⚡ Switch to Fast Model'}
              </ThemedText>
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

            <Pressable
              onPress={() => {
                handleClearChat();
                setIsMenuOpen(false);
              }}
              style={({ pressed }) => [
                styles.menuOption,
                pressed && { backgroundColor: theme.backgroundElement }
              ]}
            >
              <ThemedText style={{ fontSize: 13, color: theme.error, fontWeight: '600' }}>
                🗑️ Clear Conversation
              </ThemedText>
            </Pressable>
          </ThemedView>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  headerPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  backButton: {
    marginRight: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(46,111,64,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    zIndex: 99999,
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    right: Spacing.three,
    width: 200,
    borderRadius: Spacing.two,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    paddingVertical: Spacing.one,
  },
  menuOption: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  menuDivider: {
    height: 1,
    width: '100%',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 9999,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    width: '80%',
    maxWidth: 300,
    height: '100%',
    borderLeftWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: Spacing.three,
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  closeDrawerBtn: {
    padding: Spacing.one,
  },
  drawerProfileCard: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    marginBottom: Spacing.three,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  historySectionLabel: {
    fontSize: 9,
    opacity: 0.6,
    marginBottom: Spacing.two,
  },
  drawerScrollView: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  drawerFooter: {
    borderTopWidth: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  avatarMini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(46,111,64,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerControls: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexShrink: 0,
  },
  controlBadge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  controlBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  langBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  langTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  langTabText: {
    fontSize: 13,
  },
  messagesContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
    flexGrow: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  welcomeLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  welcomeTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  welcomeSub: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    lineHeight: 18,
  },
  presetContainer: {
    width: '100%',
    gap: Spacing.two,
  },
  presetHeader: {
    fontSize: 10,
    opacity: 0.6,
    marginBottom: Spacing.one,
  },
  presetBubble: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  messageRowContainer: {
    width: '100%',
    marginVertical: Spacing.one,
  },
  botHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
    paddingLeft: Spacing.one,
  },
  botSenderName: {
    fontSize: 11,
    fontWeight: '700',
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  userRow: {
    flexDirection: 'row-reverse',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  avatarBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  userBubble: {
    maxWidth: '85%',
    borderBottomRightRadius: 2,
  },
  botBubble: {
    width: '100%',
    borderWidth: 1,
    borderBottomLeftRadius: 2,
  },
  timestamp: {
    fontSize: 8,
    alignSelf: 'flex-end',
    marginTop: Spacing.one,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  errorContainer: {
    marginVertical: Spacing.two,
    width: '100%',
    alignItems: 'center',
  },
  errorCard: {
    width: '90%',
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.one,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.two,
    paddingBottom: Platform.OS === 'ios' ? Spacing.two : Spacing.three,
  },
  textInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: Spacing.four,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listenText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
