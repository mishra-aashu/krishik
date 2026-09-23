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
  AppState,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { LocalStorage } from '@/utils/storage';
import { sendMessageToGroq, type ModelMode } from '@/services/chat-service';
import { compressAndResizeImage, saveImageToLocalFileSystem, resolveLocalImageUri } from '@/utils/image-compress';
import { uploadImageToImgBB } from '@/services/imgbb-service';
import { CustomMarkdown } from '@/components/custom-markdown';
import { useNetInfo } from '@react-native-community/netinfo';
import OfflineNotice from '@/components/offline-notice';
import Animated, {
  FadeInRight,
  FadeInLeft,
  FadeInDown,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import { startListeningSession, type ActiveListeningSession } from '@/services/speech-recognition-service';
import { SelectionModal } from '@/components/selection-modal';
import cropsData from '@/constants/crops.json';
import { getLiveGPSLocation } from '@/services/location-service';

const STATES = [
  'Uttar Pradesh', 'Punjab', 'Haryana', 'Madhya Pradesh', 
  'Maharashtra', 'Rajasthan', 'Gujarat', 'Bihar', 'West Bengal',
  'Karnataka', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu',
  'Odisha', 'Jharkhand', 'Chhattisgarh', 'Assam', 'Himachal Pradesh',
  'Uttarakhand', 'Kerala'
];

const SOILS = [
  'Alluvial Soil (जलोढ़)', 'Black Soil (काली मिट्टी)', 'Red Soil (लाल मिट्टी)', 
  'Sandy Soil (बलुई मिट्टी)', 'Clayey Soil (चिकनी मिट्टी)', 'Loamy Soil (दोमट)'
];

const CROPS = cropsData.map(c => c.name);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  image?: string;
  feedback?: 'like' | 'dislike';
}

interface ChatSession {
  id: string;
  title: string;
  crop: string;
  timestamp: string;
  messages: ChatMessage[];
}

interface MessageItemProps {
  msg: ChatMessage;
  theme: any;
  speakingMessageId: string | null;
  language: 'hi' | 'en' | 'hinglish';
  onToggleSpeech: (msg: ChatMessage) => void;
  onFeedback: (msgId: string, type: 'like' | 'dislike') => void;
}

const MessageItem = React.memo(
  ({ msg, theme, speakingMessageId, language, onToggleSpeech, onFeedback }: MessageItemProps) => {
    const isUser = msg.role === 'user';
    const isSpeaking = speakingMessageId === msg.id;
    const [isCopied, setIsCopied] = React.useState(false);

    const handleCopy = async () => {
      try {
        await Clipboard.setStringAsync(msg.content);
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (err) {
        console.warn('Failed to copy text:', err);
      }
    };

    return (
      <Animated.View
        entering={isUser ? FadeInRight.duration(350).springify() : FadeInLeft.duration(350).springify()}
        style={styles.messageRowContainer}
      >
        {!isUser && (
          <View style={styles.botHeaderRow}>
            <View style={[styles.avatarBubble, { backgroundColor: theme.primary, borderColor: theme.borderAccent }]}>
              <SymbolView
                name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                size={13}
                tintColor={theme.onPrimary}
              />
            </View>
            <ThemedText type="smallBold" style={[styles.botSenderName, { color: theme.text }]}>
              Krishik Mitra AI
            </ThemedText>
            <View style={[styles.verifiedTag, { backgroundColor: theme.accentLight }]}>
              <ThemedText style={[styles.verifiedTagText, { color: theme.accent }]}>
                VERIFIED
              </ThemedText>
            </View>
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
                ? [
                    styles.userBubble,
                    {
                      backgroundColor: theme.chatUser,
                      borderColor: theme.borderAccent,
                      ...Platform.select({
                        web: {
                          boxShadow: '0 2px 10px rgba(5, 150, 105, 0.12)',
                        } as any,
                        default: {
                          shadowColor: theme.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 2,
                        },
                      }),
                    },
                  ]
                : [
                    styles.botBubble,
                    {
                      backgroundColor: theme.chatBot,
                      borderColor: theme.chatBotBorder,
                      ...Platform.select({
                        web: {
                          boxShadow: `0 4px 20px ${theme.cardShadow}`,
                        } as any,
                        default: {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.12,
                          shadowRadius: 8,
                          elevation: 3,
                        },
                      }),
                    },
                  ]
            ]}
          >
            {msg.image && (
              <Image
                source={{ uri: resolveLocalImageUri(msg.image) || undefined }}
                style={{
                  width: 220,
                  height: 160,
                  borderRadius: Spacing.two,
                  marginBottom: Spacing.two,
                  resizeMode: 'cover',
                }}
              />
            )}
            {isUser ? (
              <ThemedText type="small" style={{ color: theme.text, fontSize: 15, lineHeight: 22 }}>
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

              <View style={styles.bubbleActions}>
                {/* Copy Button */}
                <Pressable
                  onPress={handleCopy}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    pressed && { opacity: 0.8, backgroundColor: theme.backgroundSelected }
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: isCopied ? 'checkmark.circle.fill' : 'doc.on.doc',
                      android: isCopied ? 'check_circle' : 'content_copy',
                      web: isCopied ? 'check_circle' : 'content_copy',
                    } as any}
                    size={12}
                    tintColor={isCopied ? theme.success : theme.primary}
                  />
                  <ThemedText
                    type="code"
                    style={[
                      styles.actionText,
                      { color: isCopied ? theme.success : theme.primary }
                    ]}
                  >
                    {isCopied ? (language === 'hi' ? 'कॉपी किया' : 'Copied') : (language === 'hi' ? 'कॉपी' : 'Copy')}
                  </ThemedText>
                </Pressable>

                {/* Speak Button (AI only) */}
                {!isUser && (
                  <Pressable
                    onPress={() => onToggleSpeech(msg)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      pressed && { opacity: 0.8, backgroundColor: theme.backgroundSelected }
                    ]}
                  >
                    <SymbolView
                      name={{
                        ios: isSpeaking ? 'stop.fill' : 'speaker.wave.2.fill',
                        android: isSpeaking ? 'stop' : 'volume_up',
                        web: isSpeaking ? 'stop' : 'volume_up',
                      } as any}
                      size={12}
                      tintColor={isSpeaking ? theme.error : theme.primary}
                    />
                    <ThemedText
                      type="code"
                      style={[
                        styles.actionText,
                        { color: isSpeaking ? theme.error : theme.primary }
                      ]}
                    >
                      {isSpeaking ? (language === 'hi' ? 'रोकें' : 'Stop') : (language === 'hi' ? 'सुनें' : 'Listen')}
                    </ThemedText>
                  </Pressable>
                )}

                {/* Like Button (AI only) */}
                {!isUser && (
                  <Pressable
                    onPress={() => onFeedback(msg.id, 'like')}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: msg.feedback === 'like' ? theme.backgroundSelected : theme.backgroundElement, borderColor: msg.feedback === 'like' ? theme.primary : theme.border },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <SymbolView
                      name={{
                        ios: msg.feedback === 'like' ? 'hand.thumbsup.fill' : 'hand.thumbsup',
                        android: 'thumb_up',
                        web: 'thumb_up',
                      } as any}
                      size={12}
                      tintColor={msg.feedback === 'like' ? theme.success : theme.textSecondary}
                    />
                  </Pressable>
                )}

                {/* Dislike Button (AI only) */}
                {!isUser && (
                  <Pressable
                    onPress={() => onFeedback(msg.id, 'dislike')}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: msg.feedback === 'dislike' ? theme.backgroundSelected : theme.backgroundElement, borderColor: msg.feedback === 'dislike' ? theme.error : theme.border },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <SymbolView
                      name={{
                        ios: msg.feedback === 'dislike' ? 'hand.thumbsdown.fill' : 'hand.thumbsdown',
                        android: 'thumb_down',
                        web: 'thumb_down',
                      } as any}
                      size={12}
                      tintColor={msg.feedback === 'dislike' ? theme.error : theme.textSecondary}
                    />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.msg.id === nextProps.msg.id &&
      prevProps.msg.content === nextProps.msg.content &&
      prevProps.msg.image === nextProps.msg.image &&
      prevProps.msg.feedback === nextProps.msg.feedback &&
      prevProps.language === nextProps.language &&
      prevProps.theme.primary === nextProps.theme.primary &&
      (prevProps.speakingMessageId === prevProps.msg.id) === (nextProps.speakingMessageId === nextProps.msg.id)
    );
  }
);

