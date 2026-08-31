import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import cropsData from '@/constants/crops.json';
import { SelectionModal } from '@/components/selection-modal';

const STATES = [
  'Uttar Pradesh', 'Punjab', 'Haryana', 'Madhya Pradesh', 
  'Maharashtra', 'Rajasthan', 'Gujarat', 'Bihar', 'Karnataka', 'Andhra Pradesh'
];
const SOILS = [
  'Alluvial Soil (जलोढ़)', 'Black Soil (काली मिट्टी)', 'Red Soil (लाल मिट्टी)', 
  'Sandy Soil (बलुई मिट्टी)', 'Clayey Soil (चिकनी मिट्टी)', 'Loamy Soil (दोमट)'
];
const CROPS = cropsData.map(c => c.name);

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const { login, register } = useAuth();
  const theme = useTheme();

  // Mode state
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [step, setStep] = useState(1); // 1: Personal Info, 2: Farm Profile (For signup)
  const [lang, setLang] = useState<'hi' | 'en'>('hi');

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

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Translations
  const t = {
    hi: {
      appName: 'कृषि मित्र AI',
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
      appName: 'Krishi Mitra AI',
      welcome: 'Welcome, Farmer!',
      subtitle: 'Your partner in smarter, modern agriculture.',
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



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Language Selector */}
        <View style={styles.langToggleContainer}>
          <Pressable
            onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')}
            style={[styles.langToggleBtn, { borderColor: theme.primary }]}
          >
            <ThemedText
              type="smallBold"
              style={{ color: theme.primary }}
            >
              🇮🇳 {lang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
            </ThemedText>
          </Pressable>
        </View>

        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={[styles.brandLogo, { backgroundColor: theme.primary }]}>
            <SymbolView
              name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
              size={32}
              tintColor={theme.onPrimary}
            />
          </View>
          <ThemedText type="title" style={[styles.brandName, { color: theme.primary }]}>
            {t.appName}
          </ThemedText>
          <ThemedText type="subtitle" style={[styles.welcomeText, { color: theme.text }]}>
            {t.welcome}
          </ThemedText>
          <ThemedText type="small" style={[styles.subText, { color: theme.textSecondary }]}>
            {t.subtitle}
          </ThemedText>
        </View>

        {/* Form Container */}
        <ThemedView type="card" style={[styles.authCard, { borderColor: theme.border }]}>
          {/* Mode Selector Tabs */}
          <View style={styles.modeTabs}>
            <Pressable
              onPress={() => {
                setIsLoginMode(true);
                setErrorMsg(null);
                setStep(1);
              }}
              style={[
                styles.modeTabBtn,
                isLoginMode && [styles.activeModeTab, { borderBottomColor: theme.primary }]
              ]}
            >
              <ThemedText
                type="smallBold"
                style={[styles.modeTabText, isLoginMode ? { color: theme.primary } : { color: theme.textSecondary }]}
              >
                {t.loginTab}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                setIsLoginMode(false);
                setErrorMsg(null);
                setStep(1);
              }}
              style={[
                styles.modeTabBtn,
                !isLoginMode && [styles.activeModeTab, { borderBottomColor: theme.primary }]
              ]}
            >
              <ThemedText
                type="smallBold"
                style={[styles.modeTabText, !isLoginMode ? { color: theme.primary } : { color: theme.textSecondary }]}
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

          {/* Form Content */}
          {isLoginMode ? (
            // LOGIN FORM
            <View style={styles.formFields}>
              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.inputLabel}>{t.phoneLabel}</ThemedText>
                <TextInput
                  style={[styles.inputField, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  placeholder={t.phonePlace}
                  placeholderTextColor={theme.textSecondary}
                  value={phone}
                  onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.inputLabel}>{t.pinLabel}</ThemedText>
                <TextInput
                  style={[styles.inputField, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  placeholder={t.pinPlace}
                  placeholderTextColor={theme.textSecondary}
                  value={pin}
                  onChangeText={(val) => setPin(val.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                />
              </View>

              <Pressable
                onPress={handleAuthSubmit}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: theme.primary },
                  pressed && { opacity: 0.9 },
                  isLoading && { opacity: 0.7 }
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.onPrimary} />
                ) : (
                  <ThemedText type="smallBold" style={[styles.submitBtnText, { color: theme.onPrimary }]}>{t.btnSubmitLogin}</ThemedText>
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
                    <ThemedText type="smallBold" style={styles.inputLabel}>{t.nameLabel}</ThemedText>
                    <TextInput
                      style={[styles.inputField, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                      placeholder={t.namePlace}
                      placeholderTextColor={theme.textSecondary}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={styles.inputLabel}>{t.phoneLabel}</ThemedText>
                    <TextInput
                      style={[styles.inputField, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                      placeholder={t.phonePlace}
                      placeholderTextColor={theme.textSecondary}
                      value={phone}
                      onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, ''))}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={styles.inputLabel}>{t.pinLabel}</ThemedText>
                    <TextInput
                      style={[styles.inputField, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                      placeholder={t.pinPlace}
                      placeholderTextColor={theme.textSecondary}
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
                      { backgroundColor: theme.primary },
                      pressed && { opacity: 0.9 }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.submitBtnText, { color: theme.onPrimary }]}>{t.btnNext}</ThemedText>
                  </Pressable>
                </View>
              ) : (
                // Step 2: Farm Profile Details
                <View style={{ gap: Spacing.two }}>
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={styles.inputLabel}>{t.stateLabel}</ThemedText>
                    <Pressable
                      onPress={() => openModal('state')}
                      style={[styles.selectorInputBtn, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    >
                      <ThemedText type="small" style={{ color: selectedState ? theme.text : theme.textSecondary }}>
                        {selectedState || t.selectPlace}
                      </ThemedText>
                    </Pressable>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={styles.inputLabel}>{t.soilLabel}</ThemedText>
                    <Pressable
                      onPress={() => openModal('soil')}
                      style={[styles.selectorInputBtn, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    >
                      <ThemedText type="small" style={{ color: selectedSoil ? theme.text : theme.textSecondary }}>
                        {selectedSoil || t.selectPlace}
                      </ThemedText>
                    </Pressable>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={styles.inputLabel}>{t.cropLabel}</ThemedText>
                    <Pressable
                      onPress={() => openModal('crop')}
                      style={[styles.selectorInputBtn, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    >
                      <ThemedText type="small" style={{ color: selectedCrop ? theme.text : theme.textSecondary }}>
                        {selectedCrop || t.selectPlace}
                      </ThemedText>
                    </Pressable>
                  </View>

                  <View style={styles.signupNavBtns}>
                    <Pressable
                      onPress={() => setStep(1)}
                      style={({ pressed }) => [
                        styles.backBtn,
                        { borderColor: theme.border },
                        pressed && { backgroundColor: theme.backgroundSelected }
                      ]}
                    >
                      <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>{t.btnBack}</ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={handleAuthSubmit}
                      disabled={isLoading}
                      style={({ pressed }) => [
                        styles.signupSubmitBtn,
                        { backgroundColor: theme.primary },
                        pressed && { opacity: 0.9 },
                        isLoading && { opacity: 0.7 }
                      ]}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color={theme.onPrimary} />
                      ) : (
                        <ThemedText type="smallBold" style={[styles.submitBtnText, { color: theme.onPrimary }]}>{t.btnSubmitSignup}</ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </ThemedView>

        {/* Demo Bypass / Skip for now Button */}
        <Pressable
          onPress={handleSkipLogin}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.skipBtn,
            pressed && { opacity: 0.8 }
          ]}
        >
          <ThemedText type="smallBold" style={[styles.skipBtnText, { color: theme.primary }]}>
            {t.btnSkip}
          </ThemedText>
        </Pressable>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  langToggleContainer: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: Spacing.two,
  },
  langToggleBtn: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.three,
    gap: Spacing.half,
  },
  brandLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.half,
  },
  brandIcon: {
    fontSize: 36,
  },
  brandName: {
    fontSize: 32,
    fontFamily: 'Pravah-Bold',
  },
  welcomeText: {
    fontSize: 22,
    marginTop: Spacing.half,
  },
  subText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
  authCard: {
    width: '100%',
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
  },
  modeTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    marginBottom: Spacing.three,
  },
  modeTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeModeTab: {
    borderBottomWidth: 2,
  },
  modeTabText: {
    fontSize: 16,
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
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    opacity: 0.9,
  },
  inputField: {
    height: 56,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 18,
  },
  selectorInputBtn: {
    height: 56,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  submitBtn: {
    height: 56,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 18,
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
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupSubmitBtn: {
    flex: 2,
    height: 56,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.one,
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
});
