import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';

import cropsData from '@/constants/crops.json';
import { SelectionModal } from '@/components/selection-modal';
import { AppLogo } from '@/components/app-logo';
import { TermsModal } from '@/components/terms-modal';

const STATES = [
  'Uttar Pradesh', 'Punjab', 'Haryana', 'Madhya Pradesh', 
  'Maharashtra', 'Rajasthan', 'Gujarat', 'Bihar', 'Karnataka', 'Andhra Pradesh'
];
const SOILS = [
  'Alluvial Soil (जलोढ़)', 'Black Soil (काली मिट्टी)', 'Red Soil (लाल मिट्टी)', 
  'Sandy Soil (बलुई मिट्टी)', 'Clayey Soil (चिकनी मिट्टी)', 'Loamy Soil (दोमट)'
];
const CROPS = cropsData.map(c => c.name);

const BG_IMAGES = [
  require('@/assets/images/farm_bg.png'),
  require('@/assets/images/farm_bg_2.png'),
  require('@/assets/images/farm_bg_3.png'),
];

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const { login, register } = useAuth();
  const theme = useTheme();

  // Background slideshow crossfade animation
  const [bgIndex, setBgIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: false,
      }).start(() => {
        setBgIndex((prev) => (prev + 1) % BG_IMAGES.length);
        fadeAnim.setValue(1);
      });
    }, 6000);

    return () => clearInterval(timer);
  }, [fadeAnim]);

  // Mode state
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [step, setStep] = useState(1); // 1: Personal Info, 2: Farm Profile (For signup)
  const { language: lang, setLanguage } = useLanguage();
  const setLang = (l: 'hi' | 'en') => setLanguage(l);

  // Tab sliding spring animation value: 0 for Login, 1 for Signup
  const tabAnim = useRef(new Animated.Value(0)).current;
  // Form transition animation value
  const formAnim = useRef(new Animated.Value(1)).current;

  const handleTabSwitch = (toLogin: boolean) => {
    if (isLoginMode === toLogin) return;
    setErrorMsg(null);
    setStep(1);

    // Animate tab pill slide with smooth spring physics
    Animated.spring(tabAnim, {
      toValue: toLogin ? 0 : 1,
      tension: 68,
      friction: 10,
      useNativeDriver: false,
    }).start();

    // Animate form crossfade and subtle zoom effect
    formAnim.setValue(0.88);
    setIsLoginMode(toLogin);
    Animated.timing(formAnim, {
      toValue: 1,
      duration: 240,
      useNativeDriver: false,
    }).start();
  };

  const pillLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['1.5%', '50.5%'],
  });

  // Input states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedSoil, setSelectedSoil] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');

  // Selector modal states
  const [activeModal, setActiveModal] = useState<'state' | 'soil' | 'crop' | null>(null);

  const openModal = (type: 'state' | 'soil' | 'crop') => {
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // Status & Terms states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  // Translations
  const t = {
    hi: {
      appName: 'कृषिक मित्र',
      welcome: 'नमस्ते किसान भाई!',
      subtitle: 'स्मार्ट खेती की ओर आपका पहला कदम।',
      loginTab: 'लॉगिन',
      signupTab: 'नया खाता',
      nameLabel: 'आपका नाम',
      namePlace: 'जैसे: रमेश सिंह',
      phoneLabel: 'मोबाइल नंबर',
      phonePlace: '10 अंकों का मोबाइल नंबर',
      pinLabel: '4-अंकों का गुप्त पिन (Passcode/PIN)',
      pinPlace: '••••',
      stateLabel: 'राज्य (State)',
      soilLabel: 'मिट्टी का प्रकार (Soil Type)',
      cropLabel: 'सक्रिय फसल (Active Crop)',
      selectPlace: 'चुनने के लिए दबाएं ▾',
      btnNext: 'आगे बढ़ें ➔',
      btnBack: '➔ पीछे',
      btnSubmitSignup: 'खाता बनाएं',
      btnSubmitLogin: 'प्रवेश करें',
      btnSkip: 'बिना लॉगिन के देखें (Demo) ➔',
      loginErr: 'गलत मोबाइल नंबर या पिन दर्ज किया गया है।',
      fillErr: 'कृपया सभी आवश्यक फ़ील्ड भरें।',
      phoneFormatErr: 'कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।',
      pinFormatErr: 'पिन 4 अंकों का होना चाहिए।',
      soilPlaceholder: 'मिट्टी चुनें',
      cropPlaceholder: 'फसल चुनें',
      statePlaceholder: 'राज्य चुनें',
    },
    en: {
      appName: 'Krishik Mitra',
      welcome: 'Welcome, Farmer!',
      subtitle: 'AI for Agriculture',
      loginTab: 'Login',
      signupTab: 'Sign Up',
      nameLabel: 'Your Name',
      namePlace: 'e.g. Ramesh Singh',
      phoneLabel: 'Mobile Number',
      phonePlace: '10-digit phone number',
      pinLabel: '4-digit Passcode/PIN',
      pinPlace: '••••',
      stateLabel: 'State',
      soilLabel: 'Soil Type',
      cropLabel: 'Active Crop',
      selectPlace: 'Tap to select ▾',
      btnNext: 'Next Step ➔',
      btnBack: '➔ Back',
      btnSubmitSignup: 'Register Account',
      btnSubmitLogin: 'Login',
      btnSkip: 'Explore App as Guest (Demo) ➔',
      loginErr: 'Invalid phone number or PIN.',
      fillErr: 'Please fill in all required fields.',
      phoneFormatErr: 'Please enter a valid 10-digit mobile number.',
      pinFormatErr: 'PIN must be exactly 4 digits.',
      soilPlaceholder: 'Select soil type',
      cropPlaceholder: 'Select crop',
      statePlaceholder: 'Select state',
    },
  }[lang];

  const validatePhone = (num: string) => {
    return /^[6-9]\d{9}$/.test(num);
  };

  const validatePin = (code: string) => {
    return /^\d{4}$/.test(code);
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (!isLoginMode && step === 1) {
      if (!name.trim()) {
        setErrorMsg(t.fillErr);
        return;
      }
      if (!validatePhone(phone)) {
        setErrorMsg(t.phoneFormatErr);
        return;
      }
      if (!validatePin(pin)) {
        setErrorMsg(t.pinFormatErr);
        return;
      }
      setStep(2);
    }
  };

  const handleAuthSubmit = async () => {
    setErrorMsg(null);

    if (!agreedToTerms) {
      setErrorMsg(
        lang === 'hi'
          ? 'आगे बढ़ने के लिए कृपया सेवा की शर्तों एवं गोपनीयता नीति को स्वीकार करें।'
          : 'Please accept the Terms of Service & Privacy Policy to proceed.'
      );
      return;
    }

    setIsLoading(true);

    try {
      if (isLoginMode) {
        if (!validatePhone(phone) || !validatePin(pin)) {
          setErrorMsg(t.loginErr);
          setIsLoading(false);
          return;
        }

        const success = await login(phone, pin);
        if (success) {
          onLoginSuccess();
        } else {
          setErrorMsg(t.loginErr);
        }
      } else {
        // Register mode
        if (!selectedState || !selectedSoil || !selectedCrop) {
          setErrorMsg(t.fillErr);
          setIsLoading(false);
          return;
        }

        const success = await register(
          name.trim(),
          phone,
          selectedState,
          selectedSoil,
          selectedCrop,
          pin
        );

        if (success) {
          onLoginSuccess();
        } else {
          setErrorMsg(lang === 'hi' ? 'खाता बनाने में त्रुटि हुई।' : 'Error creating account.');
        }
      }
    } catch (e) {
      console.error(e);
      setErrorMsg(lang === 'hi' ? 'सर्वर से संपर्क नहीं हो पाया।' : 'Network connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipLogin = async () => {
    setIsLoading(true);
    // Create demo profile
    await register(
      'Kisan Guest',
      '9999999999',
      'Punjab',
      'Alluvial Soil (जलोढ़)',
      'Wheat (गेहूं)',
      '1234'
    );
    setIsLoading(false);
    onLoginSuccess();
  };

  const nextBgIndex = (bgIndex + 1) % BG_IMAGES.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Slideshow Layer */}
      <View style={StyleSheet.absoluteFill}>
        {/* Next Image (Static beneath) */}
        <Image
          source={BG_IMAGES[nextBgIndex]}
          style={styles.bgImage}
          resizeMode="cover"
        />
        {/* Current Image (Fading out smoothly) */}
        <Animated.Image
          source={BG_IMAGES[bgIndex]}
          style={[styles.bgImage, { opacity: fadeAnim, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}
          resizeMode="cover"
        />
        {/* Subtle Dark/Emerald Gradient Overlay */}
        <View style={styles.bgOverlay} />
      </View>

        {/* Language Selector */}
        <View style={styles.langToggleContainer}>
          <Pressable
            onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')}
            style={[styles.langToggleBtn, { backgroundColor: theme.dark ? 'rgba(20,40,25,0.85)' : 'rgba(255,255,255,0.92)', borderColor: theme.dark ? 'rgba(255,255,255,0.35)' : '#166534' }]}
          >
            <ThemedText
              type="smallBold"
              style={{ color: theme.dark ? '#ffffff' : '#166534' }}
            >
              🇮 {lang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <AppLogo
              size="hero"
              language={lang}
              welcomeText={t.welcome}
              textColor="#ffffff"
            />
          </View>

          {/* Form Container (High-Contrast Solid Frosted Glass Card) */}
          <View style={[
            styles.authCard,
            {
              backgroundColor: theme.dark ? 'rgba(10, 26, 15, 0.90)' : 'rgba(255, 255, 255, 0.94)',
              borderColor: theme.dark ? 'rgba(255, 255, 255, 0.30)' : 'rgba(255, 255, 255, 0.95)'
            }
          ]}>
            {/* Mode Selector Tabs */}
            <View style={[styles.modeTabs, { backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.08)' }]}>
              {/* Sliding Active Pill Background */}
              <Animated.View
                style={[
                  styles.slidingPill,
                  {
                    left: pillLeft,
                    backgroundColor: '#166534',
                  }
                ]}
              />

              <Pressable
                onPress={() => handleTabSwitch(true)}
                style={styles.modeTabBtn}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.modeTabText,
                    { color: isLoginMode ? '#ffffff' : (theme.dark ? 'rgba(255, 255, 255, 0.70)' : '#1B4D2E') }
                  ]}
                >
                  {t.loginTab}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleTabSwitch(false)}
                style={styles.modeTabBtn}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.modeTabText,
                    { color: !isLoginMode ? '#ffffff' : (theme.dark ? 'rgba(255, 255, 255, 0.70)' : '#1B4D2E') }
                  ]}
                >
                  {t.signupTab}
                </ThemedText>
              </Pressable>
            </View>

            {errorMsg && (
              <View style={[styles.errorBox, { backgroundColor: theme.error + '1A', borderColor: theme.error }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one }}>
                  <SymbolView
                    name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' } as any}
                    size={14}
                    tintColor={theme.error}
                  />
                  <ThemedText type="small" style={{ color: theme.error, fontWeight: '600' }}>
                    {errorMsg}
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Form Content with Smooth Animated Crossfade */}
            <Animated.View style={{ opacity: formAnim }}>
              {isLoginMode ? (
                // LOGIN FORM
                <View style={styles.formFields}>
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.dark ? '#ffffff' : '#051C0C' }]}>{t.phoneLabel}</ThemedText>
                    <TextInput
                      style={[styles.inputField, { color: theme.dark ? '#ffffff' : '#051C0C', borderColor: theme.dark ? 'rgba(255,255,255,0.3)' : 'rgba(11,41,20,0.25)', backgroundColor: theme.dark ? 'rgba(0,0,0,0.45)' : '#FFFFFF' }]}
                      placeholder={t.phonePlace}
                      placeholderTextColor={theme.dark ? 'rgba(255,255,255,0.55)' : 'rgba(10,35,18,0.55)'}
                      value={phone}
                      onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, ''))}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.dark ? '#ffffff' : '#051C0C' }]}>{t.pinLabel}</ThemedText>
                    <TextInput
                      style={[styles.inputField, { color: theme.dark ? '#ffffff' : '#051C0C', borderColor: theme.dark ? 'rgba(255,255,255,0.3)' : 'rgba(11,41,20,0.25)', backgroundColor: theme.dark ? 'rgba(0,0,0,0.45)' : '#FFFFFF' }]}
                      placeholder={t.pinPlace}
                      placeholderTextColor={theme.dark ? 'rgba(255,255,255,0.55)' : 'rgba(10,35,18,0.55)'}
                      value={pin}
                      onChangeText={(val) => setPin(val.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={4}
                    />
                  </View>

                  {/* Terms & Conditions Checkbox Row */}
                  <View style={styles.termsAgreementRow}>
                    <Pressable
                      onPress={() => setAgreedToTerms(!agreedToTerms)}
                      style={[
                        styles.checkboxSquare,
                        agreedToTerms && { backgroundColor: '#166534', borderColor: '#166534' }
                      ]}
                    >
                      {agreedToTerms && (
                        <SymbolView
                          name={{ ios: 'checkmark', android: 'check', web: 'check' } as any}
                          size={13}
                          tintColor="#ffffff"
                        />
                      )}
                    </Pressable>
                    <View style={styles.termsTextWrap}>
                      <ThemedText type="small" style={{ fontSize: 12, color: theme.dark ? '#ffffff' : '#051C0C', fontWeight: '600' }}>
                        {lang === 'hi' ? 'मैं ' : 'I agree to '}
                      </ThemedText>
                      <Pressable onPress={() => setTermsModalVisible(true)}>
                        <ThemedText type="smallBold" style={{ fontSize: 12, color: theme.dark ? '#86efac' : '#166534', textDecorationLine: 'underline', fontWeight: '700' }}>
                          {lang === 'hi' ? 'सेवा की शर्तों एवं गोपनीयता नीति' : 'Terms & Privacy Policy'}
                        </ThemedText>
                      </Pressable>
                      <ThemedText type="small" style={{ fontSize: 12, color: theme.dark ? '#ffffff' : '#051C0C', fontWeight: '600' }}>
                        {lang === 'hi' ? ' से सहमत हूँ।' : '.'}
                      </ThemedText>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleAuthSubmit}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      { backgroundColor: '#166534' },
                      pressed && { opacity: 0.9 },
                      isLoading && { opacity: 0.7 }
                    ]}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <ThemedText type="smallBold" style={[styles.submitBtnText, { color: '#ffffff' }]}>{t.btnSubmitLogin}</ThemedText>
                    )}
                  </Pressable>
                </View>
              ) : (
                // SIGNUP FORM (MULTI-STEP)
                <View style={styles.formFields}>
                  {step === 1 ? (
                    // Step 1: Account credentials
                    <View style={{ gap: Spacing.two }}>
                      <View style={styles.inputGroup}>
                        <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.dark ? '#ffffff' : '#051C0C' }]}>{t.nameLabel}</ThemedText>
                        <TextInput
                          style={[styles.inputField, { color: theme.dark ? '#ffffff' : '#051C0C', borderColor: theme.dark ? 'rgba(255,255,255,0.3)' : 'rgba(11,41,20,0.25)', backgroundColor: theme.dark ? 'rgba(0,0,0,0.45)' : '#FFFFFF' }]}
                          placeholder={t.namePlace}
                          placeholderTextColor={theme.dark ? 'rgba(255,255,255,0.55)' : 'rgba(10,35,18,0.55)'}
                          value={name}
                          onChangeText={setName}
                          autoCapitalize="words"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.dark ? '#ffffff' : '#051C0C' }]}>{t.phoneLabel}</ThemedText>
                        <TextInput
                          style={[styles.inputField, { color: theme.dark ? '#ffffff' : '#051C0C', borderColor: theme.dark ? 'rgba(255,255,255,0.3)' : 'rgba(11,41,20,0.25)', backgroundColor: theme.dark ? 'rgba(0,0,0,0.45)' : '#FFFFFF' }]}
                          placeholder={t.phonePlace}
                          placeholderTextColor={theme.dark ? 'rgba(255,255,255,0.55)' : 'rgba(10,35,18,0.55)'}
                          value={phone}
                          onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, ''))}
                          keyboardType="phone-pad"
                          maxLength={10}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.dark ? '#ffffff' : '#051C0C' }]}>{t.pinLabel}</ThemedText>
                        <TextInput
                          style={[styles.inputField, { color: theme.dark ? '#ffffff' : '#051C0C', borderColor: theme.dark ? 'rgba(255,255,255,0.3)' : 'rgba(11,41,20,0.25)', backgroundColor: theme.dark ? 'rgba(0,0,0,0.45)' : '#FFFFFF' }]}
                          placeholder={t.pinPlace}
                          placeholderTextColor={theme.dark ? 'rgba(255,255,255,0.55)' : 'rgba(10,35,18,0.55)'}
                          value={pin}
                          onChangeText={(val) => setPin(val.replace(/[^0-9]/g, ''))}
                          keyboardType="numeric"
                          secureTextEntry
                          maxLength={4}
                        />
                      </View>

                      <Pressable
                        onPress={handleNextStep}
                        style={({ pressed }) => [
                          styles.submitBtn,
                          { backgroundColor: '#166534' },
                          pressed && { opacity: 0.9 }
                        ]}
                      >
                        <ThemedText type="smallBold" style={[styles.submitBtnText, { color: '#ffffff' }]}>{t.btnNext}</ThemedText>
                      </Pressable>
                    </View>
                  ) : (
                    // Step 2: Farm Profile Details
                    <View style={{ gap: Spacing.two }}>
                      <View style={styles.inputGroup}>
                        <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.dark ? '#ffffff' : '#051C0C' }]}>{t.stateLabel}</ThemedText>
                        <Pressable
                          onPress={() => openModal('state')}
                          style={[styles.selectorInputBtn, { borderColor: theme.dark ? 'rgba(255,255,255,0.3)' : 'rgba(11,41,20,0.25)', backgroundColor: theme.dark ? 'rgba(0,0,0,0.45)' : '#FFFFFF' }]}
                        >
                          <ThemedText type="small" style={{ color: selectedState ? (theme.dark ? '#ffffff' : '#051C0C') : (theme.dark ? 'rgba(255,255,255,0.55)' : 'rgba(10,35,18,0.55)') }}>
                            {selectedState || t.selectPlace}
                          </ThemedText>
                        </Pressable>
                      </View>

                      <View style={styles.inputGroup}>
                        <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.dark ? '#ffffff' : '#051C0C' }]}>{t.soilLabel}</ThemedText>
                        <Pressable
                          onPress={() => openModal('soil')}
                          style={[styles.selectorInputBtn, { borderColor: theme.dark ? 'rgba(255,255,255,0.3)' : 'rgba(11,41,20,0.25)', backgroundColor: theme.dark ? 'rgba(0,0,0,0.45)' : '#FFFFFF' }]}
                        >
                          <ThemedText type="small" style={{ color: selectedSoil ? (theme.dark ? '#ffffff' : '#051C0C') : (theme.dark ? 'rgba(255,255,255,0.55)' : 'rgba(10,35,18,0.55)') }}>
                            {selectedSoil || t.selectPlace}
                          </ThemedText>
                        </Pressable>
                      </View>

                      <View style={styles.inputGroup}>
                        <ThemedText type="smallBold" style={[styles.inputLabel, { color: theme.dark ? '#ffffff' : '#051C0C' }]}>{t.cropLabel}</ThemedText>
                        <Pressable
                          onPress={() => openModal('crop')}
                          style={[styles.selectorInputBtn, { borderColor: theme.dark ? 'rgba(255,255,255,0.3)' : 'rgba(11,41,20,0.25)', backgroundColor: theme.dark ? 'rgba(0,0,0,0.45)' : '#FFFFFF' }]}
                        >
                          <ThemedText type="small" style={{ color: selectedCrop ? (theme.dark ? '#ffffff' : '#051C0C') : (theme.dark ? 'rgba(255,255,255,0.55)' : 'rgba(10,35,18,0.55)') }}>
                            {selectedCrop || t.selectPlace}
                          </ThemedText>
                        </Pressable>
                      </View>

                      {/* Terms & Conditions Checkbox Row */}
                      <View style={styles.termsAgreementRow}>
                        <Pressable
                          onPress={() => setAgreedToTerms(!agreedToTerms)}
                          style={[
                            styles.checkboxSquare,
                            agreedToTerms && { backgroundColor: '#166534', borderColor: '#166534' }
                          ]}
                        >
                          {agreedToTerms && (
                            <SymbolView
                              name={{ ios: 'checkmark', android: 'check', web: 'check' } as any}
                              size={13}
                              tintColor="#ffffff"
                            />
                          )}
                        </Pressable>
                        <View style={styles.termsTextWrap}>
                          <ThemedText type="small" style={{ fontSize: 12, color: theme.dark ? '#ffffff' : '#051C0C' }}>
                            {lang === 'hi' ? 'मैं ' : 'I agree to '}
                          </ThemedText>
                          <Pressable onPress={() => setTermsModalVisible(true)}>
                            <ThemedText type="smallBold" style={{ fontSize: 12, color: theme.dark ? '#86efac' : '#166534', textDecorationLine: 'underline' }}>
                              {lang === 'hi' ? 'सेवा की शर्तों एवं गोपनीयता नीति' : 'Terms & Privacy Policy'}
                            </ThemedText>
                          </Pressable>
                          <ThemedText type="small" style={{ fontSize: 12, color: theme.dark ? '#ffffff' : '#051C0C' }}>
                            {lang === 'hi' ? ' से सहमत हूँ।' : '.'}
                          </ThemedText>
                        </View>
                      </View>

                      <View style={styles.signupNavBtns}>
                        <Pressable
                          onPress={() => setStep(1)}
                          style={({ pressed }) => [
                            styles.backBtn,
                            { borderColor: theme.dark ? 'rgba(255,255,255,0.35)' : 'rgba(11,41,20,0.25)', backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                            pressed && { opacity: 0.8 }
                          ]}
                        >
                          <ThemedText type="smallBold" style={{ color: theme.dark ? '#ffffff' : '#051C0C' }}>{t.btnBack}</ThemedText>
                        </Pressable>

                        <Pressable
                          onPress={handleAuthSubmit}
                          disabled={isLoading}
                          style={({ pressed }) => [
                            styles.signupSubmitBtn,
                            { backgroundColor: '#166534' },
                            pressed && { opacity: 0.9 },
                            isLoading && { opacity: 0.7 }
                          ]}
                        >
                          {isLoading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <ThemedText type="smallBold" style={[styles.submitBtnText, { color: '#ffffff' }]}>{t.btnSubmitSignup}</ThemedText>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Animated.View>
          </View>

          {/* Demo Bypass / Skip for now Button */}
          <Pressable
            onPress={handleSkipLogin}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.skipBtn,
              { backgroundColor: theme.dark ? 'rgba(15, 32, 20, 0.85)' : 'rgba(255, 255, 255, 0.90)', borderColor: theme.dark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(22, 101, 52, 0.35)' },
              pressed && { opacity: 0.8 }
            ]}
          >
            <ThemedText type="smallBold" style={[styles.skipBtnText, { color: theme.dark ? '#ffffff' : '#166534' }]}>
              {t.btnSkip}
            </ThemedText>
          </Pressable>

          {/* App Key Features Showcase Grid */}
          <View style={styles.featuresContainer}>
            <ThemedText type="subtitle" style={styles.featuresHeadline}>
              {lang === 'hi' ? '✨ कृषिक मित्र की मुख्य सुविधाएं' : '✨ Key Platform Features'}
            </ThemedText>

            <View style={styles.featuresGrid}>
              {/* Feature 1 */}
              <View style={styles.featureCard}>
                <View style={styles.featureIconBadge}>
                  <ThemedText style={{ fontSize: 22 }}>🤖</ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.featureTitle}>
                  {lang === 'hi' ? 'AI कृषि सलाहकार' : 'AI Agronomy Bot'}
                </ThemedText>
                <ThemedText type="small" style={styles.featureDesc}>
                  {lang === 'hi'
                    ? 'अपनी भाषा में बोलकर फसल कीट, बीमारी और खेती की सलाह पाएँ।'
                    : 'Ask farming & crop questions via native Voice or Text.'}
                </ThemedText>
              </View>

              {/* Feature 2 */}
              <View style={styles.featureCard}>
                <View style={styles.featureIconBadge}>
                  <ThemedText style={{ fontSize: 22 }}>📷</ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.featureTitle}>
                  {lang === 'hi' ? 'कीट पहचान (AI Scan)' : 'Pest Scan Diagnosis'}
                </ThemedText>
                <ThemedText type="small" style={styles.featureDesc}>
                  {lang === 'hi'
                    ? 'पत्ती की फोटो खींचें और तुरंत सटीक बीमारी व इलाज जानें।'
                    : 'Instant leaf disease diagnosis and treatment plan with camera.'}
                </ThemedText>
              </View>

              {/* Feature 3 */}
              <View style={styles.featureCard}>
                <View style={styles.featureIconBadge}>
                  <ThemedText style={{ fontSize: 22 }}>📈</ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.featureTitle}>
                  {lang === 'hi' ? 'लाइव मंडी भाव' : 'Live Mandi Prices'}
                </ThemedText>
                <ThemedText type="small" style={styles.featureDesc}>
                  {lang === 'hi'
                    ? 'देश भर की एपीएमसी मंडियों के ताजा जिंस रेट देखें।'
                    : 'Real-time APMC commodity rates from mandis across India.'}
                </ThemedText>
              </View>

              {/* Feature 4 */}
              <View style={styles.featureCard}>
                <View style={styles.featureIconBadge}>
                  <ThemedText style={{ fontSize: 22 }}>☀️</ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.featureTitle}>
                  {lang === 'hi' ? 'मौसम एडवाइजरी' : 'Weather & Advisory'}
                </ThemedText>
                <ThemedText type="small" style={styles.featureDesc}>
                  {lang === 'hi'
                    ? 'स्थानीय बारिश, तापमान और साप्ताहिक कृषि सलाह।'
                    : 'Hyper-local weather alerts, rain forecast, and crop advisory.'}
                </ThemedText>
              </View>

              {/* Feature 5 */}
              <View style={styles.featureCard}>
                <View style={styles.featureIconBadge}>
                  <ThemedText style={{ fontSize: 22 }}>🧪</ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.featureTitle}>
                  {lang === 'hi' ? 'मृदा व खाद कैलकुलेटर' : 'Fertilizer Calculator'}
                </ThemedText>
                <ThemedText type="small" style={styles.featureDesc}>
                  {lang === 'hi'
                    ? 'जमीन के क्षेत्रफल के अनुसार यूरिया, डीएपी की सही मात्रा।'
                    : 'Precise crop fertilizer dosage calculator scaled for your land.'}
                </ThemedText>
              </View>

              {/* Feature 6 */}
              <View style={styles.featureCard}>
                <View style={styles.featureIconBadge}>
                  <ThemedText style={{ fontSize: 22 }}>👥</ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.featureTitle}>
                  {lang === 'hi' ? 'किसान चौपाल' : 'Farmer Community'}
                </ThemedText>
                <ThemedText type="small" style={styles.featureDesc}>
                  {lang === 'hi'
                    ? 'अन्य किसान भाइयों से अनुभव शेयर करें और सुझाव पाएँ।'
                    : 'Connect with fellow farmers and share crop advice.'}
                </ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>

      {/* Selector Modals */}
      <SelectionModal
        visible={activeModal !== null}
        title={
          activeModal === 'state'
            ? t.statePlaceholder
            : activeModal === 'soil'
            ? t.soilPlaceholder
            : t.cropPlaceholder
        }
        placeholder={
          lang === 'hi' ? 'खोजें...' : 'Search...'
        }
        list={
          activeModal === 'state'
            ? STATES
            : activeModal === 'soil'
            ? SOILS
            : CROPS
        }
        selectedValue={
          activeModal === 'state'
            ? selectedState
            : activeModal === 'soil'
            ? selectedSoil
            : selectedCrop
        }
        onSelect={(value) => {
          if (activeModal === 'state') setSelectedState(value);
          else if (activeModal === 'soil') setSelectedSoil(value);
          else if (activeModal === 'crop') setSelectedCrop(value);
          closeModal();
        }}
        onClose={closeModal}
      />

      {/* Terms & Privacy Policies Modal */}
      <TermsModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
        onAccept={() => setAgreedToTerms(true)}
        language={lang}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 20, 10, 0.45)',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    maxWidth: 580,
    width: '100%',
    alignSelf: 'center',
  },
  langToggleContainer: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.four,
    zIndex: 10,
  },
  langToggleBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
      } as any,
      default: {
        elevation: 4,
      }
    })
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.two,
    gap: Spacing.half,
  },
  brandLogo: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4), 0 0 24px rgba(74, 222, 128, 0.55)',
      } as any,
      default: {
        elevation: 12,
      }
    })
  },
  brandLogoImg: {
    width: '100%',
    height: '100%',
  },
  brandIcon: {
    fontSize: 36,
  },
  brandName: {
    fontSize: 34,
    fontFamily: 'Pravah-Bold',
    ...Platform.select({
      web: {
        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
      } as any,
      default: {}
    })
  },
  taglineBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    marginVertical: 2,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      } as any,
      default: {}
    })
  },
  welcomeText: {
    fontSize: 22,
    marginTop: Spacing.half,
    fontWeight: '700',
    ...Platform.select({
      web: {
        textShadow: '0 2px 8px rgba(0,0,0,0.4)',
      } as any,
      default: {}
    })
  },
  subText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
  authCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.three,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(30px) saturate(190%)',
        WebkitBackdropFilter: 'blur(30px) saturate(190%)',
        boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      }
    })
  },
  modeTabs: {
    flexDirection: 'row',
    position: 'relative',
    borderRadius: 16,
    padding: 4,
    marginBottom: Spacing.three,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      } as any,
      default: {}
    })
  },
  slidingPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '48%',
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
      } as any,
      default: {
        elevation: 4,
      }
    })
  },
  modeTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 2,
  },
  activeModeTab: {
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
      } as any,
      default: {
        elevation: 3,
      }
    })
  },
  modeTabText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    marginBottom: Spacing.two,
  },
  formFields: {
    gap: Spacing.three,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputField: {
    height: 56,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    fontSize: 18,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        outlineStyle: 'none',
        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(255, 255, 255, 0.5)',
      } as any,
      default: {}
    })
  },
  selectorInputBtn: {
    height: 56,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as any,
      default: {}
    })
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(46, 125, 50, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
      } as any,
      default: {
        elevation: 6,
      }
    })
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  signupNavBtns: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  backBtn: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupSubmitBtn: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    marginTop: Spacing.three,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 20px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.6)',
      } as any,
      default: {
        elevation: 4,
      }
    })
  },
  skipBtnText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalCard: {
    width: '90%',
    maxWidth: 400,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.two,
  },
  closeBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {}
    })
  },
  modalList: {
    marginTop: Spacing.two,
  },
  modalItem: {
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {}
    })
  },
  termsAgreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: Spacing.one,
    paddingHorizontal: 4,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsTextWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    flex: 1,
  },
  featuresContainer: {
    width: '100%',
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  featuresHeadline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: Spacing.one,
    ...Platform.select({
      web: {
        textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
      } as any,
      default: {}
    })
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    minWidth: 150,
    flexGrow: 1,
    borderRadius: 18,
    padding: Spacing.two,
    backgroundColor: 'rgba(10, 32, 18, 0.86)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    gap: 6,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      } as any,
      default: {
        elevation: 6,
      }
    })
  },
  featureIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  featureDesc: {
    fontSize: 11.5,
    color: '#E8F5E9',
    lineHeight: 16,
  },
});
