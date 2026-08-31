import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  View,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { Colors, Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/auth-context';
import { LocalStorage } from '@/utils/storage';
import { fetchWeatherData, getWeatherCondition, generateWeatherAdvisory, type RawWeatherData } from '@/services/weather-service';
import { fetchLiveMandiPrices, type MandiItem } from '@/services/mandi-service';

import cropsData from '@/constants/crops.json';
import { SelectionModal } from '@/components/selection-modal';

// Constants for Profile
const STATES = [
  'Uttar Pradesh', 'Punjab', 'Haryana', 'Madhya Pradesh', 
  'Maharashtra', 'Rajasthan', 'Gujarat', 'Bihar', 'Karnataka', 'Andhra Pradesh'
];
const SOILS = [
  'Alluvial Soil (जलोढ़)', 'Black Soil (काली मिट्टी)', 'Red Soil (लाल मिट्टी)', 
  'Sandy Soil (बलुई मिट्टी)', 'Clayey Soil (चिकनी मिट्टी)', 'Loamy Soil (दोमट)'
];
const CROPS = cropsData.map(c => c.name);

// Initial Mandi Prices (Mock)
const INITIAL_MANDI_PRICES = [
  { id: '1', commodity: 'Wheat (गेहूं)', price: 2275, unit: 'Quintal', state: 'Punjab Mandi', change: '+₹15' },
  { id: '2', commodity: 'Paddy (धान)', price: 2183, unit: 'Quintal', state: 'Haryana Mandi', change: '-₹8' },
  { id: '3', commodity: 'Mustard (सरसों)', price: 5450, unit: 'Quintal', state: 'Rajasthan Mandi', change: '+₹120' },
  { id: '4', commodity: 'Cotton (कपास)', price: 7200, unit: 'Quintal', state: 'Maharashtra Mandi', change: '+₹45' },
  { id: '5', commodity: 'Sugarcane (गन्ना)', price: 350, unit: 'Quintal', state: 'UP Mandi', change: '0' },
  { id: '6', commodity: 'Potato (आलू)', price: 1250, unit: 'Quintal', state: 'West Bengal Mandi', change: '-₹35' },
];

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { farmState, farmSoil, farmCrop, updateProfile, logout, userName } = useAuth();

  // Language state
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');

  // Weather state
  const [weatherData, setWeatherData] = useState<RawWeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Fetch weather when farmState changes
  useEffect(() => {
    let isMounted = true;
    async function loadWeather() {
      if (!farmState) return;
      setIsLoadingWeather(true);
      setWeatherError(null);
      try {
        const data = await fetchWeatherData(farmState);
        if (isMounted) {
          setWeatherData(data);
        }
      } catch (err) {
        console.error('Error fetching weather:', err);
        if (isMounted) {
          setWeatherError('Failed to load weather');
        }
      } finally {
        if (isMounted) {
          setIsLoadingWeather(false);
        }
      }
    }
    loadWeather();
    return () => {
      isMounted = false;
    };
  }, [farmState]);

  // Load language preference
  useEffect(() => {
    async function loadLanguage() {
      const savedLang = await LocalStorage.getItem('chat_lang');
      if (savedLang === 'hi' || savedLang === 'en') {
        setLanguage(savedLang);
      }
    }
    loadLanguage();
  }, []);

  const toggleLanguage = async () => {
    const nextLang = language === 'hi' ? 'en' : 'hi';
    setLanguage(nextLang);
    await LocalStorage.setItem('chat_lang', nextLang);
  };

  const formatLabel = (text: string) => {
    if (!text) return '';
    const parts = text.split('(');
    if (parts.length < 2) return text;
    const english = parts[0].trim();
    const hindi = parts[1].replace(')', '').trim();
    return language === 'hi' ? hindi : english;
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

  // Modal selector controls
  const [activeModal, setActiveModal] = useState<'state' | 'soil' | 'crop' | null>(null);

  const openModal = (type: 'state' | 'soil' | 'crop') => {
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // Mandi prices state
  const [mandiPrices, setMandiPrices] = useState<MandiItem[]>(INITIAL_MANDI_PRICES);
  const [mandiSearch, setMandiSearch] = useState('');
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [isLoadingMandi, setIsLoadingMandi] = useState(true);
  const [mandiError, setMandiError] = useState<string | null>(null);

  // Fetch live Mandi prices when farmState changes
  useEffect(() => {
    let isMounted = true;
    async function loadMandi() {
      if (!farmState) return;
      setIsLoadingMandi(true);
      setMandiError(null);
      try {
        const data = await fetchLiveMandiPrices(farmState);
        if (isMounted) {
          setMandiPrices(data.length > 0 ? data : INITIAL_MANDI_PRICES);
        }
      } catch (err) {
        console.error('Error fetching live mandi prices:', err);
        if (isMounted) {
          // Fall back to mock prices so the screen is never blank
          setMandiPrices(INITIAL_MANDI_PRICES);
          setMandiError('Failed to fetch live prices');
        }
      } finally {
        if (isMounted) {
          setIsLoadingMandi(false);
        }
      }
    }
    loadMandi();
    return () => {
      isMounted = false;
    };
  }, [farmState]);

  // Save changes to storage
  const saveProfileValue = async (key: 'state' | 'soil' | 'crop', value: string) => {
    let nextState = farmState;
    let nextSoil = farmSoil;
    let nextCrop = farmCrop;

    if (key === 'state') {
      nextState = value;
    } else if (key === 'soil') {
      nextSoil = value;
    } else if (key === 'crop') {
      nextCrop = value;
    }

    await updateProfile(userName, nextState, nextSoil, nextCrop);
    closeModal();
  };


  // Refresh Mandi prices
  const refreshMandiPrices = async () => {
    if (!farmState) return;
    setIsRefreshingPrices(true);
    setMandiError(null);
    try {
      const data = await fetchLiveMandiPrices(farmState);
      setMandiPrices(data.length > 0 ? data : INITIAL_MANDI_PRICES);
    } catch (err) {
      console.error('Error refreshing Mandi prices:', err);
      // Keep existing prices or load initial ones
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  // Filter prices
  const filteredMandiPrices = mandiPrices.filter(item =>
    item.commodity.toLowerCase().includes(mandiSearch.toLowerCase()) ||
    item.state.toLowerCase().includes(mandiSearch.toLowerCase())
  );

  // Quick advice trigger
  const handleQuickAdvice = (topic: string, question: string) => {
    router.push({
      pathname: '/chat',
      params: { prefill: question }
    });
  };



  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoIcon, { backgroundColor: theme.primary, borderColor: theme.border }]}>
                <SymbolView
                  name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                  size={22}
                  tintColor={theme.onPrimary}
                />
              </View>
              <View>
                <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 16 }}>
                  {language === 'hi' ? 'नमस्ते' : 'Welcome'}, {userName}
                </ThemedText>
                <ThemedText type="small" style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '600' }}>
                  Krishi Mitra AI
                </ThemedText>
              </View>
            </View>
            <Pressable
              onPress={toggleLanguage}
              style={({ pressed }) => [
                styles.langToggle,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                pressed && { opacity: 0.8 }
              ]}
            >
              <SymbolView
                name={{ ios: 'globe', android: 'language', web: 'language' } as any}
                size={14}
                tintColor={theme.primary}
              />
              <ThemedText style={{ color: theme.text, fontSize: 11, fontWeight: '700' }}>
                {language === 'hi' ? 'Hindi' : 'English'}
              </ThemedText>
            </Pressable>
          </View>

          {/* Weather Widget */}
          <ThemedView type="backgroundElement" style={styles.weatherCard}>
            {isLoadingWeather ? (
              <View style={[styles.weatherCenter, { height: 110 }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.two }}>
                  {language === 'hi' ? 'मौसम लोड हो रहा है...' : 'Loading weather forecast...'}
                </ThemedText>
              </View>
            ) : weatherError || !weatherData ? (
              <View style={{ gap: Spacing.two }}>
                <View style={styles.weatherRow}>
                  <View>
                    <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.error }}>
                      {language === 'hi' ? 'मौसम लोड करने में त्रुटि' : 'Weather unavailable'}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {language === 'hi' ? 'कृपया बाद में पुनः प्रयास करें' : 'Please try again later'}
                    </ThemedText>
                  </View>
                  <SymbolView
                    name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' } as any}
                    size={32}
                    tintColor={theme.error}
                  />
                </View>
                <View style={[styles.weatherDivider, { backgroundColor: theme.border }]} />
                <Pressable
                  onPress={() => {
                    setIsLoadingWeather(true);
                    setWeatherError(null);
                    fetchWeatherData(farmState)
                      .then(data => {
                        setWeatherData(data);
                        setIsLoadingWeather(false);
                      })
                      .catch(err => {
                        console.error('Retry error:', err);
                        setWeatherError('Failed to load weather');
                        setIsLoadingWeather(false);
                      });
                  }}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { borderColor: theme.primary },
                    pressed && { backgroundColor: theme.primary + '1A' }
                  ]}
                >
                  <ThemedText type="code" style={{ color: theme.primary, fontWeight: '700' }}>
                    {language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.weatherRow}>
                  <View>
                    <ThemedText type="smallBold" style={{ fontSize: 24 }}>{weatherData.temp}°C</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {language === 'hi' ? getWeatherCondition(weatherData.weatherCode).hi : getWeatherCondition(weatherData.weatherCode).en} (RH: {weatherData.humidity}%)
                    </ThemedText>
                  </View>
                  <SymbolView
                    name={getWeatherCondition(weatherData.weatherCode).icon as any}
                    size={36}
                    tintColor={theme.accent}
                  />
                </View>
                <View style={[styles.weatherDivider, { backgroundColor: theme.border }]} />
                <View style={styles.weatherAdviceRow}>
                  <SymbolView
                    name={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' } as any}
                    size={18}
                    tintColor={theme.accent}
                  />
                  <ThemedText type="small" style={styles.weatherAdviceText}>
                    {generateWeatherAdvisory(
                      weatherData.temp,
                      weatherData.humidity,
                      weatherData.weatherCode,
                      formatState(farmState),
                      formatLabel(farmCrop),
                      language
                    )}
                  </ThemedText>
                </View>
              </>
            )}
          </ThemedView>

          {/* Farm Profile Card */}
          <ThemedView type="card" style={[styles.profileCard, { borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two }}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                {language === 'hi' ? 'मेरा खेत प्रोफ़ाइल' : 'My Farm Profile'}
              </ThemedText>
              <Pressable
                onPress={logout}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  { borderColor: theme.error },
                  pressed && { backgroundColor: theme.error + '1A' }
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                  <SymbolView
                    name={{ ios: 'arrow.left.square.fill', android: 'logout', web: 'logout' } as any}
                    size={13}
                    tintColor={theme.error}
                  />
                  <ThemedText type="code" style={{ color: theme.error, fontSize: 11, fontWeight: '700' }}>
                    {language === 'hi' ? 'लॉगआउट' : 'Logout'}
                  </ThemedText>
                </View>
              </Pressable>
            </View>

            <View style={styles.profileSelectors}>
              {/* State Picker Button */}
              <Pressable
                onPress={() => openModal('state')}
                style={({ pressed }) => [
                  styles.selectorButton,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  pressed && { backgroundColor: theme.backgroundSelected }
                ]}
              >
                <View style={styles.selectorLeft}>
                  <SymbolView
                    name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' } as any}
                    size={18}
                    tintColor={theme.primary}
                  />
                  <View style={styles.selectorLeftContent}>
                    <ThemedText type="code" style={styles.selectorLabel}>
                      {language === 'hi' ? 'राज्य' : 'STATE'}
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.selectorValue} numberOfLines={1} ellipsizeMode="tail">
                      {formatState(farmState)}
                    </ThemedText>
                  </View>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' } as any}
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </Pressable>

              {/* Soil Picker Button */}
              <Pressable
                onPress={() => openModal('soil')}
                style={({ pressed }) => [
                  styles.selectorButton,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  pressed && { backgroundColor: theme.backgroundSelected }
                ]}
              >
                <View style={styles.selectorLeft}>
                  <SymbolView
                    name={{ ios: 'circle.grid.3x3.fill', android: 'layers', web: 'layers' } as any}
                    size={18}
                    tintColor={theme.primary}
                  />
                  <View style={styles.selectorLeftContent}>
                    <ThemedText type="code" style={styles.selectorLabel}>
                      {language === 'hi' ? 'मिट्टी का प्रकार' : 'SOIL TYPE'}
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.selectorValue} numberOfLines={1} ellipsizeMode="tail">
                      {formatLabel(farmSoil)}
                    </ThemedText>
                  </View>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' } as any}
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </Pressable>

              {/* Crop Picker Button */}
              <Pressable
                onPress={() => openModal('crop')}
                style={({ pressed }) => [
                  styles.selectorButton,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  pressed && { backgroundColor: theme.backgroundSelected }
                ]}
              >
                <View style={styles.selectorLeft}>
                  <SymbolView
                    name={{ ios: 'leaf.fill', android: 'grass', web: 'grass' } as any}
                    size={18}
                    tintColor={theme.primary}
                  />
                  <View style={styles.selectorLeftContent}>
                    <ThemedText type="code" style={styles.selectorLabel}>
                      {language === 'hi' ? 'सक्रिय फसल' : 'ACTIVE CROP'}
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.selectorValue} numberOfLines={1} ellipsizeMode="tail">
                      {formatLabel(farmCrop)}
                    </ThemedText>
                  </View>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' } as any}
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            </View>
          </ThemedView>

          {/* Quick Actions / Shortcuts */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            {language === 'hi' ? 'त्वरित परामर्श' : 'Quick Advisories'}
          </ThemedText>
          <View style={styles.advisoryGrid}>
            <Pressable
              onPress={() => handleQuickAdvice(
                'Pest',
                language === 'hi' 
                  ? `मेरी ${formatLabel(farmCrop)} की फसल में रोग / कीड़ों की समस्या है। लक्षण बताएं और इलाज की सलाह दें।`
                  : `I have disease/pest issues in my ${formatLabel(farmCrop)} crop. Show symptoms and suggest treatments.`
              )}
              style={({ pressed }) => [
                styles.advisoryCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && styles.pressedCard
              ]}
            >
              <SymbolView
                name={{ ios: 'ladybug.fill', android: 'bug_report', web: 'bug_report' } as any}
                size={28}
                tintColor={theme.primary}
              />
              <ThemedText type="smallBold" style={styles.advisoryTitle}>
                {language === 'hi' ? 'कीट नियंत्रण' : 'Pest Control'}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => handleQuickAdvice(
                'Watering',
                language === 'hi'
                  ? `मेरी ${formatLabel(farmCrop)} की फसल में खाद और सिंचाई की सही मात्रा और समय क्या है?`
                  : `What is the correct dosage and time for watering and fertilizing my ${formatLabel(farmCrop)} crop?`
              )}
              style={({ pressed }) => [
                styles.advisoryCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && styles.pressedCard
              ]}
            >
              <SymbolView
                name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' } as any}
                size={28}
                tintColor={theme.primary}
              />
              <ThemedText type="smallBold" style={styles.advisoryTitle}>
                {language === 'hi' ? 'सिंचाई व उर्वरक' : 'Water & Fertilizer'}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => handleQuickAdvice(
                'Organic',
                language === 'hi'
                  ? `जैविक खेती के तरीके बताएं जो मैं अपने खेत में इस्तेमाल कर सकूं।`
                  : `Tell me organic farming methods I can use in my farm.`
              )}
              style={({ pressed }) => [
                styles.advisoryCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && styles.pressedCard
              ]}
            >
              <SymbolView
                name={{ ios: 'sprout.fill', android: 'sprout', web: 'sprout' } as any}
                size={28}
                tintColor={theme.primary}
              />
              <ThemedText type="smallBold" style={styles.advisoryTitle}>
                {language === 'hi' ? 'जैविक खेती' : 'Organic Farming'}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => handleQuickAdvice(
                'Schemes',
                language === 'hi'
                  ? `किसानों के लिए प्रमुख सरकारी योजनाएं क्या हैं और आवेदन कैसे करें?`
                  : `What are the key government schemes for farmers and how to apply?`
              )}
              style={({ pressed }) => [
                styles.advisoryCard,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && styles.pressedCard
              ]}
            >
              <SymbolView
                name={{ ios: 'scroll.fill', android: 'description', web: 'description' } as any}
                size={28}
                tintColor={theme.primary}
              />
              <ThemedText type="smallBold" style={styles.advisoryTitle}>
                {language === 'hi' ? 'सरकारी योजनाएं' : 'Govt Schemes'}
              </ThemedText>
            </Pressable>
          </View>

          {/* Mandi Prices Tracker */}
          <View style={styles.mandiHeaderRow}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              {language === 'hi' ? 'मंडी बाजार दरें' : 'Mandi Market Rates'}
            </ThemedText>
            <Pressable
              onPress={refreshMandiPrices}
              disabled={isRefreshingPrices}
              style={({ pressed }) => [
                styles.refreshButton,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.8 }
              ]}
            >
              {isRefreshingPrices ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                  <SymbolView
                    name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' } as any}
                    size={12}
                    tintColor={theme.onPrimary}
                  />
                  <ThemedText type="code" style={[styles.refreshBtnText, { color: theme.onPrimary }]}>
                    {language === 'hi' ? 'ताज़ा करें' : 'Refresh'}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          </View>

          <ThemedView type="card" style={[styles.mandiCard, { borderColor: theme.border }]}>
            <TextInput
              style={[styles.searchInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              placeholder={language === 'hi' ? 'फसल या मंडी खोजें...' : 'Search commodity or mandi...'}
              placeholderTextColor={theme.textSecondary}
              value={mandiSearch}
              onChangeText={setMandiSearch}
            />

            {isLoadingMandi ? (
              <View style={{ paddingVertical: Spacing.four, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.two }}>
                  {language === 'hi' ? 'ताज़ा मंडी भाव लोड हो रहे हैं...' : 'Loading latest market rates...'}
                </ThemedText>
              </View>
            ) : filteredMandiPrices.length === 0 ? (
              <ThemedText type="small" style={styles.emptyText}>
                {language === 'hi' ? 'खोज से कोई फसल या मंडी नहीं मिली।' : 'No commodities match your search.'}
              </ThemedText>
            ) : (
              filteredMandiPrices.map((item) => {
                const isPositive = item.change.startsWith('+');
                const isZero = item.change === '0';
                return (
                  <View key={item.id} style={[styles.mandiItem, { borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1, paddingRight: Spacing.two }}>
                      <ThemedText type="smallBold">{formatLabel(item.commodity)}</ThemedText>
                      <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                        {formatState(item.state.replace(' Mandi', ''))} {language === 'hi' ? 'मंडी' : 'Mandi'}
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText type="smallBold">
                        ₹{item.price} <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>/{item.unit}</ThemedText>
                      </ThemedText>
                      {!isZero && (
                        <ThemedText
                          type="code"
                          style={{
                            fontSize: 11,
                            color: isPositive ? theme.success : theme.error,
                            fontWeight: '700'
                          }}
                        >
                          {item.change}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ThemedView>

          {/* Footer Branding */}
          <View style={styles.footerBranding}>
            <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 11 }}>
              Designed for smart agriculture • Krishi Mitra AI v1.0
            </ThemedText>
          </View>
        </ScrollView>

        {/* Modal Pickers */}
        <SelectionModal
          visible={activeModal !== null}
          title={
            activeModal === 'state'
              ? (language === 'hi' ? 'राज्य चुनें' : 'Select State')
              : activeModal === 'soil'
              ? (language === 'hi' ? 'मिट्टी का प्रकार चुनें' : 'Select Soil Type')
              : (language === 'hi' ? 'फसल चुनें' : 'Select Crop')
          }
          placeholder={
            activeModal === 'state'
              ? (language === 'hi' ? 'राज्य खोजें...' : 'Search State...')
              : activeModal === 'soil'
              ? (language === 'hi' ? 'मिट्टी खोजें...' : 'Search Soil...')
              : (language === 'hi' ? 'फसल खोजें...' : 'Search Crop...')
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
              ? farmState
              : activeModal === 'soil'
              ? farmSoil
              : farmCrop
          }
          onSelect={(value) => {
            if (activeModal) saveProfileValue(activeModal, value);
          }}
          onClose={closeModal}
        />
      </SafeAreaView>
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
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  logoIconText: {
    fontSize: 20,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any
    })
  },
  weatherCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  weatherCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  retryButton: {
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignSelf: 'center',
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherDivider: {
    height: 1,
    width: '100%',
  },
  weatherAdviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  leafIcon: {
    fontSize: 18,
  },
  weatherAdviceText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.85,
  },
  profileCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
  },
  logoutBtn: {
    borderWidth: 1,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  profileSelectors: {
    flexDirection: 'column',
    gap: Spacing.two,
  },
  selectorButton: {
    width: '100%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {}
    })
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.two,
  },
  selectorLeftContent: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 10,
    opacity: 0.7,
    marginBottom: 2,
  },
  selectorValue: {
    fontWeight: '700',
    fontSize: 14,
  },
  advisoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  advisoryCard: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    ...Platform.select({
      web: {
        width: 'calc(50% - 4px)',
        transition: 'transform 0.2s ease',
        cursor: 'pointer',
      } as any,
      default: {
        width: '47%',
        flexGrow: 1,
      }
    })
  },
  pressedCard: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  advisoryIcon: {
    fontSize: 24,
  },
  advisoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Spacing.half,
  },
  mandiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  refreshButton: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  mandiCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
  },
  searchInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  mandiItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  footerBranding: {
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  modalOverlay: {
    flex: 1,
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
