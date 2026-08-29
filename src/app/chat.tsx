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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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
  const isCompactHeader = width < 375;
  const [model, setModel] = useState<ModelMode>('fast');

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

      // Load chat history if present
      const savedHistory = await LocalStorage.getItem('chat_history');
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed)) {
            // Clean up any overly large messages in stored history to fix the 413 error from root
            const cleanHistory = parsed.map(msg => ({
              ...msg,
              content: typeof msg.content === 'string' && msg.content.length > 4000
                ? msg.content.slice(0, 4000) + '\n... [truncated/छोटा किया गया]'
                : msg.content
            }));
            setMessages(cleanHistory);
            await LocalStorage.setItem('chat_history', JSON.stringify(cleanHistory));
          }
        } catch (e) {
          console.error('Error parsing chat history:', e);
        }
      }
    }
    loadConfig();
  }, []);

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

  // Save chat history to storage
  const saveHistory = async (history: ChatMessage[]) => {
    await LocalStorage.setItem('chat_history', JSON.stringify(history));
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
    setMessages(newMessages);
    saveHistory(newMessages);
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
        model,
        language
      );

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...newMessages, botMsg];
      setMessages(finalMessages);
      saveHistory(finalMessages);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'API connection failed. Please check your internet connection.');
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleClearChat = async () => {
    setMessages([]);
    await LocalStorage.removeItem('chat_history');
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
        >
          {/* Header Panel */}
          <View style={[styles.headerPanel, { borderBottomColor: theme.border }]}>
             <View style={[styles.headerInfoRow, { flexShrink: 1 }]}>
              <View style={styles.avatarMini}>
                <SymbolView
                  name={{ ios: 'cpu', android: 'smart_toy', web: 'smart_toy' } as any}
                  size={16}
                  tintColor={theme.primary}
                />
              </View>
              <View style={{ flexShrink: 1 }}>
                <ThemedText type="smallBold" numberOfLines={1}>Krishi Mitra AI</ThemedText>
                <ThemedText type="small" numberOfLines={1} style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '600' }}>
                  Context: {farmState} • {farmCrop.split(' ')[0]}
                </ThemedText>
              </View>
            </View>

            <View style={styles.headerControls}>
              <Pressable
                onPress={toggleModel}
                style={({ pressed }) => [
                  styles.controlBadge,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <ThemedText type="small" style={[styles.controlBadgeText, { color: theme.text }]}>
                  {isCompactHeader
                    ? (model === 'fast' ? '⚡' : '🧠')
                    : (model === 'fast' ? '⚡ Fast' : '🧠 Smart')}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={handleClearChat}
                style={({ pressed }) => [
                  styles.controlBadge,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1 },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: isCompactHeader ? 0 : Spacing.one }}>
                  <SymbolView
                    name={{ ios: 'trash.fill', android: 'delete', web: 'delete' } as any}
                    size={isCompactHeader ? 12 : 10}
                    tintColor={theme.error}
                  />
                  {!isCompactHeader && (
                    <ThemedText type="code" style={[styles.controlBadgeText, { color: theme.error }]}>
                      Clear
                    </ThemedText>
                  )}
                </View>
              </Pressable>
            </View>
          </View>

          {/* Language Selection Tab Bar */}
          <View style={[styles.langBar, { borderBottomColor: theme.border }]}>
            <Pressable
              onPress={() => toggleLanguage('hi')}
              style={[
                styles.langTab,
                language === 'hi' && { borderBottomColor: theme.primary }
              ]}
            >
              <ThemedText 
                type="smallBold" 
                style={[
                  styles.langTabText, 
                  language === 'hi' ? { color: theme.primary } : { color: theme.textSecondary }
                ]}
              >
                हिंदी
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => toggleLanguage('hinglish')}
              style={[
                styles.langTab,
                language === 'hinglish' && { borderBottomColor: theme.primary }
              ]}
            >
              <ThemedText 
                type="smallBold" 
                style={[
                  styles.langTabText, 
                  language === 'hinglish' ? { color: theme.primary } : { color: theme.textSecondary }
                ]}
              >
                Hinglish
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => toggleLanguage('en')}
              style={[
                styles.langTab,
                language === 'en' && { borderBottomColor: theme.primary }
              ]}
            >
              <ThemedText 
                type="smallBold" 
                style={[
                  styles.langTabText, 
                  language === 'en' ? { color: theme.primary } : { color: theme.textSecondary }
                ]}
              >
                English
              </ThemedText>
            </Pressable>
          </View>

          {/* Chat Messages Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={scrollToBottom}
          >
            {messages.length === 0 ? (
              <View style={styles.welcomeContainer}>
                <View style={[styles.welcomeLogo, { backgroundColor: theme.backgroundElement }]}>
                  <SymbolView
                    name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                    size={44}
                    tintColor={theme.primary}
                  />
                </View>
                <ThemedText type="smallBold" style={styles.welcomeTitle}>
                  Namaste! I am your Krishi Mitra (कृषि मित्र).
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
              </View>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isUser ? styles.userRow : styles.botRow
                    ]}
                  >
                    {!isUser && (
                      <View style={[styles.avatarBubble, { backgroundColor: theme.primary }]}>
                        <SymbolView
                          name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                          size={15}
                          tintColor="#ffffff"
                        />
                      </View>
                    )}

                    <View
                      style={[
                        styles.messageBubble,
                        isUser
                          ? [styles.userBubble, { backgroundColor: theme.chatUser }]
                          : [styles.botBubble, { backgroundColor: theme.chatBot, borderColor: theme.border }]
                      ]}
                    >
                      {isUser ? (
                        <ThemedText type="small" style={{ color: '#000000' }}>
                          {msg.content}
                        </ThemedText>
                      ) : (
                        <CustomMarkdown text={msg.content} />
                      )}
                      <ThemedText
                        type="code"
                        style={[
                          styles.timestamp,
                          { color: isUser ? 'rgba(0,0,0,0.5)' : theme.textSecondary }
                        ]}
                      >
                        {msg.timestamp}
                      </ThemedText>
                    </View>
                  </View>
                );
              })
            )}

            {/* Loading Indicator / Bot Typing */}
            {isLoading && (
              <View style={[styles.messageRow, styles.botRow]}>
                <View style={[styles.avatarBubble, { backgroundColor: theme.primary }]}>
                  <SymbolView
                    name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                    size={15}
                    tintColor="#ffffff"
                  />
                </View>
                <View style={[styles.messageBubble, styles.botBubble, { backgroundColor: theme.chatBot, borderColor: theme.border, paddingVertical: Spacing.two }]}>
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 11 }}>
                      Mitra is typing agricultural advice...
                    </ThemedText>
                  </View>
                </View>
              </View>
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
            <TextInput
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }
              ]}
              placeholder={language === 'hi' ? "फसल या खाद के बारे में पूछें..." : "Ask about crops, soils, pest controls..."}
              placeholderTextColor={theme.textSecondary}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={() => handleSendQuery(inputValue)}
              editable={!isLoading}
            />

            <Pressable
              onPress={() => handleSendQuery(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: theme.primary },
                (isLoading || !inputValue.trim()) && { opacity: 0.5 },
                pressed && { opacity: 0.8 }
              ]}
            >
              <ThemedText style={styles.sendIcon}>➔</ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  keyboardView: {
    flex: 1,
  },
  headerPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    width: '100%',
  },
  userRow: {
    flexDirection: 'row-reverse',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  avatarBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  messageBubble: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    maxWidth: '85%',
  },
  userBubble: {
    borderBottomRightRadius: 2,
  },
  botBubble: {
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
});