const TypingDots = ({ theme }: { theme: any }) => {
  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  useEffect(() => {
    dot1Y.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      true
    );
    
    const t2 = setTimeout(() => {
      dot2Y.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        true
      );
    }, 150);

    const t3 = setTimeout(() => {
      dot3Y.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        true
      );
    }, 300);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1Y.value }]
  }));
  
  const style2 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2Y.value }]
  }));

  const style3 = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3Y.value }]
  }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 }}>
      <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary }, style1]} />
      <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary }, style2]} />
      <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary }, style3]} />
    </View>
  );
};

export default function ChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ prefill?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  // Profile context from global auth context
  const { farmState, farmSoil, farmCrop, updateProfile, userName } = useAuth();
  const { language: globalLang, setLanguage: setGlobalLanguage } = useLanguage();

  // Farm profile selection modal controls directly from Chat
  const [activeModal, setActiveModal] = useState<'state' | 'soil' | 'crop' | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const handleSelectConfig = async (val: string) => {
    if (!val) return;
    try {
      if (activeModal === 'state') {
        await updateProfile(userName, val, farmSoil, farmCrop);
      } else if (activeModal === 'soil') {
        await updateProfile(userName, farmState, val, farmCrop);
      } else if (activeModal === 'crop') {
        await updateProfile(userName, farmState, farmSoil, val);
      }
    } catch (err) {
      console.warn('Failed to update config from chat:', err);
    } finally {
      setActiveModal(null);
    }
  };

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const loc = await getLiveGPSLocation();
      if (loc && loc.state) {
        const matchedState = STATES.find(s => 
          s.toLowerCase() === loc.state?.toLowerCase() || 
          loc.state?.toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes(loc.state?.toLowerCase() || '')
        );
        if (matchedState && matchedState !== farmState) {
          await updateProfile(userName, matchedState, farmSoil, farmCrop);
        }
        setActiveModal(null);
      }
    } catch (err) {
      console.warn('GPS error in chat:', err);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Chat settings
  const [language, setLanguageState] = useState<'hi' | 'en' | 'hinglish'>(globalLang || 'hi');

  useEffect(() => {
    if (globalLang && (globalLang === 'hi' || globalLang === 'en')) {
      setLanguageState(globalLang);
    }
  }, [globalLang]);

  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch (e) {
        // ignore speech stop errors
      }
    };
  }, []);

  const setLanguage = (newLang: 'hi' | 'en' | 'hinglish') => {
    setLanguageState(newLang);
    if (newLang === 'hi' || newLang === 'en') {
      setGlobalLanguage(newLang);
    }
  };

  const STATE_TRANSLATIONS: Record<string, string> = {
    'Uttar Pradesh': 'उत्तर प्रदेश',
    'Punjab': 'पंजाब',
    'Haryana': 'हरियाणा',
    'Madhya Pradesh': 'मध्य प्रदेश',
    'Maharashtra': 'महाराष्ट्र',
    'Rajasthan': 'राजस्थान',
    'Gujarat': 'गुजरात',
    'Bihar': 'बिहार',
    'Karnataka': 'कर्नाटक',
    'Andhra Pradesh': 'आंध्र प्रदेश'
  };

  const formatState = (stateName: string) => {
    if (!stateName) return '';
    return language === 'hi' ? (STATE_TRANSLATIONS[stateName] || stateName) : stateName;
  };

  const formatLabel = (text: string) => {
    if (!text) return '';
    const parts = text.split('(');
    if (parts.length < 2) return text;
    const english = parts[0].trim();
    const hindi = parts[1].replace(')', '').trim();
    return language === 'hi' ? hindi : english;
  };
  const isCompactHeader = width < 400;
  const [model, setModel] = useState<ModelMode>('fast');

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageSelect = async () => {
    try {
      const options = [
        language === 'hi' ? 'कैमरा से फोटो लें' : 'Take Photo (Camera)',
        language === 'hi' ? 'गैलरी से चुनें' : 'Choose from Gallery',
        language === 'hi' ? 'रद्द करें' : 'Cancel'
      ];
      
      if (Platform.OS === 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.status !== 'granted') {
          Alert.alert(
            language === 'hi' ? 'अनुमति आवश्यक' : 'Permission Required',
            language === 'hi' ? 'फोटो चुनने के लिए गैलरी अनुमति की आवश्यकता है।' : 'Media library permission is required to select photos.'
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.6,
          base64: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const compressed = await compressAndResizeImage(asset.uri);
          const permanentUri = await saveImageToLocalFileSystem(compressed);
          setSelectedImage(permanentUri);
        }
        return;
      }

      Alert.alert(
        language === 'hi' ? 'फोटो जोड़ें' : 'Add Photo',
        language === 'hi' ? 'चुनें कि आप फोटो कैसे जोड़ना चाहते हैं' : 'Select how you want to add a photo',
        [
          {
            text: options[0],
            onPress: () => pickImage(true)
          },
          {
            text: options[1],
            onPress: () => pickImage(false)
          },
          {
            text: options[2],
            style: 'cancel'
          }
        ]
      );
    } catch (err) {
      console.error('Error in handleImageSelect:', err);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert(
          language === 'hi' ? 'अनुमति आवश्यक' : 'Permission Required',
          language === 'hi'
            ? (useCamera ? 'फोटो लेने के लिए कैमरा अनुमति की आवश्यकता है।' : 'फोटो चुनने के लिए गैलरी अनुमति की आवश्यकता है।')
            : (useCamera ? 'Camera permission is required to capture photos.' : 'Media library permission is required to select photos.')
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const compressed = await compressAndResizeImage(asset.uri);
        const permanentUri = await saveImageToLocalFileSystem(compressed);
        setSelectedImage(permanentUri);
      }
    } catch (err) {
      console.error('Error selecting image:', err);
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'फोटो चुनने में समस्या आई।' : 'Failed to select image.'
      );
    }
  };

  // Multi-session state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Voice & speech states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Keep track of recording state in a ref to avoid stale closures in AppState/cleanup effects
  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

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

  const chatListeningSessionRef = useRef<ActiveListeningSession | null>(null);

  // Stop reading aloud and recording when leaving the chat or if the app goes to the background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        Speech.stop();
        if (isRecordingRef.current) {
          if (chatListeningSessionRef.current) {
            chatListeningSessionRef.current.abort();
            chatListeningSessionRef.current = null;
          }
          setIsRecording(false);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      Speech.stop();
      if (chatListeningSessionRef.current) {
        chatListeningSessionRef.current.abort();
        chatListeningSessionRef.current = null;
      }
    };
  }, []);

  const handleSendQueryRef = useRef<((queryText: string, autoSpeak?: boolean) => Promise<void>) | null>(null);

  const handleVoiceInput = async () => {
    if (isOffline) {
      Alert.alert(
        language === 'hi' ? 'कोई इंटरनेट कनेक्शन नहीं' : 'No Internet Connection',
        language === 'hi' 
          ? 'वॉयस इनपुट के लिए इंटरनेट की आवश्यकता होती है।' 
          : 'Voice input requires an active internet connection.'
      );
      return;
    }

    if (isRecording) {
      try {
        setIsRecording(false);
        setIsTranscribing(true);
        setErrorMsg(null);

        const transcribedText = await chatListeningSessionRef.current?.stop();
        chatListeningSessionRef.current = null;
        setIsTranscribing(false);

        if (transcribedText && transcribedText.trim()) {
          setInputValue('');
          if (handleSendQueryRef.current) {
            await handleSendQueryRef.current(transcribedText.trim(), true);
          } else {
            setInputValue(transcribedText.trim());
          }
        }
      } catch (err: any) {
        console.error('Recording/transcription error:', err);
        setErrorMsg(err.message || 'Failed to process voice input.');
        setIsRecording(false);
        setIsTranscribing(false);
      }
    } else {
      try {
        const savedVoiceLang = await LocalStorage.getItem('krishik_voice_lang');
        const activeVoiceLang = (savedVoiceLang === 'en' || language === 'en') ? 'en' : 'hi';

        const session = await startListeningSession(activeVoiceLang, {
          onInterimResult: (liveText) => {
            setInputValue(liveText);
          },
          onStateChange: (st) => {
            if (st === 'processing') {
              setIsTranscribing(true);
            }
          },
          onFinalResult: async (finalText) => {
            setIsRecording(false);
            setIsTranscribing(false);
            chatListeningSessionRef.current = null;
            if (finalText && finalText.trim()) {
              setInputValue('');
              if (handleSendQueryRef.current) {
                await handleSendQueryRef.current(finalText.trim(), true);
              } else {
                setInputValue(finalText.trim());
              }
            }
          },
          onError: (err) => {
            setIsRecording(false);
            setIsTranscribing(false);
            chatListeningSessionRef.current = null;
            setErrorMsg(err);
          },
        });

        chatListeningSessionRef.current = session;
      } catch (err: any) {
        console.error('Failed to start voice listening:', err);
        setErrorMsg(err.message || 'Microphone access failed.');
        setIsRecording(false);
      }
    }
  };

  const toggleSpeech = React.useCallback(async (msg: ChatMessage) => {
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
  }, [speakingMessageId, language]);

  const handleFeedback = React.useCallback((msgId: string, type: 'like' | 'dislike') => {
    setMessages(prev => {
      const updated = prev.map(m => {
        if (m.id === msgId) {
          return { ...m, feedback: m.feedback === type ? undefined : type };
        }
        return m;
      });

      if (activeSessionId) {
        setSessions(prevSessions => {
          const updatedSessions = prevSessions.map(s => {
            if (s.id === activeSessionId) {
              return { ...s, messages: updated };
            }
            return s;
          });
          LocalStorage.setItem('chat_sessions', JSON.stringify(updatedSessions)).catch(err => {
            console.error('Error saving feedback:', err);
          });
          return updatedSessions;
        });
      }
      return updated;
    });
  }, [activeSessionId]);

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

  // Helper to prune raw base64 images from saved sessions to prevent storage overflow.
  // We keep only the most recent image in the active session and strip all others.
  const pruneSessionsForStorage = (sessionsList: ChatSession[], activeId: string | null): ChatSession[] => {
    return sessionsList.map(s => {
      const isActive = s.id === activeId;
      if (!isActive) {
        return {
          ...s,
          messages: s.messages.map(m => {
            if (m.image && m.image.startsWith('data:image')) {
              return {
                ...m,
                image: undefined,
                content: m.content.includes('(Photo cleared') 
                  ? m.content 
                  : m.content + '\n\n*(Photo cleared to save storage)*'
              };
            }
            return m;
          })
        };
      }

      // Active session: keep only the most recent image
      let imageCount = 0;
      const reversedMessages = [...s.messages].reverse().map(m => {
        if (m.image && m.image.startsWith('data:image')) {
          imageCount++;
          if (imageCount > 1) {
            return {
              ...m,
              image: undefined,
              content: m.content.includes('(Photo cleared') 
                ? m.content 
                : m.content + '\n\n*(Photo cleared to save storage)*'
            };
          }
        }
        return m;
      });

      return {
        ...s,
        messages: reversedMessages.reverse()
      };
    });
  };

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
    const prunedSessions = pruneSessionsForStorage(updatedSessions, activeSessionId);
    await LocalStorage.setItem('chat_sessions', JSON.stringify(prunedSessions));
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

  const getLoadingMessage = () => {
    const lastUserMsg = messages[messages.length - 1];
    const isHindi = language === 'hi';
    const isHinglish = language === 'hinglish';
    
    if (lastUserMsg?.image) {
      if (isHindi) return 'कृषि मित्र तस्वीर का विश्लेषण कर रहे हैं...';
      if (isHinglish) return 'Mitra photo scan kar rahe hain...';
      return 'Mitra is analyzing the crop photo...';
    }

    const content = (lastUserMsg?.content || '').toLowerCase();
    
    // Weather
    if (content.includes('मौसम') || content.includes('बारिश') || content.includes('weather') || content.includes('rain') || content.includes('temperature') || content.includes('तापमान') || content.includes('barsat')) {
      if (isHindi) return 'कृषि मित्र मौसम की स्थिति की जांच कर रहे हैं...';
      if (isHinglish) return 'Mitra mausam ki jaankari check kar rahe hain...';
      return 'Mitra is checking weather conditions...';
    }

    // Fertilizer / Soil
    if (content.includes('खाद') || content.includes('मिट्टी') || content.includes('urea') || content.includes('fertilizer') || content.includes('soil') || content.includes('यूरिया') || content.includes('dap') || content.includes('gobhar') || content.includes('khad')) {
      if (isHindi) return 'कृषि मित्र खाद और मिट्टी की गणना कर रहे हैं...';
      if (isHinglish) return 'Mitra khaad aur mitti ki details nikal rahe hain...';
      return 'Mitra is calculating fertilizer dosage...';
    }

    // Pest / Disease
    if (content.includes('कीट') || content.includes('रोग') || content.includes('कीड़ा') || content.includes('pest') || content.includes('disease') || content.includes('symptom') || content.includes('बीमारी') || content.includes('kida') || content.includes('bimari')) {
      if (isHindi) return 'कृषि मित्र कीट और रोग संक्रमण की पहचान कर रहे हैं...';
      if (isHinglish) return 'Mitra kide aur bimari ka pata laga rahe hain...';
      return 'Mitra is diagnosing pests and diseases...';
    }

    // Default
    if (isHindi) return 'कृषि मित्र सलाह लिख रहे हैं...';
    if (isHinglish) return 'Mitra jawaab likh rahe hain...';
    return 'Mitra is drafting agricultural advice...';
  };

  const handleSendQuery = async (queryText: string, autoSpeak = false) => {
    if (isOffline) {
      Alert.alert(
        language === 'hi' ? 'कोई इंटरनेट कनेक्शन नहीं' : 'No Internet Connection',
        language === 'hi' 
          ? 'कृषि मित्र एआई उत्तर देने के लिए सक्रिय इंटरनेट कनेक्शन की आवश्यकता है।' 
          : 'Krishi Mitra AI requires an active internet connection to respond.'
      );
      return;
    }
    const trimmed = queryText.trim();
    if (!trimmed && !selectedImage) return;
    if (isLoading) return;

    setErrorMsg(null);
    setInputValue('');

    let imageToSend = selectedImage;
    setSelectedImage(null);

    if (imageToSend) {
      const hostedUrl = await uploadImageToImgBB(imageToSend);
      if (hostedUrl) imageToSend = hostedUrl;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed || (language === 'hi' ? 'कृपया इस चित्र का विश्लेषण करें।' : 'Please analyze this image.'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: imageToSend || undefined
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

      let imageBase64ToSend = undefined;
      if (imageToSend) {
        if (imageToSend.startsWith('data:image')) {
          imageBase64ToSend = imageToSend;
        } else {
          try {
            const absoluteUri = resolveLocalImageUri(imageToSend);
            if (absoluteUri) {
              const base64Data = await FileSystem.readAsStringAsync(absoluteUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              imageBase64ToSend = `data:image/jpeg;base64,${base64Data}`;
            }
          } catch (err) {
            console.warn('[Storage] Error reading image file as base64 on-the-fly:', err);
          }
        }
      }

      const botReply = await sendMessageToGroq(
        historyPayload,
        { state: farmState, soilType: farmSoil, crop: farmCrop },
        model,
        imageBase64ToSend
      );

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...newMessages, botMsg];
      await updateActiveSessionMessages(finalMessages);

      // Auto-speak response aloud if query came via voice
      if (autoSpeak) {
        toggleSpeech(botMsg);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'API connection failed. Please check your internet connection.');
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  handleSendQueryRef.current = handleSendQuery;

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
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <OfflineNotice language={language} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
          enabled={Platform.OS !== 'web'}
        >
          {/* Header Panel */}
          <View style={[
            styles.headerPanel,
            {
              borderBottomColor: theme.borderAccent,
              backgroundColor: theme.glassBackground,
              ...Platform.select({
                web: {
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                } as any,
              }),
            }
          ]}>
            <View style={styles.headerInfoRow}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.backButton,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.borderAccent },
                  pressed && { opacity: 0.7 }
                ]}
                accessibilityLabel="Back"
              >
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any}
                  size={16}
                  tintColor={theme.primary}
                />
              </Pressable>

              <View style={[styles.avatarMini, { backgroundColor: theme.backgroundSelected, borderColor: theme.borderAccent }]}>
                <SymbolView
                  name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                  size={15}
                  tintColor={theme.primary}
                />
                <View style={[styles.onlineDot, { backgroundColor: theme.success }]} />
              </View>

              <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                <View style={styles.headerTitleRow}>
                  <ThemedText style={styles.headerTitle} numberOfLines={1}>
                    Krishik Mitra
                  </ThemedText>
                  <View style={[styles.miniBadge, { backgroundColor: theme.accentLight }]}>
                    <ThemedText style={[styles.miniBadgeText, { color: theme.accent }]}>PRO</ThemedText>
                  </View>
                </View>
                <ThemedText
                  numberOfLines={1}
                  style={[styles.headerSubtitle, { color: theme.textSecondary }]}
                >
                  {farmState} • {farmCrop.split(' ')[0]}
                </ThemedText>
              </View>
            </View>

            <View style={styles.headerControls}>
              <Pressable
                onPress={() => setIsDrawerOpen(true)}
                style={({ pressed }) => [
                  styles.controlIconBtn,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.borderAccent },
                  pressed && { opacity: 0.8 }
                ]}
                accessibilityLabel="Chat History"
              >
                <SymbolView
                  name={{ ios: 'line.horizontal.3', android: 'menu', web: 'menu' } as any}
                  size={16}
                  tintColor={theme.primary}
                />
              </Pressable>

              <Pressable
                onPress={() => setIsMenuOpen(true)}
                style={({ pressed }) => [
                  styles.controlIconBtn,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.borderAccent },
                  pressed && { opacity: 0.8 }
                ]}
                accessibilityLabel="More Options"
              >
                <SymbolView
                  name={{ ios: 'ellipsis.vertical', android: 'more_vert', web: 'more_vert' } as any}
                  size={16}
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
                <View style={[styles.welcomeLogo, { backgroundColor: theme.backgroundSelected, borderColor: theme.borderAccent }]}>
                  <SymbolView
                    name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                    size={44}
                    tintColor={theme.primary}
                  />
                  <View style={[styles.welcomeLogoGlow, { backgroundColor: theme.accentGlow }]} />
                </View>
                
                <ThemedText type="smallBold" style={styles.welcomeTitle}>
                  Namaste! I am your Krishik Mitra (कृषिक मित्र).
                </ThemedText>
                
                <ThemedText type="small" style={[styles.welcomeSub, { color: theme.textSecondary }]}>
                  {language === 'hi'
                    ? 'मैं आपकी कृषि प्रोफ़ाइल '
                    : "I'm configured with your farm profile in "}
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.primary, textDecorationLine: 'underline' }}
                    onPress={() => setActiveModal('state')}
                  >
                    {farmState}
                  </ThemedText>
                  {language === 'hi' ? ' (फसल: ' : ' growing '}
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.accent, textDecorationLine: 'underline' }}
                    onPress={() => setActiveModal('crop')}
                  >
                    {farmCrop.split(' ')[0]}
                  </ThemedText>
                  {language === 'hi' ? ', मिट्टी: ' : ' on '}
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.text, textDecorationLine: 'underline' }}
                    onPress={() => setActiveModal('soil')}
                  >
                    {farmSoil.split(' ')[0]}
                  </ThemedText>
                  {language === 'hi' ? ') के साथ तैयार हूँ।' : ' soil.'}
                </ThemedText>

                {/* Profile Context Chips (Directly Interactive Dropdowns) */}
                <View style={styles.contextChipsRow}>
                  <Pressable
                    onPress={() => setActiveModal('state')}
                    style={({ pressed }) => [
                      styles.chipItem,
                      { backgroundColor: theme.backgroundSelected, borderColor: theme.borderAccent },
                      pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }
                    ]}
                  >
                    <SymbolView name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' } as any} size={11} tintColor={theme.primary} />
                    <ThemedText style={[styles.chipText, { color: theme.primary }]}>{farmState}</ThemedText>
                    <SymbolView name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' } as any} size={10} tintColor={theme.primary} />
                  </Pressable>

                  <Pressable
                    onPress={() => setActiveModal('crop')}
                    style={({ pressed }) => [
                      styles.chipItem,
                      { backgroundColor: theme.accentLight, borderColor: 'rgba(217,119,6,0.35)' },
                      pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }
                    ]}
                  >
                    <SymbolView name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' } as any} size={11} tintColor={theme.accent} />
                    <ThemedText style={[styles.chipText, { color: theme.accent }]}>{farmCrop.split(' ')[0]}</ThemedText>
                    <SymbolView name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' } as any} size={10} tintColor={theme.accent} />
                  </Pressable>

                  <Pressable
                    onPress={() => setActiveModal('soil')}
                    style={({ pressed }) => [
                      styles.chipItem,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }
                    ]}
                  >
                    <SymbolView name={{ ios: 'square.3.layers.3d', android: 'layers', web: 'layers' } as any} size={11} tintColor={theme.textSecondary} />
                    <ThemedText style={[styles.chipText, { color: theme.textSecondary }]}>{farmSoil.split(' ')[0]}</ThemedText>
                    <SymbolView name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' } as any} size={10} tintColor={theme.textSecondary} />
                  </Pressable>
                </View>

                <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, opacity: 0.85, marginTop: 4, textAlign: 'center' }}>
                  {language === 'hi' ? 'किसी भी बटन को दबाकर राज्य, फसल या मिट्टी बदलें' : 'Tap any button above to change farm settings directly'}
                </ThemedText>

                <View style={styles.presetContainer}>
                  <ThemedText type="code" style={[styles.presetHeader, { color: theme.textSecondary }]}>SUGGESTED QUESTIONS:</ThemedText>
                  
                  <Pressable
                    onPress={() => handleSendQuery(
                      `मेरी ${farmCrop.split(' ')[0]} की फसल के लिए नाइट्रोजन, फास्फोरस और पोटाश (NPK) की सही मात्रा कितनी होनी चाहिए?`
                    )}
                    style={({ pressed }) => [
                      styles.presetBubble,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                        borderLeftColor: theme.accent,
                        borderLeftWidth: 4,
                      },
                      pressed && { backgroundColor: theme.backgroundSelected }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                      <View style={[styles.presetIconBadge, { backgroundColor: theme.accentLight }]}>
                        <SymbolView
                          name={{ ios: 'plus.minus.and.percent', android: 'calculate', web: 'calculate' } as any}
                          size={14}
                          tintColor={theme.accent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold" style={{ fontSize: 13 }}>Fertilizer dosage for {farmCrop.split(' ')[0]}</ThemedText>
                        <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 1 }}>NPK ratios & soil nutrient requirements</ThemedText>
                      </View>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSendQuery(
                      `मेरी मिट्टी ${farmSoil.split(' ')[0]} है। इसमें जल निकासी (drainage) और नमी बनाए रखने के लिए क्या उपाय करें?`
                    )}
                    style={({ pressed }) => [
                      styles.presetBubble,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                        borderLeftColor: theme.primary,
                        borderLeftWidth: 4,
                      },
                      pressed && { backgroundColor: theme.backgroundSelected }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                      <View style={[styles.presetIconBadge, { backgroundColor: theme.backgroundSelected }]}>
                        <SymbolView
                          name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' } as any}
                          size={14}
                          tintColor={theme.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold" style={{ fontSize: 13 }}>Water retention in {farmSoil.split(' ')[0]}</ThemedText>
                        <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 1 }}>Drainage tips & irrigation schedules</ThemedText>
                      </View>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSendQuery(
                      `मेरी ${farmCrop.split(' ')[0]} की फसल में लगने वाले मुख्य कीट कौन से हैं और उनसे बचाव के जैविक उपाय बताएं।`
                    )}
                    style={({ pressed }) => [
                      styles.presetBubble,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                        borderLeftColor: theme.primaryDark,
                        borderLeftWidth: 4,
                      },
                      pressed && { backgroundColor: theme.backgroundSelected }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                      <View style={[styles.presetIconBadge, { backgroundColor: theme.backgroundSelected }]}>
                        <SymbolView
                          name={{ ios: 'ladybug.fill', android: 'bug_report', web: 'bug_report' } as any}
                          size={14}
                          tintColor={theme.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold" style={{ fontSize: 13 }}>Pests & organic remedies</ThemedText>
                        <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 1 }}>Biological crop protection & care</ThemedText>
                      </View>
                    </View>
                  </Pressable>
                </View>
              </Animated.View>
            ) : (
              messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  theme={theme}
                  speakingMessageId={speakingMessageId}
                  language={language}
                  onToggleSpeech={toggleSpeech}
                  onFeedback={handleFeedback}
                />
              ))
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
                      <TypingDots theme={theme} />
                      <ThemedText style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500', marginLeft: Spacing.two }}>
                        {getLoadingMessage()}
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

          {/* Image Preview Container */}
          {selectedImage && (
            <View style={[styles.imagePreviewContainer, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <Image source={{ uri: resolveLocalImageUri(selectedImage) || undefined }} style={styles.imagePreview} />
              <Pressable
                onPress={() => setSelectedImage(null)}
                style={[styles.removeImageBtn, { backgroundColor: theme.error }]}
              >
                <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✕</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <Pressable
              onPress={handleImageSelect}
              disabled={isLoading || isRecording || isTranscribing || isOffline}
              style={({ pressed }) => [
                styles.attachButton,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                (isLoading || isRecording || isTranscribing || isOffline) && { opacity: 0.4 },
                pressed && { opacity: 0.8 }
              ]}
            >
              <SymbolView
                name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as any}
                size={20}
                tintColor={theme.primary}
              />
            </Pressable>

            <TextInput
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }
              ]}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              secureTextEntry={false}
              autoCapitalize="sentences"
              autoCorrect={true}
              placeholder={
                isOffline
                  ? (language === 'hi' ? "ऑफ़लाइन: चैट उपलब्ध नहीं है" : "Offline: Chat unavailable")
                  : isRecording 
                    ? (language === 'hi' ? "बोलिए, हम सुन रहे हैं..." : "Speak now, we are listening...") 
                    : isTranscribing 
                      ? (language === 'hi' ? "आवाज को अनुवाद किया जा रहा है..." : "Transcribing voice...") 
                      : (language === 'hi' ? "फसल या खाद के बारे में पूछें..." : "Ask about crops...")
              }
              placeholderTextColor={theme.textSecondary}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={() => handleSendQuery(inputValue)}
              editable={!isLoading && !isRecording && !isTranscribing && !isOffline}
            />

            {inputValue.trim() || selectedImage ? (
              <Pressable
                onPress={() => handleSendQuery(inputValue)}
                disabled={isLoading || isRecording || isTranscribing || isOffline}
                style={({ pressed }) => [
                  styles.sendButton,
                  { backgroundColor: theme.primary },
                  (isLoading || isRecording || isTranscribing || isOffline) && { opacity: 0.5 },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <ThemedText style={[styles.sendIcon, { color: theme.onPrimary }]}>➔</ThemedText>
              </Pressable>
            ) : (
              <AnimatedPressable
                onPress={handleVoiceInput}
                disabled={isLoading || isTranscribing}
                style={[
                  styles.micButton,
                  { backgroundColor: isOffline ? theme.border : isRecording ? theme.error : theme.primary },
                  (isLoading || isTranscribing || isOffline) && { opacity: 0.6 },
                  animatedMicStyle
                ]}
              >
                {isTranscribing ? (
                  <ActivityIndicator size="small" color={theme.onPrimary} />
                ) : (
                  <SymbolView
                    name={{
                      ios: isOffline ? 'mic.slash.fill' : isRecording ? 'stop.fill' : 'mic.fill',
                      android: isOffline ? 'mic_off' : isRecording ? 'stop' : 'mic',
                      web: isOffline ? 'mic_off' : isRecording ? 'stop' : 'mic'
                    } as any}
                    size={18}
                    tintColor={isOffline ? theme.textSecondary : theme.onPrimary}
                  />
                )}
              </AnimatedPressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Sidebar Drawer Overlay */}
      {isDrawerOpen && (
        <Animated.View style={styles.drawerBackdrop} entering={FadeIn.duration(250)} exiting={FadeOut.duration(250)}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDrawerOpen(false)} />
          <Animated.View
            style={[styles.drawerContainer, { backgroundColor: theme.chatBot, borderColor: theme.border }]}
            entering={SlideInRight.springify().damping(18).mass(0.9)}
            exiting={SlideOutRight.springify().damping(18).mass(0.9)}
          >
            <View style={styles.drawerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                <SymbolView
                  name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                  size={18}
                  tintColor={theme.primary}
                />
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                  {language === 'hi' ? 'संवाद इतिहास' : 'Chat History'}
                </ThemedText>
              </View>
              <Pressable onPress={() => setIsDrawerOpen(false)} style={styles.closeDrawerBtn}>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 16, fontWeight: '700' }}>✕</ThemedText>
              </Pressable>
            </View>

            <View style={[styles.drawerProfileCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="code" style={{ fontSize: 10, color: theme.primary, fontWeight: '700' }}>
                {language === 'hi' ? 'सक्रिय प्रोफ़ाइल' : 'ACTIVE PROFILE'}
              </ThemedText>
              <ThemedText type="small" style={{ fontSize: 12, marginTop: 2, fontWeight: '600' }}>
                {formatState(farmState)} • {formatLabel(farmCrop)}
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
                {language === 'hi' ? 'नया संवाद' : 'Start New Chat'}
              </ThemedText>
            </Pressable>

            <ThemedText type="code" style={styles.historySectionLabel}>
              {language === 'hi' ? 'पिछले संवाद' : 'PREVIOUS CHATS'}
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
                          {session.timestamp} • {formatLabel(session.crop)}
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

          </Animated.View>
        </Animated.View>
      )}

      {/* Dropdown Menu Overlay */}
      {isMenuOpen && (
        <View style={styles.menuBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMenuOpen(false)} />
          <View style={styles.dropdownMenuWrapper}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <SymbolView
                    name={
                      model === 'fast'
                        ? ({ ios: 'brain.head.profile', android: 'psychology', web: 'psychology' } as any)
                        : ({ ios: 'bolt.fill', android: 'bolt', web: 'bolt' } as any)
                    }
                    size={16}
                    tintColor={theme.primary}
                  />
                  <ThemedText style={{ fontSize: 13, color: theme.text, fontWeight: '600' }}>
                    {model === 'fast'
                      ? (language === 'hi' ? 'स्मार्ट मॉडल पर जाएं' : 'Switch to Smart Model')
                      : (language === 'hi' ? 'फास्ट मॉडल पर जाएं' : 'Switch to Fast Model')}
                  </ThemedText>
                </View>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <SymbolView
                    name={{ ios: 'trash.fill', android: 'delete', web: 'delete' } as any}
                    size={16}
                    tintColor={theme.error}
                  />
                  <ThemedText style={{ fontSize: 13, color: theme.error, fontWeight: '600' }}>
                    {language === 'hi' ? 'बातचीत साफ़ करें' : 'Clear Conversation'}
                  </ThemedText>
                </View>
              </Pressable>
            </ThemedView>
          </View>
        </View>
      )}

      {/* Interactive Selection Modal for direct farm profile changes from Chat */}
      <SelectionModal
        visible={activeModal !== null}
        title={
          activeModal === 'state'
            ? (language === 'hi' ? 'राज्य का चयन करें' : 'Select State')
            : activeModal === 'crop'
            ? (language === 'hi' ? 'फसल का चयन करें' : 'Select Primary Crop')
            : (language === 'hi' ? 'मिट्टी का प्रकार चुनें' : 'Select Soil Type')
        }
        placeholder={
          activeModal === 'state'
            ? (language === 'hi' ? 'राज्य खोजें...' : 'Search state...')
            : activeModal === 'crop'
            ? (language === 'hi' ? 'फसल खोजें...' : 'Search crop...')
            : (language === 'hi' ? 'मिट्टी खोजें...' : 'Search soil...')
        }
        list={
          activeModal === 'state' ? STATES : activeModal === 'crop' ? CROPS : SOILS
        }
        selectedValue={
          activeModal === 'state' ? farmState : activeModal === 'crop' ? farmCrop : farmSoil
        }
        onSelect={handleSelectConfig}
        onClose={() => setActiveModal(null)}
        onUseLiveLocation={activeModal === 'state' ? handleDetectLocation : undefined}
        isDetectingLocation={isDetectingLocation}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    width: '100%',
    alignItems: 'center',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  keyboardView: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  headerPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingTop: Spacing.two + 4,
    paddingBottom: Spacing.two + 2,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    zIndex: 10,
    gap: 8,
  },
  headerInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  miniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  miniBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    zIndex: 99999,
  },
  dropdownMenuWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    position: 'relative',
    pointerEvents: 'box-none',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 65,
    right: Spacing.three,
    width: 210,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 100000,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
      }
    }),
    paddingVertical: Spacing.one + 2,
  },
  menuOption: {
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  menuDivider: {
    height: 1,
    width: '100%',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 9999,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      } as any
    }),
  },
  drawerContainer: {
    width: '82%',
    maxWidth: 320,
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
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: Spacing.two + 2,
    marginBottom: Spacing.three,
  },
  historySectionLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: '700',
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
    borderRadius: Spacing.two + 2,
    padding: Spacing.two + 2,
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
  messagesContainer: {
    flex: 1,
    width: '100%',
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
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    position: 'relative',
  },
  welcomeLogoGlow: {
    position: 'absolute',
    inset: -6,
    borderRadius: 50,
    zIndex: -1,
  },
  welcomeTitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: Spacing.two,
    letterSpacing: -0.2,
  },
  welcomeSub: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    lineHeight: 20,
  },
  contextChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetContainer: {
    width: '100%',
    gap: Spacing.two + 2,
  },
  presetHeader: {
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  presetBubble: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    ...Platform.select({
      web: {
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
      } as any
    })
  },
  presetIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    borderRadius: 20,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three + 2,
  },
  userBubble: {
    maxWidth: '85%',
    borderBottomRightRadius: 4,
    borderWidth: 1,
  },
  botBubble: {
    maxWidth: Platform.OS === 'web' ? '95%' : '92%',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '500',
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
    width: '100%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    gap: Spacing.two,
    paddingBottom: Platform.OS === 'ios' ? Spacing.two : Spacing.three,
  },
  textInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: Spacing.four,
    fontSize: 15,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any
    })
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any
    })
  },
  sendIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any
    })
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  bubbleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 28,
    borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      } as any
    })
  },
  actionText: {
    fontSize: 9,
    fontWeight: '800',
  },
  attachButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any
    })
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.one,
    padding: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignSelf: 'flex-start',
    position: 'relative',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: Spacing.one,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.2)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
    }),
  },
});
