import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
  Modal,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { useThemeContext, ThemeMode } from '@/context/theme-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { Spacing } from '@/constants/theme';
import { LocalStorage } from '@/utils/storage';
import { SelectionModal } from '@/components/selection-modal';
import { PressableScale } from '@/components/pressable-scale';
import cropsData from '@/constants/crops.json';

const STATES = [
  'Uttar Pradesh', 'Punjab', 'Haryana', 'Madhya Pradesh', 
  'Maharashtra', 'Rajasthan', 'Gujarat', 'Bihar', 'Karnataka', 'Andhra Pradesh'
];
const SOILS = [
  'Alluvial Soil (जलोढ़)', 'Black Soil (काली मिट्टी)', 'Red Soil (लाल मिट्टी)', 
  'Sandy Soil (बलुई मिट्टी)', 'Clayey Soil (चिकनी मिट्टी)', 'Loamy Soil (दोमट)'
];
const CROPS = cropsData.map(c => c.name);

const TRANSLATIONS = {
  en: {
    title: 'Settings',
    nameLabel: 'Farmer Name',
    namePlaceholder: 'Enter your name',
    emailLabel: 'Email Address',
    emailPlaceholder: 'e.g. farmer@gmail.com',
    phoneLabel: 'Registered Mobile',
    farmSection: 'Farm Profile',
    stateLabel: 'State / Region',
    soilLabel: 'Soil Category',
    cropLabel: 'Primary Crop',
    prefSection: 'Preferences',
    langLabel: 'Language',
    themeLabel: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    btnSave: 'Save Profile',
    btnLogout: 'Sign Out',
    saveSuccess: 'Settings saved successfully!',
    saveError: 'Please enter a valid name',
    logoutConfirm: 'Are you sure you want to sign out?',
    cancel: 'Cancel',
    badgeText: 'Verified Kisan',
    guestBadgeText: 'Guest Mode',
    guestBannerTitle: 'Exploring as Guest',
    guestBannerSub: 'Sign in to save your farm profile and chat history',
    btnLoginNow: 'Login / Register Account',
    btnExitGuest: 'Exit Guest Mode',
    notifSection: 'Kisan Alerts & Notifications',
    weatherNotif: 'Daily Weather Broadcast Alerts',
    weatherNotifSub: 'Get rain & temperature advisories',
    mandiNotif: 'Mandi Price Updates',
    mandiNotifSub: 'Daily crop rates & market trends',
    pestNotif: 'Pest & Crop Disease Warnings',
    pestNotifSub: 'AI risk alerts for active crops',
    aiSection: 'AI Agronomist Preferences',
    voiceResp: 'Auto Voice Audio Advice',
    voiceRespSub: 'AI reads answers aloud in Hindi/English',
    dataSection: 'Data & Storage',
    clearCache: 'Clear App Cache & Data',
    clearCacheSub: 'Free up local offline crop diagnostics',
    cacheCleared: 'App cache cleared successfully!',
    aboutSection: 'Support & Kisan Helpline',
    helpline: 'Kisan Call Center (Toll Free)',
    helplineSub: '1800-180-1551 (Government Helpline)',
    appVersion: 'Krishik Mitra App Version',
    appVersionVal: 'v2.4.0 Pro Edition',
  },
  hi: {
    title: 'सेटिंग्स',
    nameLabel: 'किसान का नाम',
    namePlaceholder: 'अपना नाम दर्ज करें',
    emailLabel: 'ईमेल पता (Email)',
    emailPlaceholder: 'जैसे: farmer@gmail.com',
    phoneLabel: 'पंजीकृत मोबाइल',
    farmSection: 'खेत का विवरण',
    stateLabel: 'राज्य / क्षेत्र',
    soilLabel: 'मिट्टी का प्रकार',
    cropLabel: 'मुख्य फ़सल',
    prefSection: 'प्राथमिकताएं',
    langLabel: 'भाषा',
    themeLabel: 'थीम',
    themeLight: 'लाइट',
    themeDark: 'डार्क',
    themeSystem: 'सिस्टम',
    btnSave: 'विवरण सुरक्षित करें',
    btnLogout: 'लॉग आउट',
    saveSuccess: 'सेटिंग्स सफलतापूर्वक सुरक्षित की गईं!',
    saveError: 'कृपया एक मान्य नाम दर्ज करें',
    logoutConfirm: 'क्या आप वाकई लॉग आउट करना चाहते हैं?',
    cancel: 'रद्द करें',
    badgeText: 'सत्यापित किसान',
    guestBadgeText: 'गेस्ट मोड',
    guestBannerTitle: 'गेस्ट मोड में जुड़े हैं',
    guestBannerSub: 'अपना डेटा, खेत विवरण और चैट इतिहास सेव करने के लिए लॉगिन करें',
    btnLoginNow: 'लॉगिन या नया खाता बनाएं',
    btnExitGuest: 'गेस्ट मोड से बाहर निकलें',
    notifSection: 'किसान अलर्ट एवं सूचनाएं',
    weatherNotif: 'दैनिक मौसम पूर्वानुमान अलर्ट',
    weatherNotifSub: 'बारिश एवं तापमान की पूर्व चेतावनी',
    mandiNotif: 'मंडी भाव दैनिक अपडेट',
    mandiNotifSub: 'बाज़ार दरें और मूल्य रुझान',
    pestNotif: 'कीट एवं रोग जोखिम चेतावनी',
    pestNotifSub: 'फसल सुरक्षा के लिए AI जोखिम अलर्ट',
    aiSection: 'AI कृषि सलाहकार सेटिंग्स',
    voiceResp: 'AI उत्तर बोलकर सुनाएं (Voice)',
    voiceRespSub: 'AI जवाब हिंदी/अंग्रेजी में बोलकर सुनाएगा',
    dataSection: 'डेटा एवं स्टोरेज',
    clearCache: 'कैश डेटा साफ़ करें',
    clearCacheSub: 'स्थानीय डेटा साफ़ करें (12.4 MB)',
    cacheCleared: 'कैश डेटा सफलतापूर्वक साफ़ किया गया!',
    aboutSection: 'सहायता एवं किसान हेल्पलाइन',
    helpline: 'किसान कॉल सेंटर (टोल-फ्री)',
    helplineSub: '1800-180-1551 (सरकारी हेल्पलाइन)',
    appVersion: 'कृषिक मित्र ऐप वर्शन',
    appVersionVal: 'v2.4.0 प्रो संस्करण',
  }
};

