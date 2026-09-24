import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Modal,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Alert,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/context/language-context';
import {
  GOV_SCHEMES_DATABASE,
  filterSchemes,
  calculateEligibleBenefits,
  fetchLatestSchemeNews,
  type GovScheme,
  type SchemeCategory,
  type SchemeNewsItem,
  type BenefitCalculation,
} from '@/services/gov-schemes-service';

const STATES_LIST = [
  'All',
  'Bihar',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Maharashtra',
  'Rajasthan',
  'Gujarat',
  'Punjab',
];

interface GovSchemesModalProps {
  visible: boolean;
  onClose: () => void;
  initialState?: string;
  initialLandAcres?: number;
}

export function GovSchemesModal({
  visible,
  onClose,
  initialState = 'All',
  initialLandAcres = 2.5,
}: GovSchemesModalProps) {
  const theme = useTheme();
  const { isHi } = useLanguage();
  const { width } = useWindowDimensions();

  // State & Filter state
  const [selectedState, setSelectedState] = useState<string>(initialState);
  const [landAcresInput, setLandAcresInput] = useState<string>(
    initialLandAcres ? String(initialLandAcres) : '2.5'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected scheme detail modal state
  const [activeScheme, setActiveScheme] = useState<GovScheme | null>(null);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);

  // Latest news state
  const [schemeNews, setSchemeNews] = useState<SchemeNewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState<boolean>(false);
  const [showNews, setShowNews] = useState<boolean>(true);

  // Parse numeric land acres safely
  const landAcresNum = Math.max(0.1, parseFloat(landAcresInput) || 1);

  // Filtered schemes
  const filteredSchemes = filterSchemes(
    selectedState,
    landAcresNum,
    selectedCategory,
    searchQuery
  );

  // Benefit calculation
  const benefits: BenefitCalculation = calculateEligibleBenefits(
    landAcresNum,
    selectedState
  );

  // Fetch news on mount
  useEffect(() => {
    let isMounted = true;
    async function loadNews() {
      setLoadingNews(true);
      try {
        const news = await fetchLatestSchemeNews();
        if (isMounted) {
          setSchemeNews(news);
        }
      } catch (err) {
        console.warn('Failed to load scheme news:', err);
      } finally {
        if (isMounted) setLoadingNews(false);
      }
    }
    if (visible) {
      loadNews();
    }
    return () => {
      isMounted = false;
    };
  }, [visible]);

  const categories: Array<{ id: string; nameHi: string; nameEn: string; icon: string }> = [
    { id: 'all', nameHi: '🌐 सभी', nameEn: '🌐 All', icon: 'grid' },
    { id: 'dbt', nameHi: '💸 डीबीटी (नकद)', nameEn: '💸 DBT Cash', icon: 'banknote' },
    { id: 'solar', nameHi: '☀️ सोलर पंप', nameEn: '☀️ Solar Pump', icon: 'sun.max' },
    { id: 'machinery', nameHi: '🚜 कृषि यंत्र', nameEn: '🚜 Machinery', icon: 'gear' },
    { id: 'irrigation', nameHi: '💧 सिंचाई', nameEn: '💧 Irrigation', icon: 'drop' },
    { id: 'loan', nameHi: '💳 कम ब्याज ऋण', nameEn: '💳 Low Loan', icon: 'creditcard' },
    { id: 'insurance', nameHi: '🛡️ फसल बीमा', nameEn: '🛡️ Insurance', icon: 'shield' },
  ];

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch (e) {
      Alert.alert(
        isHi ? 'त्रुटि' : 'Error',
        isHi ? 'वेबसाइट खोलने में असमर्थ।' : 'Could not open website link.'
      );
    }
  };

  const handleDialHelpline = async (phone: string) => {
    try {
      const telUrl = `tel:${phone}`;
      await Linking.openURL(telUrl);
    } catch (e) {
      Alert.alert(
        isHi ? 'हेल्पलाइन' : 'Helpline',
        isHi
          ? `हेल्पलाइन नंबर: ${phone}`
          : `Helpline phone number: ${phone}`
      );
    }
  };

  const handleLandPreset = (acres: number) => {
    setLandAcresInput(String(acres));
  };

  const isDarkMode = theme.dark;
  const accentEmerald = isDarkMode ? '#34D399' : '#166534';
  const cardBg = isDarkMode ? '#121215' : '#FFFFFF';
  const innerCardBg = isDarkMode ? '#1C1C22' : '#F8FAF8';
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0';
  const textColor = theme.text;
  const subTextColor = theme.textSecondary;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.headerBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
            <View style={styles.headerTitleContainer}>
              <View style={[styles.headerIconBadge, { backgroundColor: accentEmerald + '22' }]}>
                <ThemedText style={{ fontSize: 20 }}>🏛️</ThemedText>
              </View>
              <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                <ThemedText type="subtitle" numberOfLines={1} style={{ fontSize: 17, color: textColor, fontWeight: '700' }}>
                  {isHi ? 'सरकारी योजनाएं एवं सब्सिडी' : 'PM-Kisan & Subsidy Finder'}
                </ThemedText>
                <ThemedText type="code" numberOfLines={1} style={{ fontSize: 11, color: subTextColor }}>
                  {isHi ? 'भारत सरकार एवं राज्य कृषि योजनाएं' : 'Central & State Agri Schemes'}
                </ThemedText>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any}
                size={24}
                tintColor={subTextColor}
              />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. Interactive Input Controls (State & Land Size) */}
            <View style={[styles.inputSectionCard, { backgroundColor: cardBg, borderColor }]}>
              <ThemedText type="smallBold" style={{ color: accentEmerald, marginBottom: 8, fontSize: 13 }}>
                {isHi ? '⚙️ आपकी कृषि प्रोफ़ाइल (राज्य एवं भूमि)' : '⚙️ Your Farm Profile'}
              </ThemedText>

              {/* Land Size Acre Slider / Input */}
              <View style={styles.landInputRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 12, color: subTextColor, marginBottom: 4 }}>
                    {isHi ? 'भूमि का आकार (एकड़ में):' : 'Land Area (in Acres):'}
                  </ThemedText>
                  <View style={[styles.acreInputWrapper, { borderColor, backgroundColor: innerCardBg }]}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => {
                        const next = Math.max(0.5, landAcresNum - 0.5);
                        setLandAcresInput(String(next));
                      }}
                    >
                      <ThemedText style={{ fontSize: 18, fontWeight: '700', color: accentEmerald }}>-</ThemedText>
                    </Pressable>
                    <TextInput
                      style={[styles.acreInput, { color: textColor }]}
                      keyboardType="numeric"
                      value={landAcresInput}
                      onChangeText={setLandAcresInput}
                      placeholder="2.5"
                      placeholderTextColor={subTextColor}
                    />
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => {
                        const next = landAcresNum + 0.5;
                        setLandAcresInput(String(next));
                      }}
                    >
                      <ThemedText style={{ fontSize: 18, fontWeight: '700', color: accentEmerald }}>+</ThemedText>
                    </Pressable>
                    <ThemedText style={{ fontSize: 12, fontWeight: '600', color: subTextColor, marginRight: 8 }}>
                      {isHi ? 'एकड़' : 'Acres'}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Quick Preset Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {[0.5, 1, 2.5, 5, 10, 15].map((preset) => {
                  const isSelected = Math.abs(landAcresNum - preset) < 0.1;
                  return (
                    <Pressable
                      key={`preset-${preset}`}
                      onPress={() => handleLandPreset(preset)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isSelected ? accentEmerald : innerCardBg,
                          borderColor: isSelected ? accentEmerald : borderColor,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: isSelected ? '#FFFFFF' : textColor,
                        }}
                      >
                        {preset} {isHi ? 'एकड़' : 'Acres'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* State Selector Horizontal Scroll */}
              <ThemedText style={{ fontSize: 12, color: subTextColor, marginTop: 14, marginBottom: 6 }}>
                {isHi ? 'राज्य चुनें:' : 'Select State:'}
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {STATES_LIST.map((st) => {
                  const isSelected = selectedState === st;
                  const stLabel = st === 'All' ? (isHi ? '🇮🇳 सभी राज्य' : '🇮🇳 All India') : st;
                  return (
                    <Pressable
                      key={`state-${st}`}
                      onPress={() => setSelectedState(st)}
                      style={[
                        styles.stateChip,
                        {
                          backgroundColor: isSelected ? accentEmerald + '22' : innerCardBg,
                          borderColor: isSelected ? accentEmerald : borderColor,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? accentEmerald : textColor,
                        }}
                      >
                        {stLabel}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 2. Total Potential Savings Badge */}
            <View style={[styles.savingsBanner, { backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5', borderColor: accentEmerald + '44' }]}>
              <View style={styles.savingsHeaderRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: accentEmerald, textTransform: 'uppercase' }}>
                    {isHi ? '🎉 कुल संभावित सरकारी बचत व सब्सिडी' : '🎉 Total Potential Government Benefits'}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 24, fontWeight: '900', color: accentEmerald, marginTop: 2 }}>
                    {benefits.formattedSavingsHi}
                    <ThemedText style={{ fontSize: 13, fontWeight: '600', color: subTextColor }}>
                      {' '}/{isHi ? 'सालाना अनुमानित लाभ' : 'yr estimated value'}
                    </ThemedText>
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: textColor, marginTop: 4 }}>
                    {isHi
                      ? `आपके पास ${landAcresNum} एकड़ भूमि पर ${benefits.eligibleSchemesCount} योजनाएं उपलब्ध हैं!`
                      : `You qualify for ${benefits.eligibleSchemesCount} schemes on your ${landAcresNum} acre land!`}
                  </ThemedText>
                </View>
                <Pressable
                  style={[styles.breakdownBtn, { backgroundColor: accentEmerald }]}
                  onPress={() => setShowBreakdown(!showBreakdown)}
                >
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                    {showBreakdown ? (isHi ? 'छिपाएं' : 'Hide') : (isHi ? 'विवरण देखें' : 'Breakdown')}
                  </ThemedText>
                </Pressable>
              </View>

              {/* Itemized Savings Breakdown */}
              {showBreakdown && (
                <View style={[styles.breakdownContainer, { borderTopColor: borderColor }]}>
                  {benefits.breakDown.map((item, idx) => (
                    <View key={`bdown-${idx}`} style={styles.breakdownItemRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: textColor }}>
                          • {isHi ? item.schemeNameHi : item.schemeNameEn}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 11, color: subTextColor }}>
                          {isHi ? item.noteHi : item.noteEn}
                        </ThemedText>
                      </View>
                      <ThemedText style={{ fontSize: 13, fontWeight: '800', color: accentEmerald }}>
                        +₹{item.estimatedAmount.toLocaleString('en-IN')}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 3. Latest Scheme News Carousel / Card */}
            {schemeNews.length > 0 && (
              <View style={[styles.newsCard, { backgroundColor: cardBg, borderColor }]}>
                <Pressable
                  style={styles.newsHeader}
                  onPress={() => setShowNews(!showNews)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <ThemedText style={{ fontSize: 15 }}>📰</ThemedText>
                    <ThemedText type="smallBold" style={{ fontSize: 13, color: textColor }}>
                      {isHi ? 'ताज़ा योजना समाचार एवं अपडेट' : 'Latest Scheme News & Updates'}
                    </ThemedText>
                    {loadingNews && <ActivityIndicator size="small" color={accentEmerald} />}
                  </View>
                  <ThemedText style={{ fontSize: 12, color: accentEmerald, fontWeight: '600' }}>
                    {showNews ? (isHi ? 'बंद करें ▲' : 'Close ▲') : (isHi ? 'देखें ▼' : 'View ▼')}
                  </ThemedText>
                </Pressable>

                {showNews && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    {schemeNews.map((newsItem) => (
                      <Pressable
                        key={newsItem.id}
                        onPress={() => handleOpenLink(newsItem.url)}
                        style={[styles.newsTile, { backgroundColor: innerCardBg, borderColor }]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <ThemedText style={{ fontSize: 10, fontWeight: '700', color: accentEmerald }}>
                            {newsItem.source}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 10, color: subTextColor }}>
                            {newsItem.date}
                          </ThemedText>
                        </View>
                        <ThemedText numberOfLines={2} style={{ fontSize: 12, fontWeight: '700', color: textColor, marginBottom: 4 }}>
                          {isHi ? newsItem.titleHi : newsItem.titleEn}
                        </ThemedText>
                        <ThemedText numberOfLines={2} style={{ fontSize: 11, color: subTextColor }}>
                          {isHi ? newsItem.summaryHi : newsItem.summaryEn}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {/* 4. Live Search & Category Filter Pills */}
            <View style={styles.searchSection}>
              <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor }]}>
                <SymbolView
                  name={{ ios: 'magnifyingglass', android: 'search', web: 'search' } as any}
                  size={18}
                  tintColor={subTextColor}
                />
                <TextInput
                  style={[styles.searchInput, { color: textColor }]}
                  placeholder={isHi ? 'योजना खोजें (जैसे: पीएम किसान, सोलर, लोन)...' : 'Search schemes (e.g. PM-Kisan, Solar)...'}
                  placeholderTextColor={subTextColor}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <SymbolView
                      name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any}
                      size={18}
                      tintColor={subTextColor}
                    />
                  </Pressable>
                )}
              </View>

              {/* Category Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <Pressable
                      key={`cat-${cat.id}`}
                      onPress={() => setSelectedCategory(cat.id)}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: isSelected ? accentEmerald : cardBg,
                          borderColor: isSelected ? accentEmerald : borderColor,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? '#FFFFFF' : textColor,
                        }}
                      >
                        {isHi ? cat.nameHi : cat.nameEn}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 5. Schemes List */}
            <View style={{ marginTop: 12 }}>
              <View style={styles.listHeaderRow}>
                <ThemedText type="subtitle" style={{ fontSize: 15, fontWeight: '700', color: textColor }}>
                  {isHi ? `उपलब्ध योजनाएं (${filteredSchemes.length})` : `Available Schemes (${filteredSchemes.length})`}
                </ThemedText>
              </View>

              {filteredSchemes.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}>
                  <ThemedText style={{ fontSize: 32, marginBottom: 8 }}>🔍</ThemedText>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: textColor }}>
                    {isHi ? 'कोई योजना नहीं मिली' : 'No Schemes Found'}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: subTextColor, textAlign: 'center', marginTop: 4 }}>
                    {isHi
                      ? 'कृपया अपने खोज शब्द या राज्य/श्रेणी फ़िल्टर बदलें।'
                      : 'Try resetting your search query or changing state/category filter.'}
                  </ThemedText>
                </View>
              ) : (
                filteredSchemes.map((scheme) => (
                  <View
                    key={scheme.id}
                    style={[styles.schemeCard, { backgroundColor: cardBg, borderColor }]}
                  >
                    {/* Top Tag Row */}
                    <View style={styles.schemeTagRow}>
                      <View style={[styles.badgeTag, { backgroundColor: accentEmerald + '22', borderColor: accentEmerald + '44' }]}>
                        <ThemedText style={{ fontSize: 11, fontWeight: '800', color: accentEmerald }}>
                          {scheme.subsidyPercentage > 0 ? `${scheme.subsidyPercentage}% Subsidy` : scheme.maxBenefitAmount}
                        </ThemedText>
                      </View>

                      <View style={[styles.stateTag, { backgroundColor: innerCardBg, borderColor }]}>
                        <ThemedText style={{ fontSize: 10, fontWeight: '600', color: subTextColor }}>
                          {scheme.state === 'All' ? (isHi ? '🇮🇳 पूरे भारत' : '🇮🇳 All India') : `🏛️ ${scheme.state}`}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Scheme Name */}
                    <ThemedText type="subtitle" style={{ fontSize: 16, fontWeight: '800', color: textColor, marginTop: 8 }}>
                      {isHi ? scheme.nameHi : scheme.nameEn}
                    </ThemedText>
                    {!isHi && (
                      <ThemedText style={{ fontSize: 12, color: subTextColor, fontStyle: 'italic', marginBottom: 6 }}>
                        {scheme.nameHi}
                      </ThemedText>
                    )}

                    {/* Short Description */}
                    <ThemedText numberOfLines={3} style={{ fontSize: 12, color: subTextColor, lineHeight: 18, marginTop: 4 }}>
                      {isHi ? scheme.descriptionHi : scheme.descriptionEn}
                    </ThemedText>

                    {/* Quick Specs Pill Row */}
                    <View style={styles.specRow}>
                      <View style={[styles.specChip, { backgroundColor: innerCardBg }]}>
                        <ThemedText style={{ fontSize: 10, color: subTextColor }}>
                          {isHi ? 'अधिकतम लाभ:' : 'Max Benefit:'} <ThemedText style={{ fontWeight: '700', color: textColor }}>{scheme.maxBenefitAmount}</ThemedText>
                        </ThemedText>
                      </View>
                      <View style={[styles.specChip, { backgroundColor: innerCardBg }]}>
                        <ThemedText style={{ fontSize: 10, color: subTextColor }}>
                          {isHi ? 'हेल्पलाइन:' : 'Helpline:'} <ThemedText style={{ fontWeight: '700', color: accentEmerald }}>{scheme.helplinePhone}</ThemedText>
                        </ThemedText>
                      </View>
                    </View>

                    {/* Action Button */}
                    <Pressable
                      style={[styles.applyBtn, { backgroundColor: accentEmerald }]}
                      onPress={() => setActiveScheme(scheme)}
                    >
                      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                        {isHi ? 'विवरण एवं आवेदन प्रक्रिया देखें  ➔' : 'View Details & Apply  ➔'}
                      </ThemedText>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 6. Detailed Scheme Modal / Drawer */}
      {activeScheme && (
        <Modal
          visible={!!activeScheme}
          animationType="slide"
          transparent
          onRequestClose={() => setActiveScheme(null)}
        >
          <View style={styles.overlay}>
            <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
              {/* Detail Header Bar */}
              <View style={[styles.headerBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText type="subtitle" numberOfLines={1} style={{ fontSize: 16, color: textColor, fontWeight: '800' }}>
                    {isHi ? activeScheme.nameHi : activeScheme.nameEn}
                  </ThemedText>
                  <ThemedText type="code" style={{ fontSize: 11, color: accentEmerald, fontWeight: '700' }}>
                    {activeScheme.state === 'All' ? '🇮🇳 All India Scheme' : `🏛️ ${activeScheme.state} State Scheme`}
                  </ThemedText>
                </View>
                <Pressable onPress={() => setActiveScheme(null)} style={styles.closeBtn} hitSlop={10}>
                  <SymbolView
                    name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any}
                    size={24}
                    tintColor={subTextColor}
                  />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Benefit Summary Banner */}
                <View style={[styles.detailBanner, { backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5', borderColor: accentEmerald + '44' }]}>
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: accentEmerald }}>
                    {isHi ? '💡 योजना का मुख्य लाभ' : '💡 Key Scheme Benefit'}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 20, fontWeight: '900', color: accentEmerald, marginTop: 4 }}>
                    {activeScheme.maxBenefitAmount}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: textColor, marginTop: 6, lineHeight: 18 }}>
                    {isHi ? activeScheme.descriptionHi : activeScheme.descriptionEn}
                  </ThemedText>
                </View>

                {/* Eligibility Box */}
                <View style={[styles.detailSection, { backgroundColor: cardBg, borderColor }]}>
                  <ThemedText type="smallBold" style={{ fontSize: 14, color: textColor, marginBottom: 6 }}>
                    🎯 {isHi ? 'पात्रता (Eligibility)' : 'Eligibility Criteria'}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: subTextColor, lineHeight: 18 }}>
                    {isHi ? activeScheme.eligibilityHi : activeScheme.eligibilityEn}
                  </ThemedText>
                </View>

                {/* Required Documents Box */}
                <View style={[styles.detailSection, { backgroundColor: cardBg, borderColor }]}>
                  <ThemedText type="smallBold" style={{ fontSize: 14, color: textColor, marginBottom: 8 }}>
                    📂 {isHi ? 'आवश्यक दस्तावेज़ (Required Documents)' : 'Required Documents Checklist'}
                  </ThemedText>
                  {(isHi ? activeScheme.documentsHi : activeScheme.documentsEn).map((doc, idx) => (
                    <View key={`doc-${idx}`} style={styles.checkRow}>
                      <ThemedText style={{ fontSize: 14, color: accentEmerald, marginRight: 8 }}>✓</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: textColor, flex: 1 }}>
                        {doc}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                {/* Step-by-Step Application Guide */}
                <View style={[styles.detailSection, { backgroundColor: cardBg, borderColor }]}>
                  <ThemedText type="smallBold" style={{ fontSize: 14, color: textColor, marginBottom: 8 }}>
                    📝 {isHi ? 'आवेदन करने की प्रक्रिया (Step-by-Step Guide)' : 'Application Steps'}
                  </ThemedText>
                  {(isHi ? activeScheme.stepsHi : activeScheme.stepsEn).map((step, idx) => (
                    <View key={`step-${idx}`} style={styles.stepRow}>
                      <ThemedText style={{ fontSize: 12, color: textColor, lineHeight: 18 }}>
                        {step}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                {/* Bottom Direct Action Buttons Bar */}
                <View style={styles.actionButtonBar}>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: accentEmerald }]}
                    onPress={() => handleOpenLink(activeScheme.officialUrl)}
                  >
                    <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                      🌐 {isHi ? 'आधिकारिक पोर्टल पर जाएं' : 'Official Portal'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: isDarkMode ? '#27272A' : '#E2E8F0' }]}
                    onPress={() => handleDialHelpline(activeScheme.helplinePhone)}
                  >
                    <ThemedText style={{ fontSize: 13, fontWeight: '700', color: textColor }}>
                      📞 {isHi ? `हेल्पलाइन: ${activeScheme.helplinePhone}` : `Call: ${activeScheme.helplinePhone}`}
                    </ThemedText>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 10,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputSectionCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  landInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acreInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 4,
  },
  stepBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acreInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 6,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  stateChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  savingsBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  savingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  breakdownBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  breakdownContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  breakdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newsCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newsTile: {
    width: 260,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 10,
  },
  searchSection: {
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    paddingVertical: 4,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  listHeaderRow: {
    marginBottom: 10,
  },
  emptyCard: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schemeCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  schemeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  stateTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  specChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  applyBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  detailSection: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  stepRow: {
    marginBottom: 8,
  },
  actionButtonBar: {
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GovSchemesModal;
