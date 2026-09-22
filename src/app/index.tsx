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
  Image,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import Animated, { FadeInDown, FadeInLeft, FadeInRight, Layout, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { Colors, Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/auth-context';
import { LocalStorage } from '@/utils/storage';
import { fetchWeatherData, getWeatherCondition, generateWeatherAdvisory, type RawWeatherData } from '@/services/weather-service';
import { getLiveGPSLocation, type LiveLocationData } from '@/services/location-service';
import { fetchLiveMandiPrices, type MandiItem } from '@/services/mandi-service';
import OfflineNotice from '@/components/offline-notice';
import { AppLogo } from '@/components/app-logo';
import { WeatherDisasterModal } from '@/components/weather-disaster-modal';
import { KrishikRadioModal } from '@/components/krishik-radio-modal';

import cropsData from '@/constants/crops.json';
import { SelectionModal } from '@/components/selection-modal';
import { PressableScale } from '@/components/pressable-scale';

// Constants for Profile
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
  const [language, setLanguage] = useState<'hi' | 'en'>('en');

  // Weather state
  const [weatherData, setWeatherData] = useState<RawWeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherCachedAt, setWeatherCachedAt] = useState<Date | null>(null);
  const [isDisasterModalOpen, setIsDisasterModalOpen] = useState(false);
  const [isRadioModalOpen, setIsRadioModalOpen] = useState(false);
  const [liveLocation, setLiveLocation] = useState<LiveLocationData | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Fetch weather when farmState changes or on init
  useEffect(() => {
    let isMounted = true;
    async function loadWeather() {
      setIsLoadingWeather(true);
      setWeatherError(null);
      setWeatherCachedAt(null);
      try {
        // 1. Check if user already has saved live GPS location
        let targetLocation: string | { latitude: number; longitude: number } = farmState || 'Uttar Pradesh';
        let cacheKey = `weather_cache_${farmState || 'default'}`;

        const savedGpsStr = await LocalStorage.getItem('user_live_location');
        if (savedGpsStr) {
          try {
            const savedGps: LiveLocationData = JSON.parse(savedGpsStr);
            if (savedGps && savedGps.latitude && savedGps.longitude) {
              if (isMounted) setLiveLocation(savedGps);
              targetLocation = { latitude: savedGps.latitude, longitude: savedGps.longitude };
              cacheKey = `weather_cache_gps_${savedGps.latitude.toFixed(2)}_${savedGps.longitude.toFixed(2)}`;
            }
          } catch (e) {}
        }

        const data = await fetchWeatherData(targetLocation);
        if (isMounted) {
          setWeatherData(data);
          await LocalStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        }
      } catch (err) {
        console.error('Error fetching weather:', err);
        if (isMounted) {
          try {
            const cachedStr = await LocalStorage.getItem(`weather_cache_${farmState}`);
            if (cachedStr) {
              const cached = JSON.parse(cachedStr);
              setWeatherData(cached.data);
              setWeatherCachedAt(new Date(cached.timestamp));
            } else {
              setWeatherError('Failed to load weather');
            }
          } catch (cacheErr) {
            console.error('Error loading weather cache:', cacheErr);
            setWeatherError('Failed to load weather');
          }
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
    'West Bengal': 'पश्चिम बंगाल',
    'Karnataka': 'कर्नाटक',
    'Andhra Pradesh': 'आंध्र प्रदेश',
    'Telangana': 'तेलंगाना',
    'Tamil Nadu': 'तमिलनाडु',
    'Odisha': 'ओडिशा',
    'Jharkhand': 'झारखंड',
    'Chhattisgarh': 'छत्तीसगढ़',
    'Assam': 'असम',
    'Himachal Pradesh': 'हिमाचल प्रदेश',
    'Uttarakhand': 'उत्तराखंड',
    'Kerala': 'केरल',
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

  // Live Location Detection & Auto-Sync
  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const loc = await getLiveGPSLocation();
      if (loc) {
        setLiveLocation(loc);
        await LocalStorage.setItem('user_live_location', JSON.stringify(loc));

        // Seamlessly match and sync profile state without user needing to select
        if (loc.state) {
          const matchedState = STATES.find(s => 
            s.toLowerCase() === loc.state?.toLowerCase() || 
            loc.state?.toLowerCase().includes(s.toLowerCase()) ||
            s.toLowerCase().includes(loc.state?.toLowerCase() || '')
          );
          if (matchedState && matchedState !== farmState) {
            await updateProfile(userName, matchedState, farmSoil, farmCrop);
          }
        }

        // Close state selection popup if it was open
        closeModal();

        setIsLoadingWeather(true);
        const data = await fetchWeatherData({ latitude: loc.latitude, longitude: loc.longitude });
        setWeatherData(data);
        const cacheKey = `weather_cache_gps_${loc.latitude.toFixed(2)}_${loc.longitude.toFixed(2)}`;
        await LocalStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
      }
    } catch (err) {
      console.warn('Location detection notice:', err);
    } finally {
      setIsDetectingLocation(false);
      setIsLoadingWeather(false);
    }
  };

  // Direct Auto-Location Detection on App Launch (Zero Popups Required)
  useEffect(() => {
    let isMounted = true;
    async function initAutoLocation() {
      // 1. Immediately restore cached GPS location for instant 0ms weather
      try {
        const cachedGpsStr = await LocalStorage.getItem('user_live_location');
        if (cachedGpsStr) {
          const cachedGps: LiveLocationData = JSON.parse(cachedGpsStr);
          if (cachedGps && cachedGps.latitude && cachedGps.longitude) {
            if (isMounted) setLiveLocation(cachedGps);
          }
        }
      } catch (e) {}

      // 2. Silently fetch live GPS coordinates directly
      try {
        setIsDetectingLocation(true);
        const loc = await getLiveGPSLocation();
        if (loc && isMounted) {
          setLiveLocation(loc);
          await LocalStorage.setItem('user_live_location', JSON.stringify(loc));

          // Auto-sync profile state if matched
          if (loc.state) {
            const matchedState = STATES.find(s => 
              s.toLowerCase() === loc.state?.toLowerCase() || 
              loc.state?.toLowerCase().includes(s.toLowerCase()) ||
              s.toLowerCase().includes(loc.state?.toLowerCase() || '')
            );
            if (matchedState && matchedState !== farmState) {
              await updateProfile(userName, matchedState, farmSoil, farmCrop);
            }
          }

          setIsLoadingWeather(true);
          const data = await fetchWeatherData({ latitude: loc.latitude, longitude: loc.longitude });
          if (isMounted) {
            setWeatherData(data);
            const cacheKey = `weather_cache_gps_${loc.latitude.toFixed(2)}_${loc.longitude.toFixed(2)}`;
            await LocalStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
          }
        }
      } catch (err) {
        console.warn('Auto location detection notice:', err);
      } finally {
        if (isMounted) {
          setIsDetectingLocation(false);
          setIsLoadingWeather(false);
        }
      }
    }

    initAutoLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Mandi prices state
  const [mandiPrices, setMandiPrices] = useState<MandiItem[]>(INITIAL_MANDI_PRICES);
  const [mandiSearch, setMandiSearch] = useState('');
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [isLoadingMandi, setIsLoadingMandi] = useState(true);
  const [mandiError, setMandiError] = useState<string | null>(null);
  const [mandiLastUpdated, setMandiLastUpdated] = useState<Date | null>(null);
  const [mandiIsCached, setMandiIsCached] = useState(false);

  const formatCacheTime = (date: Date | null) => {
    if (!date) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = `${pad(hours)}:${minutes} ${ampm}`;
    const dateStr = `${day}/${month}/${year}`;
    if (language === 'hi') {
      return `ऑफ़लाइन • सहेजा गया: ${dateStr}, ${strTime}`;
    }
    return `Offline • Cached: ${dateStr}, ${strTime}`;
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strTime = `${pad(hours)}:${minutes} ${ampm}`;
    const dateStr = `${day}/${month}/${year}`;
    
    if (mandiIsCached) {
      if (language === 'hi') {
        return `ऑफ़लाइन भाव (सहेजा गया: ${dateStr}, ${strTime})`;
      }
      return `Offline Rates (Cached: ${dateStr}, ${strTime})`;
    }

    if (language === 'hi') {
      return `अंतिम अपडेट: ${dateStr}, ${strTime}`;
    }
    return `Last updated: ${dateStr}, ${strTime}`;
  };

  // Fetch live Mandi prices when farmState changes
  useEffect(() => {
    let isMounted = true;
    async function loadMandi() {
      if (!farmState) return;
      setIsLoadingMandi(true);
      setMandiError(null);
      setMandiIsCached(false);
      try {
        const data = await fetchLiveMandiPrices(farmState);
        if (isMounted) {
          setMandiPrices(data.length > 0 ? data : INITIAL_MANDI_PRICES);
          setMandiLastUpdated(new Date());
          // Save cache
          await LocalStorage.setItem(`mandi_cache_${farmState}`, JSON.stringify({ data, timestamp: Date.now() }));
        }
      } catch (err) {
        console.warn('Error fetching live mandi prices:', err);
        if (isMounted) {
          try {
            const cachedStr = await LocalStorage.getItem(`mandi_cache_${farmState}`);
            if (cachedStr) {
              const cached = JSON.parse(cachedStr);
              setMandiPrices(cached.data);
              setMandiLastUpdated(new Date(cached.timestamp));
              setMandiIsCached(true);
            } else {
              setMandiPrices(INITIAL_MANDI_PRICES);
              setMandiError('Failed to fetch live prices');
              setMandiLastUpdated(new Date());
              setMandiIsCached(true);
            }
          } catch (cacheErr) {
            console.error('Error loading mandi cache:', cacheErr);
            setMandiPrices(INITIAL_MANDI_PRICES);
            setMandiError('Failed to fetch live prices');
            setMandiLastUpdated(new Date());
            setMandiIsCached(true);
          }
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
      setMandiLastUpdated(new Date());
      setMandiIsCached(false);
      await LocalStorage.setItem(`mandi_cache_${farmState}`, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (err) {
      console.warn('Error refreshing Mandi prices:', err);
      try {
        const cachedStr = await LocalStorage.getItem(`mandi_cache_${farmState}`);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          setMandiPrices(cached.data);
          setMandiLastUpdated(new Date(cached.timestamp));
          setMandiIsCached(true);
        } else {
          setMandiLastUpdated(new Date());
          setMandiIsCached(true);
        }
      } catch (cacheErr) {
        console.error('Error refreshing/loading cache:', cacheErr);
        setMandiLastUpdated(new Date());
        setMandiIsCached(true);
      }
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  // Filter, deduplicate and sort prices
  const filteredMandiPrices = React.useMemo(() => {
    // 1. Filter by search query
    let list = mandiPrices.filter(item =>
      item.commodity.toLowerCase().includes(mandiSearch.toLowerCase()) ||
      item.state.toLowerCase().includes(mandiSearch.toLowerCase())
    );

    // 2. Deduplicate items so same commodity in same market isn't repeated 10 times
    const seen = new Set<string>();
    list = list.filter(item => {
      const key = `${item.commodity.trim().toLowerCase()}___${item.state.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 3. Sort by user's active crop priority
    if (farmCrop) {
      const activeCropClean = farmCrop.split('(')[0].trim().toLowerCase();
      list = [...list].sort((a, b) => {
        const aMatches = a.commodity.toLowerCase().includes(activeCropClean);
        const bMatches = b.commodity.toLowerCase().includes(activeCropClean);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
    }

    // 4. Limit default view to 25 items so page isn't too long, but show all if searching
    if (!mandiSearch) {
      return list.slice(0, 25);
    }
    return list;
  }, [mandiPrices, mandiSearch, farmCrop]);

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
        <OfflineNotice language={language} />
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <AppLogo size="small" showText={false} />
              <View style={{ flex: 1, flexShrink: 1 }}>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 11.5, fontWeight: '600' }}>
                  {language === 'hi' ? 'नमस्ते 👋' : 'Welcome 👋'}
                </ThemedText>
                <ThemedText numberOfLines={1} type="smallBold" style={{ color: theme.primary, fontSize: 17, fontWeight: '800', marginTop: 1 }}>
                  {userName}
                </ThemedText>
              </View>
            </View>
            <PressableScale
              onPress={toggleLanguage}
              style={({ pressed }) => [
                styles.langToggle,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                pressed && { opacity: 0.8 }
              ]}
            >
              <SymbolView
                name={{ ios: 'globe', android: 'language', web: 'language' } as any}
                size={15}
                tintColor={theme.primary}
              />
              <ThemedText style={{ color: theme.text, fontSize: 12.5, fontWeight: '700' }}>
                {language === 'hi' ? 'Hindi' : 'English'}
              </ThemedText>
            </PressableScale>
          </View>

          {/* Weather Widget */}
          <Animated.View entering={FadeInDown.duration(300).delay(50)}>
            <ThemedView type="backgroundElement" style={[styles.weatherCard, { borderColor: theme.border }]}>
            {isLoadingWeather ? (
              <View style={[styles.weatherCenter, { height: 110 }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.two }}>
                  {language === 'hi' ? 'मौसम लोड हो रहा है...' : 'Loading weather forecast...'}
                </ThemedText>
              </View>
            ) : weatherError || !weatherData ? (
              <View style={{ gap: Spacing.two }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <View style={{ height: 1, width: '100%', backgroundColor: theme.border }} />
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
                {/* 1. Header: Location & Live GPS Pill (Tappable to re-detect) + Top Forecast Pill */}
                <View style={styles.weatherCardHeader}>
                  <Pressable
                    onPress={handleDetectLocation}
                    disabled={isDetectingLocation}
                    style={({ pressed }) => [
                      styles.locationPill,
                      {
                        backgroundColor: liveLocation ? theme.primary + '12' : theme.backgroundElement,
                        borderColor: liveLocation ? theme.primary + '35' : theme.border,
                      },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' } as any}
                      size={15}
                      tintColor={theme.primary}
                    />
                    <ThemedText style={{ fontSize: 14.5, fontWeight: '700', color: theme.text }} numberOfLines={1}>
                      {liveLocation?.displayName || formatState(farmState)}
                    </ThemedText>
                    {isDetectingLocation ? (
                      <ActivityIndicator size={12} color={theme.primary} style={{ marginLeft: 2 }} />
                    ) : (
                      <View style={[styles.liveGpsTag, { backgroundColor: theme.primary }]}>
                        <ThemedText style={{ fontSize: 9.5, fontWeight: '800', color: theme.onPrimary }}>
                          LIVE
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                </View>

                {/* 2. Hero Weather Row: Big Temp + Condition on left, Circular Tinted Icon on right */}
                {(() => {
                  const isNight = weatherData.isDay === 0;
                  const cond = getWeatherCondition(weatherData.weatherCode, weatherData.isDay);

                  return (
                    <View style={styles.weatherHeroRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 44, fontWeight: '800', lineHeight: 50, color: theme.text }}>
                          {weatherData.temp}°C
                        </ThemedText>
                        <ThemedText style={{ fontSize: 16, fontWeight: '600', color: theme.textSecondary, marginTop: 2 }}>
                          {language === 'hi' ? cond.hi : cond.en}
                        </ThemedText>
                      </View>

                      <View style={[styles.weatherIconCircle, { backgroundColor: isNight ? '#6366F115' : theme.accent + '18' }]}>
                        <SymbolView
                          name={cond.icon as any}
                          size={38}
                          tintColor={isNight ? '#818CF8' : theme.accent}
                        />
                      </View>
                    </View>
                  );
                })()}

                {/* 3. Structured Metrics Grid: 2 Side-by-Side Clean Cards */}
                <View style={styles.metricsGrid}>
                  {weatherData.daily7d && weatherData.daily7d.length > 0 && (
                    <View style={[styles.metricChip, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' }]}>
                      <View style={[styles.metricIconBox, { backgroundColor: theme.primary + '15' }]}>
                        <SymbolView
                          name={{ ios: 'thermometer.medium', android: 'thermostat', web: 'thermostat' } as any}
                          size={15}
                          tintColor={theme.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 11.5, color: theme.textSecondary, fontWeight: '600' }}>
                          {language === 'hi' ? 'आज का तापमान' : 'Today Range'}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 14.5, fontWeight: '700', color: theme.text, marginTop: 1 }}>
                          {weatherData.daily7d[0].minTemp}° - {weatherData.daily7d[0].maxTemp}°C
                        </ThemedText>
                      </View>
                    </View>
                  )}

                  <View style={[styles.metricChip, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' }]}>
                    <View style={[styles.metricIconBox, { backgroundColor: '#0284C718' }]}>
                      <SymbolView
                        name={{ ios: 'humidity', android: 'water_drop', web: 'water_drop' } as any}
                        size={15}
                        tintColor="#0284C7"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 11.5, color: theme.textSecondary, fontWeight: '600' }}>
                        {language === 'hi' ? 'हवा में नमी' : 'Humidity'}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 14.5, fontWeight: '700', color: theme.text, marginTop: 1 }}>
                        {weatherData.humidity}% RH
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* 4. Disaster Alert Card (If Active) */}
                {weatherData.disasterAlert && (
                  <Pressable
                    onPress={() => setIsDisasterModalOpen(true)}
                    style={({ pressed }) => [
                      styles.disasterAlertCard,
                      {
                        backgroundColor: theme.dark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                        borderColor: theme.dark ? 'rgba(239, 68, 68, 0.35)' : '#FCA5A5',
                      },
                      pressed && { opacity: 0.9 }
                    ]}
                  >
                    {/* Top Row: Category Tag on Left, Risk Pill on Right */}
                    <View style={styles.disasterHeaderRow}>
                      <View style={styles.disasterTagLeft}>
                        <View style={[styles.disasterIconCircle, { backgroundColor: theme.error }]}>
                          <SymbolView
                            name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' } as any}
                            size={11}
                            tintColor="#FFFFFF"
                          />
                        </View>
                        <ThemedText style={styles.disasterTagText}>
                          {language === 'hi' ? 'आपदा चेतावनी' : 'DISASTER ALERT'}
                        </ThemedText>
                      </View>

                      <View style={[styles.disasterRiskBadge, { backgroundColor: theme.error }]}>
                        <ThemedText style={styles.disasterRiskText}>
                          {weatherData.disasterAlert.probability}% {language === 'hi' ? 'खतरा' : 'RISK'}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Main Title: Full width, bold, 0 truncation */}
                    <ThemedText style={[styles.disasterTitleText, { color: theme.dark ? '#FCA5A5' : '#991B1B' }]}>
                      {(language === 'hi' ? weatherData.disasterAlert.titleHi : weatherData.disasterAlert.titleEn).replace(/^(48h|48-घंटे में|48-घंटे)\s*/i, '').replace(/^[^\w\s\u0900-\u097F]+/, '').trim()}
                    </ThemedText>

                    {/* Footer Action Row */}
                    <View style={styles.disasterFooterRow}>
                      <ThemedText style={[styles.disasterFooterText, { color: theme.dark ? '#F87171' : '#B91C1C' }]}>
                        {language === 'hi' ? '48h का पूर्वानुमान व फसल सुरक्षा सलाह देखें' : '48h forecast & crop protection guide'}
                      </ThemedText>
                      <View style={[styles.disasterArrowBox, { backgroundColor: theme.error + '20' }]}>
                        <SymbolView
                          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                          size={12}
                          tintColor={theme.error}
                        />
                      </View>
                    </View>
                  </Pressable>
                )}

                {/* 5. Smart Farm Advisory Callout */}
                <View style={[styles.advisoryCallout, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' }]}>
                  <View style={[styles.advisoryIconBadge, { backgroundColor: theme.accent + '20' }]}>
                    <SymbolView
                      name={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' } as any}
                      size={15}
                      tintColor={theme.accent}
                    />
                  </View>
                  <ThemedText style={[styles.advisoryCalloutText, { color: theme.text }]}>
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

                {/* 6. Full Width 7-Day Forecast Action Button */}
                <Pressable
                  onPress={() => setIsDisasterModalOpen(true)}
                  style={({ pressed }) => [
                    styles.fullForecastBtn,
                    {
                      backgroundColor: theme.dark ? 'rgba(52, 211, 153, 0.12)' : '#ECFDF5',
                      borderColor: theme.primary + '35',
                    },
                    pressed && { opacity: 0.88 }
                  ]}
                >
                  <View style={[styles.advisoryIconBadge, { backgroundColor: theme.primary + '20' }]}>
                    <SymbolView
                      name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' } as any}
                      size={14}
                      tintColor={theme.primary}
                    />
                  </View>
                  <ThemedText numberOfLines={1} style={{ color: theme.text, fontSize: 13.5, fontWeight: '700', flex: 1, textAlign: 'center' }}>
                    {language === 'hi' ? '7-दिवसीय मौसम पूर्वानुमान' : '7-Day Weather Forecast'}
                  </ThemedText>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                    size={16}
                    tintColor={theme.primary}
                  />
                </Pressable>

                {weatherCachedAt && (
                  <ThemedText type="code" style={{ fontSize: 9.5, color: theme.textSecondary, textAlign: 'center', marginTop: 1 }}>
                    {formatCacheTime(weatherCachedAt)}
                  </ThemedText>
                )}
              </>
            )}
            </ThemedView>
          </Animated.View>

          {/* Farm Profile Card */}
          <Animated.View entering={FadeInDown.duration(300).delay(150)}>
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
              <PressableScale
                onPress={() => openModal('state')}
                style={({ pressed }) => [
                  styles.selectorButton,
                  { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' },
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
                      {liveLocation?.district ? `${liveLocation.district} (${formatState(farmState)})` : formatState(farmState)}
                    </ThemedText>
                  </View>
                </View>
                <SymbolView
                  name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' } as any}
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </PressableScale>

              {/* Soil Picker Button */}
              <PressableScale
                onPress={() => openModal('soil')}
                style={({ pressed }) => [
                  styles.selectorButton,
                  { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' },
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
              </PressableScale>

              {/* Crop Picker Button */}
              <PressableScale
                onPress={() => openModal('crop')}
                style={({ pressed }) => [
                  styles.selectorButton,
                  { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' },
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
              </PressableScale>
            </View>
            </ThemedView>
          </Animated.View>

          {/* Quick Actions / Shortcuts */}
          <Animated.View entering={FadeInDown.duration(300).delay(250)}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              {language === 'hi' ? 'त्वरित परामर्श' : 'Quick Advisories'}
            </ThemedText>

            <View style={styles.advisoryGrid}>
              {/* 1. Pest Control */}
              <PressableScale
                onPress={() => handleQuickAdvice(
                  'Pest',
                  language === 'hi' 
                    ? `मेरी ${formatLabel(farmCrop)} की फसल में रोग / कीड़ों की समस्या है। लक्षण बताएं और इलाज की सलाह दें।`
                    : `I have disease/pest issues in my ${formatLabel(farmCrop)} crop. Show symptoms and suggest treatments.`
                )}
                style={({ pressed }) => [
                  styles.advisoryCard,
                  { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' },
                  pressed && styles.pressedCard
                ]}
              >
                <View style={[styles.advisoryIconCircle, { backgroundColor: theme.primary + '15' }]}>
                  <SymbolView
                    name={{ ios: 'ladybug.fill', android: 'bug_report', web: 'bug_report' } as any}
                    size={22}
                    tintColor={theme.primary}
                  />
                </View>
                <ThemedText style={styles.advisoryTitle}>
                  {language === 'hi' ? 'कीट नियंत्रण' : 'Pest Control'}
                </ThemedText>
              </PressableScale>

              {/* 2. Water & Fertilizer */}
              <PressableScale
                onPress={() => handleQuickAdvice(
                  'Watering',
                  language === 'hi'
                    ? `मेरी ${formatLabel(farmCrop)} की फसल में खाद और सिंचाई की सही मात्रा और समय क्या है?`
                    : `What is the correct dosage and time for watering and fertilizing my ${formatLabel(farmCrop)} crop?`
                )}
                style={({ pressed }) => [
                  styles.advisoryCard,
                  { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' },
                  pressed && styles.pressedCard
                ]}
              >
                <View style={[styles.advisoryIconCircle, { backgroundColor: '#0284C718' }]}>
                  <SymbolView
                    name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' } as any}
                    size={22}
                    tintColor="#0284C7"
                  />
                </View>
                <ThemedText style={styles.advisoryTitle}>
                  {language === 'hi' ? 'सिंचाई व उर्वरक' : 'Water & Fertilizer'}
                </ThemedText>
              </PressableScale>

              {/* 3. Organic Farming */}
              <PressableScale
                onPress={() => handleQuickAdvice(
                  'Organic',
                  language === 'hi'
                    ? `जैविक खेती के तरीके बताएं जो मैं अपने खेत में इस्तेमाल कर सकूं।`
                    : `Tell me organic farming methods I can use in my farm.`
                )}
                style={({ pressed }) => [
                  styles.advisoryCard,
                  { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' },
                  pressed && styles.pressedCard
                ]}
              >
                <View style={[styles.advisoryIconCircle, { backgroundColor: '#10B98118' }]}>
                  <SymbolView
                    name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' } as any}
                    size={22}
                    tintColor="#10B981"
                  />
                </View>
                <ThemedText style={styles.advisoryTitle}>
                  {language === 'hi' ? 'जैविक खेती' : 'Organic Farming'}
                </ThemedText>
              </PressableScale>

              {/* 4. Govt Schemes */}
              <PressableScale
                onPress={() => handleQuickAdvice(
                  'Schemes',
                  language === 'hi'
                    ? `किसानों के लिए प्रमुख सरकारी योजनाएं क्या हैं और आवेदन कैसे करें?`
                    : `What are the key government schemes for farmers and how to apply?`
                )}
                style={({ pressed }) => [
                  styles.advisoryCard,
                  { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)' },
                  pressed && styles.pressedCard
                ]}
              >
                <View style={[styles.advisoryIconCircle, { backgroundColor: '#F59E0B18' }]}>
                  <SymbolView
                    name={{ ios: 'scroll.fill', android: 'description', web: 'description' } as any}
                    size={22}
                    tintColor="#F59E0B"
                  />
                </View>
                <ThemedText style={styles.advisoryTitle}>
                  {language === 'hi' ? 'सरकारी योजनाएं' : 'Govt Schemes'}
                </ThemedText>
              </PressableScale>
            </View>

            {/* Featured Krishik Radio FM Hero Banner */}
            <PressableScale
              onPress={() => setIsRadioModalOpen(true)}
              style={({ pressed }) => [
                styles.radioBannerCard,
                { backgroundColor: theme.dark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', borderColor: theme.primary + '35' },
                pressed && { opacity: 0.9 }
              ]}
            >
              <View style={[styles.radioBannerIconCircle, { backgroundColor: theme.primary }]}>
                <SymbolView
                  name={{ ios: 'radio.fill', android: 'radio', web: 'radio' } as any}
                  size={20}
                  tintColor={theme.onPrimary}
                />
              </View>
              
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ThemedText style={{ fontSize: 14.5, fontWeight: '800', color: theme.text }}>
                    {language === 'hi' ? 'किसान रेडियो FM 📻' : 'Krishik Radio FM 📻'}
                  </ThemedText>
                  <View style={[styles.liveFmBadge, { backgroundColor: theme.primary }]}>
                    <ThemedText style={{ fontSize: 9, fontWeight: '800', color: theme.onPrimary }}>
                      LIVE FM
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={{ fontSize: 11.5, color: theme.textSecondary, marginTop: 1 }}>
                  {language === 'hi' ? 'कृषि समाचार, मौसम बुलेटिन व संगीत सुनें' : 'Listen to farm bulletins, weather & music'}
                </ThemedText>
              </View>

              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                size={16}
                tintColor={theme.primary}
              />
            </PressableScale>
          </Animated.View>

          {/* Mandi Prices Tracker */}
          <View style={styles.mandiHeaderRow}>
            <View style={{ flex: 1, marginRight: Spacing.two }}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                {language === 'hi' ? 'मंडी बाजार दरें' : 'Mandi Market Rates'}
              </ThemedText>
              {mandiLastUpdated && (
                <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>
                  {formatLastUpdated(mandiLastUpdated)}
                </ThemedText>
              )}
            </View>
            <PressableScale
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
            </PressableScale>
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

                const cleanComm = item.commodity.split('(')[0].trim().toLowerCase();
                const cleanVar = item.variety ? item.variety.trim().toLowerCase() : '';
                const showVariety = cleanVar && cleanVar !== cleanComm;

                return (
                  <Animated.View
                    key={item.id}
                    layout={Layout.springify().damping(15)}
                    entering={FadeInDown.duration(200)}
                    style={[styles.mandiItem, { borderBottomColor: theme.border }]}
                  >
                    <View style={{ flex: 1, paddingRight: Spacing.two }}>
                      <ThemedText type="smallBold">{formatLabel(item.commodity)}</ThemedText>
                      <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                        {formatState(item.state.replace(' Mandi', ''))} {language === 'hi' ? 'मंडी' : 'Mandi'}{showVariety ? ` • ${item.variety}` : ''}
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
                  </Animated.View>
                );
              })
            )}
          </ThemedView>

          {/* Footer Branding */}
          <View style={styles.footerBranding}>
            <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 11 }}>
              {language === 'hi' ? 'कृषि के लिए स्मार्ट AI • Krishik Mitra' : 'Smart AI for Agriculture • Krishik Mitra'}
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
          onUseLiveLocation={activeModal === 'state' ? handleDetectLocation : undefined}
          isDetectingLocation={isDetectingLocation}
        />

        {/* 7-Day Weather Forecast & Disaster Alert Modal */}
        <WeatherDisasterModal
          visible={isDisasterModalOpen}
          onClose={() => setIsDisasterModalOpen(false)}
          disasterAlert={weatherData?.disasterAlert || null}
          daily7d={weatherData?.daily7d}
          currentTemp={weatherData?.temp}
          stateName={liveLocation?.displayName || formatState(farmState)}
          cropName={formatLabel(farmCrop)}
          language={language}
          onNavigateToChat={(msg) => {
            router.push({ pathname: '/chat', params: { initialPrompt: msg } });
          }}
        />

        {/* Krishik Radio FM & AI Bulletin Modal */}
        <KrishikRadioModal
          visible={isRadioModalOpen}
          onClose={() => setIsRadioModalOpen(false)}
          weatherContext={{
            temp: weatherData?.temp,
            state: farmState,
            crop: farmCrop,
          }}
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
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
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
    gap: 10,
    borderWidth: 1,
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
  weatherCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 0,
    flexShrink: 1,
    maxWidth: '74%',
  },
  liveGpsTag: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 2,
  },
  forecastPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 0,
  },
  weatherHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weatherIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 0,
    gap: 8,
  },
  metricIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disasterAlertCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 8,
  },
  disasterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disasterTagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disasterIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disasterTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#EF4444',
  },
  disasterRiskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  disasterRiskText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  disasterTitleText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  disasterFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    gap: 8,
  },
  disasterFooterText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  disasterArrowBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advisoryCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 0,
    gap: 8,
  },
  advisoryIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  advisoryCalloutText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
  },
  fullForecastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0,
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
    borderWidth: 0,
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
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  advisoryCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        width: 'calc(50% - 5px)',
        transition: 'transform 0.2s ease',
        cursor: 'pointer',
      } as any,
      default: {
        width: '48%',
      }
    })
  },
  advisoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressedCard: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  advisoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  radioBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  radioBannerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveFmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
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