export default function ProfileScreen() {
  const { userName, userPhone, userEmail, farmState, farmSoil, farmCrop, updateProfile, logout } = useAuth();
  const { themeMode, setThemeMode, theme, colorScheme } = useThemeContext();

  const isGuest = userPhone === '9999999999' || userName === 'Kisan Guest';

  const [lang, setLang] = useState<'hi' | 'en'>('en');
  const [editableName, setEditableName] = useState(userName);
  const [editableEmail, setEditableEmail] = useState(userEmail);
  const [selectedState, setSelectedState] = useState(farmState);
  const [selectedSoil, setSelectedSoil] = useState(farmSoil);
  const [selectedCrop, setSelectedCrop] = useState(farmCrop);
  
  // Modal & feedback state
  const [activeModal, setActiveModal] = useState<'state' | 'soil' | 'crop' | 'logout' | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Additional settings states
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [mandiAlerts, setMandiAlerts] = useState(true);
  const [pestAlerts, setPestAlerts] = useState(true);
  const [voiceResponse, setVoiceResponse] = useState(true);

  // Load language and preferences
  useEffect(() => {
    async function loadPreferences() {
      const savedLang = await LocalStorage.getItem('chat_lang');
      if (savedLang === 'en' || savedLang === 'hi') {
        setLang(savedLang);
      }
      const w = await LocalStorage.getItem('pref_weather_alerts');
      const m = await LocalStorage.getItem('pref_mandi_alerts');
      const p = await LocalStorage.getItem('pref_pest_alerts');
      const v = await LocalStorage.getItem('pref_voice_response');
      if (w !== null) setWeatherAlerts(w === 'true');
      if (m !== null) setMandiAlerts(m === 'true');
      if (p !== null) setPestAlerts(p === 'true');
      if (v !== null) setVoiceResponse(v === 'true');
    }
    loadPreferences();
  }, []);

  // Preference toggle handlers
  const toggleWeather = async (val: boolean) => {
    setWeatherAlerts(val);
    await LocalStorage.setItem('pref_weather_alerts', String(val));
  };

  const toggleMandi = async (val: boolean) => {
    setMandiAlerts(val);
    await LocalStorage.setItem('pref_mandi_alerts', String(val));
  };

  const togglePest = async (val: boolean) => {
    setPestAlerts(val);
    await LocalStorage.setItem('pref_pest_alerts', String(val));
  };

  const toggleVoice = async (val: boolean) => {
    setVoiceResponse(val);
    await LocalStorage.setItem('pref_voice_response', String(val));
  };

  const handleClearCache = async () => {
    setSuccessMsg(t.cacheCleared);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCallHelpline = () => {
    Linking.openURL('tel:18001801551').catch(() => {
      Alert.alert('Kisan Helpline', 'Toll Free Number: 1800-180-1551');
    });
  };

  // Update form inputs when context changes
  useEffect(() => {
    setEditableName(userName);
    setEditableEmail(userEmail || (userPhone ? `${userPhone}@gmail.com` : ''));
    setSelectedState(farmState);
    setSelectedSoil(farmSoil);
    setSelectedCrop(farmCrop);
  }, [userName, userEmail, userPhone, farmState, farmSoil, farmCrop]);

  const t = TRANSLATIONS[lang];

  const handleLanguageChange = async (newLang: 'en' | 'hi') => {
    setLang(newLang);
    await LocalStorage.setItem('chat_lang', newLang);
  };

  const handleSave = async () => {
    if (!editableName.trim()) {
      Alert.alert('Error', t.saveError);
      return;
    }
    await updateProfile(
      editableName.trim(),
      editableEmail.trim(),
      selectedState,
      selectedSoil,
      selectedCrop,
      lang,
      themeMode
    );
    setSuccessMsg(t.saveSuccess);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3000);
  };

  const handleLogout = () => {
    setActiveModal('logout');
  };

  const handleGoToLogin = async () => {
    await logout();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText type="smallBold" style={styles.headerTitle}>{t.title}</ThemedText>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {successMsg && (
          <View style={[styles.successBanner, { backgroundColor: theme.primary + '12', borderColor: theme.primary }]}>
            <SymbolView 
              name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check' } as any}
              size={18}
              tintColor={theme.primary}
            />
            <ThemedText type="smallBold" style={{ color: theme.primary, marginLeft: Spacing.two }}>
              {successMsg}
            </ThemedText>
          </View>
        )}

        {isGuest ? (
          /* Clean Guest Login Card (No fake phone/profile data) */
          <ThemedView type="card" style={[styles.guestPromptCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.guestAvatarBg, { backgroundColor: theme.primary + '18' }]}>
              <SymbolView
                name={{ ios: 'person.crop.circle.badge.plus', android: 'account_circle', web: 'account_circle' } as any}
                size={48}
                tintColor={theme.primary}
              />
            </View>

            <ThemedText type="title" style={{ fontSize: 22, textAlign: 'center', marginTop: 12 }}>
              {lang === 'hi' ? 'गेस्ट अकाउंट' : 'Guest Account'}
            </ThemedText>

            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 12 }}>
              {lang === 'hi'
                ? 'आप अभी बिना लॉगिन किए ऐप का उपयोग कर रहे हैं। अपना फ़ार्म प्रोफाइल, चैट इतिहास और चौपाल गतिविधियों को सुरक्षित रखने के लिए लॉगिन करें।'
                : 'You are currently exploring as a guest. Sign in or create an account to save your farm profile, sync chat history, and access farmer communities.'}
            </ThemedText>

            <PressableScale
              onPress={handleGoToLogin}
              style={({ pressed }) => [
                styles.guestLoginMainBtn,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.9 }
              ]}
            >
              <SymbolView
                name={{ ios: 'arrow.right.circle.fill', android: 'login', web: 'login' } as any}
                size={18}
                tintColor={theme.onPrimary}
              />
              <ThemedText
                type="smallBold"
                numberOfLines={1}
                style={{ color: theme.onPrimary, fontSize: 14, fontWeight: '700' }}
              >
                {lang === 'hi' ? 'लॉगिन / नया खाता बनाएं' : 'Login / Register'}
              </ThemedText>
            </PressableScale>
          </ThemedView>
        ) : (
          /* Normal Registered User Profile View */
          <>
            {/* Hero Profile Section */}
            <View style={styles.heroSection}>
              <View style={[styles.avatarOutline, { borderColor: theme.primary + '30' }]}>
                <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                  <ThemedText style={[styles.avatarInitial, { color: theme.onPrimary }]}>
                    {editableName ? editableName.charAt(0).toUpperCase() : 'K'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="title" style={styles.heroName}>
                {editableName || 'Kisan Mitra'}
              </ThemedText>
              <View style={styles.heroDetailsRow}>
                <SymbolView 
                  name={{ ios: 'phone.fill', android: 'phone', web: 'phone' } as any} 
                  size={12} 
                  tintColor={theme.textSecondary} 
                />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {userPhone}
                </ThemedText>
              </View>
              <View style={[styles.verifiedBadge, { backgroundColor: theme.primary + '18' }]}>
                <SymbolView 
                  name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' } as any} 
                  size={12} 
                  tintColor={theme.primary} 
                />
                <ThemedText type="code" style={{ color: theme.primary, fontWeight: '700' }}>
                  {t.badgeText}
                </ThemedText>
              </View>
            </View>

            {/* Card 1: Personal Details */}
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardHeaderIconContainer, { backgroundColor: theme.primary + '10' }]}>
                  <SymbolView name={{ ios: 'person.fill', android: 'person', web: 'person' } as any} size={14} tintColor={theme.primary} />
                </View>
                <ThemedText type="smallBold" style={styles.cardSectionTitle}>{t.nameLabel}</ThemedText>
              </View>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  value={editableName}
                  onChangeText={setEditableName}
                  placeholder={t.namePlaceholder}
                  placeholderTextColor={theme.textSecondary}
                  maxLength={30}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              <View style={[styles.cardHeaderRow, { marginTop: Spacing.three }]}>
                <View style={[styles.cardHeaderIconContainer, { backgroundColor: theme.primary + '10' }]}>
                  <SymbolView name={{ ios: 'envelope.fill', android: 'email', web: 'email' } as any} size={14} tintColor={theme.primary} />
                </View>
                <ThemedText type="smallBold" style={styles.cardSectionTitle}>{t.emailLabel}</ThemedText>
              </View>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  value={editableEmail}
                  onChangeText={setEditableEmail}
                  placeholder={t.emailPlaceholder}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>
            </ThemedView>

            {/* Card 2: Farm Details */}
            <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {t.farmSection}
            </ThemedText>
            
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border, paddingVertical: Spacing.two }]}>
              {/* State selector */}
              <PressableScale 
                onPress={() => setActiveModal('state')}
                style={({ pressed }) => [styles.selectorRow, pressed && { backgroundColor: theme.backgroundSelected }]}
              >
                <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
                  <SymbolView name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' } as any} size={16} tintColor={theme.primary} />
                </View>
                <View style={styles.rowTextContainer}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>{t.stateLabel}</ThemedText>
                  <ThemedText type="smallBold" style={styles.selectorValue}>{selectedState}</ThemedText>
                </View>
                <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any} size={14} tintColor={theme.textSecondary} />
              </PressableScale>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Soil selector */}
              <PressableScale 
                onPress={() => setActiveModal('soil')}
                style={({ pressed }) => [styles.selectorRow, pressed && { backgroundColor: theme.backgroundSelected }]}
              >
                <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
                  <SymbolView name={{ ios: 'drop.fill', android: 'opacity', web: 'opacity' } as any} size={16} tintColor={theme.primary} />
                </View>
                <View style={styles.rowTextContainer}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>{t.soilLabel}</ThemedText>
                  <ThemedText type="smallBold" style={styles.selectorValue}>{selectedSoil}</ThemedText>
                </View>
                <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any} size={14} tintColor={theme.textSecondary} />
              </PressableScale>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Crop selector */}
              <PressableScale 
                onPress={() => setActiveModal('crop')}
                style={({ pressed }) => [styles.selectorRow, pressed && { backgroundColor: theme.backgroundSelected }]}
              >
                <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
                  <SymbolView name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any} size={16} tintColor={theme.primary} />
                </View>
                <View style={styles.rowTextContainer}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>{t.cropLabel}</ThemedText>
                  <ThemedText type="smallBold" style={styles.selectorValue}>{selectedCrop}</ThemedText>
                </View>
                <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any} size={14} tintColor={theme.textSecondary} />
              </PressableScale>
            </ThemedView>
          </>
        )}

        {/* Card 3: App Preferences */}
        <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t.prefSection}
        </ThemedText>

        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          {/* Language Toggle */}
          <View style={styles.preferenceRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <SymbolView name={{ ios: 'globe', android: 'language', web: 'language' } as any} size={16} tintColor={theme.primary} />
              </View>
              <View style={styles.prefTextContainer}>
                <ThemedText type="smallBold" style={styles.prefLabel}>{t.langLabel}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>Select language</ThemedText>
              </View>
            </View>
            <View style={[styles.toggleContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <PressableScale
                onPress={() => handleLanguageChange('en')}
                style={[
                  styles.toggleButton,
                  lang === 'en' && { backgroundColor: theme.primary }
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.toggleButtonText,
                    lang === 'en' ? { color: theme.onPrimary } : { color: theme.textSecondary }
                  ]}
                >
                  English
                </ThemedText>
              </PressableScale>
              <PressableScale
                onPress={() => handleLanguageChange('hi')}
                style={[
                  styles.toggleButton,
                  lang === 'hi' && { backgroundColor: theme.primary }
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.toggleButtonText,
                    lang === 'hi' ? { color: theme.onPrimary } : { color: theme.textSecondary }
                  ]}
                >
                  हिंदी
                </ThemedText>
              </PressableScale>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: Spacing.one }]} />

          {/* Theme Mode Toggle */}
          <View style={styles.preferenceRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <SymbolView name={{ ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' } as any} size={16} tintColor={theme.primary} />
              </View>
              <View style={styles.prefTextContainer}>
                <ThemedText type="smallBold" style={styles.prefLabel}>{t.themeLabel}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>App styling</ThemedText>
              </View>
            </View>
            <View style={[styles.toggleContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <PressableScale
                onPress={() => setThemeMode('light')}
                style={[
                  styles.toggleButton,
                  themeMode === 'light' && { backgroundColor: theme.primary }
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.toggleButtonText,
                    themeMode === 'light' ? { color: theme.onPrimary } : { color: theme.textSecondary }
                  ]}
                >
                  {t.themeLight}
                </ThemedText>
              </PressableScale>
              <PressableScale
                onPress={() => setThemeMode('dark')}
                style={[
                  styles.toggleButton,
                  themeMode === 'dark' && { backgroundColor: theme.primary }
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.toggleButtonText,
                    themeMode === 'dark' ? { color: theme.onPrimary } : { color: theme.textSecondary }
                  ]}
                >
                  {t.themeDark}
                </ThemedText>
              </PressableScale>
              <PressableScale
                onPress={() => setThemeMode('system')}
                style={[
                  styles.toggleButton,
                  themeMode === 'system' && { backgroundColor: theme.primary }
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.toggleButtonText,
                    themeMode === 'system' ? { color: theme.onPrimary } : { color: theme.textSecondary }
                  ]}
                >
                  {t.themeSystem}
                </ThemedText>
              </PressableScale>
            </View>
          </View>
        </ThemedView>

        {/* Card 4: Kisan Alerts & Notifications */}
        <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t.notifSection}
        </ThemedText>

        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          {/* Weather Alert Toggle */}
          <View style={styles.preferenceRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <SymbolView name={{ ios: 'cloud.sun.fill', android: 'wb_sunny', web: 'wb_sunny' } as any} size={16} tintColor={theme.primary} />
              </View>
              <View style={styles.prefTextContainer}>
                <ThemedText type="smallBold" style={styles.prefLabel}>{t.weatherNotif}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>{t.weatherNotifSub}</ThemedText>
              </View>
            </View>
            <Switch
              value={weatherAlerts}
              onValueChange={toggleWeather}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={weatherAlerts ? theme.primary : '#F4F4F4'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: Spacing.one }]} />

          {/* Mandi Price Updates Toggle */}
          <View style={styles.preferenceRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <SymbolView name={{ ios: 'chart.bar.fill', android: 'trending_up', web: 'trending_up' } as any} size={16} tintColor={theme.primary} />
              </View>
              <View style={styles.prefTextContainer}>
                <ThemedText type="smallBold" style={styles.prefLabel}>{t.mandiNotif}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>{t.mandiNotifSub}</ThemedText>
              </View>
            </View>
            <Switch
              value={mandiAlerts}
              onValueChange={toggleMandi}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={mandiAlerts ? theme.primary : '#F4F4F4'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: Spacing.one }]} />

          {/* Pest & Advisory Warnings Toggle */}
          <View style={styles.preferenceRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <SymbolView name={{ ios: 'exclamationmark.shield.fill', android: 'bug_report', web: 'bug_report' } as any} size={16} tintColor={theme.primary} />
              </View>
              <View style={styles.prefTextContainer}>
                <ThemedText type="smallBold" style={styles.prefLabel}>{t.pestNotif}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>{t.pestNotifSub}</ThemedText>
              </View>
            </View>
            <Switch
              value={pestAlerts}
              onValueChange={togglePest}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={pestAlerts ? theme.primary : '#F4F4F4'}
            />
          </View>
        </ThemedView>

        {/* Card 5: AI Agronomist Settings */}
        <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t.aiSection}
        </ThemedText>

        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.preferenceRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <SymbolView name={{ ios: 'waveform', android: 'record_voice_over', web: 'record_voice_over' } as any} size={16} tintColor={theme.primary} />
              </View>
              <View style={styles.prefTextContainer}>
                <ThemedText type="smallBold" style={styles.prefLabel}>{t.voiceResp}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>{t.voiceRespSub}</ThemedText>
              </View>
            </View>
            <Switch
              value={voiceResponse}
              onValueChange={toggleVoice}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={voiceResponse ? theme.primary : '#F4F4F4'}
            />
          </View>
        </ThemedView>

        {/* Card 6: Storage & Support */}
        <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t.dataSection}
        </ThemedText>

        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          {/* Clear Cache */}
          <PressableScale
            onPress={handleClearCache}
            style={({ pressed }) => [styles.selectorRow, pressed && { backgroundColor: theme.backgroundSelected }]}
          >
            <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
              <SymbolView name={{ ios: 'trash.fill', android: 'delete_sweep', web: 'delete_sweep' } as any} size={16} tintColor={theme.primary} />
            </View>
            <View style={styles.rowTextContainer}>
              <ThemedText type="smallBold" style={styles.prefLabel}>{t.clearCache}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>{t.clearCacheSub}</ThemedText>
            </View>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any} size={14} tintColor={theme.textSecondary} />
          </PressableScale>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Kisan Call Center Helpline */}
          <PressableScale
            onPress={handleCallHelpline}
            style={({ pressed }) => [styles.selectorRow, pressed && { backgroundColor: theme.backgroundSelected }]}
          >
            <View style={[styles.rowIconContainer, { backgroundColor: '#16A34A15' }]}>
              <SymbolView name={{ ios: 'phone.badge.checkmark', android: 'support_agent', web: 'support_agent' } as any} size={16} tintColor="#16A34A" />
            </View>
            <View style={styles.rowTextContainer}>
              <ThemedText type="smallBold" style={styles.prefLabel}>{t.helpline}</ThemedText>
              <ThemedText type="small" style={{ color: '#16A34A', fontSize: 10, fontWeight: '600' }}>{t.helplineSub}</ThemedText>
            </View>
            <SymbolView name={{ ios: 'phone.fill', android: 'call', web: 'call' } as any} size={14} tintColor="#16A34A" />
          </PressableScale>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* App Version Info */}
          <View style={styles.selectorRow}>
            <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
              <SymbolView name={{ ios: 'info.circle.fill', android: 'info', web: 'info' } as any} size={16} tintColor={theme.primary} />
            </View>
            <View style={styles.rowTextContainer}>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>{t.appVersion}</ThemedText>
              <ThemedText type="smallBold" style={styles.prefLabel}>{t.appVersionVal}</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {isGuest ? (
            <PressableScale
              onPress={handleGoToLogin}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.9 }
              ]}
            >
              <SymbolView
                name={{ ios: 'arrow.right.circle.fill', android: 'login', web: 'login' } as any}
                size={18}
                tintColor={theme.onPrimary}
              />
              <ThemedText
                type="smallBold"
                numberOfLines={1}
                style={[styles.saveButtonText, { color: theme.onPrimary, fontSize: 14 }]}
              >
                {lang === 'hi' ? 'लॉगिन / नया खाता बनाएं' : 'Login / Register'}
              </ThemedText>
            </PressableScale>
          ) : (
            <>
              <PressableScale
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: theme.primary },
                  pressed && { opacity: 0.9 }
                ]}
              >
                <ThemedText style={[styles.saveButtonText, { color: theme.onPrimary }]}>
                  {t.btnSave}
                </ThemedText>
              </PressableScale>

              <PressableScale
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.logoutButton,
                  { borderColor: theme.border },
                  pressed && { backgroundColor: theme.backgroundSelected }
                ]}
              >
                <SymbolView 
                  name={{ ios: 'arrow.left.square.fill', android: 'logout', web: 'logout' } as any} 
                  size={16} 
                  tintColor={theme.error} 
                />
                <ThemedText style={[styles.logoutButtonText, { color: theme.error }]}>
                  {t.btnLogout}
                </ThemedText>
              </PressableScale>
            </>
          )}
        </View>
      </ScrollView>

      {/* Selection Modals */}
      <SelectionModal
        visible={activeModal === 'state'}
        title={t.stateLabel}
        placeholder="Search State"
        list={STATES}
        selectedValue={selectedState}
        onSelect={(value) => {
          setSelectedState(value);
          setActiveModal(null);
        }}
        onClose={() => setActiveModal(null)}
      />

      <SelectionModal
        visible={activeModal === 'soil'}
        title={t.soilLabel}
        placeholder="Search Soil"
        list={SOILS}
        selectedValue={selectedSoil}
        onSelect={(value) => {
          setSelectedSoil(value);
          setActiveModal(null);
        }}
        onClose={() => setActiveModal(null)}
      />

      <SelectionModal
        visible={activeModal === 'crop'}
        title={t.cropLabel}
        placeholder="Search Crop"
        list={CROPS}
        selectedValue={selectedCrop}
        onSelect={(value) => {
          setSelectedCrop(value);
          setActiveModal(null);
        }}
        onClose={() => setActiveModal(null)}
      />

      {/* Logout Confirmation Modal */}
      <Modal
        visible={activeModal === 'logout'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: theme.card,
              borderRadius: 24,
              padding: 24,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 10,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <SymbolView
                name={{ ios: 'arrow.left.square.fill', android: 'logout', web: 'logout' } as any}
                size={26}
                tintColor={theme.error}
              />
            </View>

            <ThemedText style={{ fontSize: 20, fontWeight: '700', marginBottom: 8, color: theme.text }}>
              {t.btnLogout}
            </ThemedText>

            <ThemedText style={{ fontSize: 14, textAlign: 'center', color: theme.textSecondary, marginBottom: 24, lineHeight: 20 }}>
              {t.logoutConfirm}
            </ThemedText>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: 'center',
                  backgroundColor: theme.background,
                }}
                onPress={() => setActiveModal(null)}
              >
                <ThemedText style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
                  {t.cancel}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: theme.error,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setActiveModal(null);
                  logout();
                }}
              >
                <ThemedText style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                  {t.btnLogout}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.one,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    gap: 8,
  },
  guestPromptCard: {
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: Spacing.two,
  },
  guestAvatarBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestLoginMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    marginTop: Spacing.four,
  },
  avatarOutline: {
    borderWidth: 1.5,
    padding: 6,
    borderRadius: 50,
    borderStyle: 'dashed',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 3,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  heroDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    width: '100%',
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  cardHeaderIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    width: '100%',
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {},
    }),
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: Spacing.two,
    marginLeft: Spacing.one,
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
  },
  rowIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  rowTextContainer: {
    flex: 1,
    gap: 2,
  },
  selectorValue: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    width: '100%',
    gap: Spacing.two,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingRight: Spacing.two,
    overflow: 'hidden',
  },
  prefTextContainer: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    overflow: 'hidden',
    flexShrink: 0,
  },
  toggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {},
    }),
  },
  toggleButtonText: {
    fontSize: 11,
  },
  buttonContainer: {
    marginTop: Spacing.four,
    gap: Spacing.three,
  },
  saveButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        outlineStyle: 'none',
      } as any,
      default: {
        elevation: 2,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoutButton: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {},
    }),
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
