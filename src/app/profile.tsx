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
    phoneLabel: 'Registered Mobile',
    farmSection: 'Farm Profile',
    stateLabel: 'State / Region',
    soilLabel: 'Soil Category',
    cropLabel: 'Primary Crop',
    prefSection: 'Preferences',
    langLabel: 'Language',
    themeLabel: 'Appearance',
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
  },
  hi: {
    title: 'सेटिंग्स',
    nameLabel: 'किसान का नाम',
    namePlaceholder: 'अपना नाम दर्ज करें',
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
  }
};

export default function ProfileScreen() {
  const { userName, userPhone, farmState, farmSoil, farmCrop, updateProfile, logout } = useAuth();
  const { themeMode, setThemeMode, theme, colorScheme } = useThemeContext();

  const [lang, setLang] = useState<'hi' | 'en'>('hi');
  const [editableName, setEditableName] = useState(userName);
  const [selectedState, setSelectedState] = useState(farmState);
  const [selectedSoil, setSelectedSoil] = useState(farmSoil);
  const [selectedCrop, setSelectedCrop] = useState(farmCrop);
  
  // Modal & feedback state
  const [activeModal, setActiveModal] = useState<'state' | 'soil' | 'crop' | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load language preference
  useEffect(() => {
    async function loadLang() {
      const savedLang = await LocalStorage.getItem('chat_lang');
      if (savedLang === 'en' || savedLang === 'hi') {
        setLang(savedLang);
      }
    }
    loadLang();
  }, []);

  // Update form inputs when context changes
  useEffect(() => {
    setEditableName(userName);
    setSelectedState(farmState);
    setSelectedSoil(farmSoil);
    setSelectedCrop(farmCrop);
  }, [userName, farmState, farmSoil, farmCrop]);

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
    await updateProfile(editableName.trim(), selectedState, selectedSoil, selectedCrop);
    setSuccessMsg(t.saveSuccess);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3000);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm(t.logoutConfirm);
      if (confirmLogout) {
        logout();
      }
    } else {
      Alert.alert(
        t.btnLogout,
        t.logoutConfirm,
        [
          { text: t.cancel, style: 'cancel' },
          { text: t.btnLogout, style: 'destructive', onPress: logout }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText type="smallBold" style={styles.headerTitle}>{t.title}</ThemedText>
      </View>

      <ScrollView 
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
              {userPhone || '+91 9999999999'}
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
            />
          </View>
        </ThemedView>

        {/* Card 2: Farm Details */}
        <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {t.farmSection}
        </ThemedText>
        
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border, paddingVertical: Spacing.two }]}>
          {/* State selector */}
          <Pressable 
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
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Soil selector */}
          <Pressable 
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
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Crop selector */}
          <Pressable 
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
          </Pressable>
        </ThemedView>

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
              <View>
                <ThemedText type="smallBold" style={styles.prefLabel}>{t.langLabel}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>Select language</ThemedText>
              </View>
            </View>
            <View style={[styles.toggleContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Pressable
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
              </Pressable>
              <Pressable
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
              </Pressable>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border, marginVertical: Spacing.one }]} />

          {/* Theme Mode Toggle */}
          <View style={styles.preferenceRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.rowIconContainer, { backgroundColor: theme.primary + '10' }]}>
                <SymbolView name={{ ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' } as any} size={16} tintColor={theme.primary} />
              </View>
              <View>
                <ThemedText type="smallBold" style={styles.prefLabel}>{t.themeLabel}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>App styling</ThemedText>
              </View>
            </View>
            <View style={[styles.toggleContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Pressable
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
              </Pressable>
              <Pressable
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
              </Pressable>
              <Pressable
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
              </Pressable>
            </View>
          </View>
        </ThemedView>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
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
          </Pressable>

          <Pressable
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
          </Pressable>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    marginLeft: 50, // aligns perfectly past the icon container
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
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
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {},
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
