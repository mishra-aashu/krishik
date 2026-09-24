import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Alert,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/context/language-context';
import { MaxContentWidth } from '@/constants/theme';
import { SelectionModal } from '@/components/selection-modal';
import {
  filterSchemes,
  calculateEligibleBenefits,
  fetchLatestSchemeNews,
  type GovScheme,
  type SchemeNewsItem,
  type BenefitCalculation,
} from '@/services/gov-schemes-service';

const ALL_INDIAN_STATES = [
  'All',
  'Bihar',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Maharashtra',
  'Rajasthan',
  'Gujarat',
  'Punjab',
  'Haryana',
  'Karnataka',
  'Andhra Pradesh',
  'West Bengal',
  'Tamil Nadu',
  'Telangana',
  'Odisha',
  'Kerala',
  'Jharkhand',
  'Chhattisgarh',
  'Assam',
];

const QUICK_STATES = [
  'All',
  'Bihar',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Maharashtra',
  'Rajasthan',
];

interface GovSchemesViewProps {
  onBack?: () => void;
  embeddedInTab?: boolean;
}

export function GovSchemesView({ onBack, embeddedInTab = false }: GovSchemesViewProps) {
  const theme = useTheme();
  const { isHi } = useLanguage();

  // State & Filter states
  const [selectedState, setSelectedState] = useState<string>('All');
  const [isStateModalOpen, setIsStateModalOpen] = useState<boolean>(false);
  const [landAcresInput, setLandAcresInput] = useState<string>('2.5');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Scheme detail modal state
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
    loadNews();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories: Array<{ id: string; nameHi: string; nameEn: string; iconSymbol: any }> = [
    {
      id: 'all',
      nameHi: 'सभी योजनाएं',
      nameEn: 'All Schemes',
      iconSymbol: { ios: 'globe', android: 'language', web: 'language' },
    },
    {
      id: 'dbt',
      nameHi: 'डीबीटी नकद',
      nameEn: 'DBT Cash',
      iconSymbol: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
    },
    {
      id: 'solar',
      nameHi: 'सोलर पंप',
      nameEn: 'Solar Pump',
      iconSymbol: { ios: 'sun.max.fill', android: 'wb_sunny', web: 'wb_sunny' },
    },
    {
      id: 'machinery',
      nameHi: 'कृषि यंत्र',
      nameEn: 'Machinery',
      iconSymbol: { ios: 'gearshape.2.fill', android: 'precision_manufacturing', web: 'precision_manufacturing' },
    },
    {
      id: 'irrigation',
      nameHi: 'सिंचाई',
      nameEn: 'Irrigation',
      iconSymbol: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
    },
    {
      id: 'loan',
      nameHi: 'कम ब्याज ऋण',
      nameEn: 'Low Loan',
      iconSymbol: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
    },
    {
      id: 'insurance',
      nameHi: 'फसल बीमा',
      nameEn: 'Crop Insurance',
      iconSymbol: { ios: 'shield.fill', android: 'verified_user', web: 'verified_user' },
    },
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
        isHi ? `हेल्पलाइन नंबर: ${phone}` : `Helpline Number: ${phone}`
      );
    }
  };

  // Brand emerald green for active buttons/chips
  const activeGreen = '#059669';

  return (
    <View style={styles.container}>
      {/* Navigation Header if not embedded */}
      {!embeddedInTab && onBack && (
        <View
          style={[
            styles.header,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}
        >
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: theme.background },
              pressed && { opacity: 0.7 },
            ]}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any}
              size={20}
              tintColor={theme.text}
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
              {isHi ? 'सरकारी योजनाएं एवं सब्सिडी' : 'PM-Kisan & Subsidy Finder'}
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {isHi
                ? `${benefits.currentSeasonHi} • FY ${benefits.fiscalYear}`
                : `${benefits.currentSeasonEn} • FY ${benefits.fiscalYear}`}
            </ThemedText>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.maxContainer, { maxWidth: MaxContentWidth }]}>
          {/* Dynamic Benefit Hero Banner */}
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={[
              styles.heroBanner,
              {
                backgroundColor: theme.dark ? '#042F1A' : '#ECFDF5',
                borderColor: '#10B981',
              },
            ]}
          >
            <View style={styles.heroHeader}>
              <View style={[styles.heroBadge, { backgroundColor: activeGreen }]}>
                <SymbolView
                  name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                  size={12}
                  tintColor="#FFFFFF"
                />
                <ThemedText style={styles.heroBadgeText}>
                  {isHi ? 'अनुमानित वार्षिक लाभ' : 'Est. Yearly Benefit'}
                </ThemedText>
              </View>

              <Pressable
                onPress={() => setShowBreakdown(!showBreakdown)}
                style={styles.breakdownToggleBtn}
              >
                <ThemedText style={[styles.breakdownToggleText, { color: theme.dark ? '#34D399' : activeGreen }]}>
                  {showBreakdown
                    ? isHi ? 'छिपाएं ▲' : 'Hide ▲'
                    : isHi ? 'विवरण देखें ▼' : 'Details ▼'}
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.heroAmountRow}>
              <ThemedText style={[styles.heroAmount, { color: theme.dark ? '#34D399' : '#047857' }]}>
                {benefits.formattedSavingsHi}
              </ThemedText>

              <View style={styles.heroInfoColumn}>
                <ThemedText style={[styles.heroInfoText, { color: theme.text }]}>
                  {isHi
                    ? `${benefits.eligibleSchemesCount} योजनाएं पात्र हैं`
                    : `${benefits.eligibleSchemesCount} Schemes Available`}
                </ThemedText>
                <ThemedText style={[styles.heroSubText, { color: theme.textSecondary }]}>
                  {isHi
                    ? `${landAcresNum} एकड़ zameen (${selectedState === 'All' ? 'सभी राज्य' : selectedState})`
                    : `${landAcresNum} acres land in ${selectedState}`}
                </ThemedText>
              </View>
            </View>

            {/* Itemized Benefit Breakdown Toggleable */}
            {showBreakdown && (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={[
                  styles.breakdownContainer,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.iconHeadingRow}>
                  <SymbolView
                    name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' } as any}
                    size={14}
                    tintColor={activeGreen}
                  />
                  <ThemedText style={[styles.breakdownTitle, { color: theme.text }]}>
                    {isHi ? 'योजनावार अनुमानित सब्सिडी breakdown:' : 'Scheme-wise Estimated Subsidy:'}
                  </ThemedText>
                </View>

                {benefits.breakDown.map((item, idx) => (
                  <View
                    key={item.schemeId + idx}
                    style={[
                      styles.breakdownItemRow,
                      idx < benefits.breakDown.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.breakdownItemName, { color: theme.text }]}>
                        {isHi ? item.schemeNameHi : item.schemeNameEn}
                      </ThemedText>
                      <ThemedText style={[styles.breakdownItemNote, { color: theme.textSecondary }]}>
                        {isHi ? item.noteHi : item.noteEn}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.breakdownItemAmount, { color: activeGreen }]}>
                      +₹{item.estimatedAmount.toLocaleString('en-IN')}
                    </ThemedText>
                  </View>
                ))}
              </Animated.View>
            )}
          </Animated.View>

          {/* Land Acreage & State Controls Box */}
          <View
            style={[
              styles.controlsCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.iconHeadingRow}>
              <SymbolView
                name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' } as any}
                size={16}
                tintColor={activeGreen}
              />
              <ThemedText style={[styles.controlSectionLabel, { color: theme.text }]}>
                {isHi ? 'अपनी प्रोफाइल के अनुसार फ़िल्टर करें:' : 'Filter by Farm Profile:'}
              </ThemedText>
            </View>

            {/* State Selection Dropdown Button Trigger */}
            <Pressable
              onPress={() => setIsStateModalOpen(true)}
              style={({ pressed }) => [
                styles.stateDropdownBtn,
                {
                  backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderColor: activeGreen,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.stateDropdownLeft}>
                <SymbolView
                  name={{ ios: 'map.fill', android: 'location_on', web: 'location_on' } as any}
                  size={20}
                  tintColor={activeGreen}
                />
                <View>
                  <ThemedText style={[styles.stateDropdownLabel, { color: theme.textSecondary }]}>
                    {isHi ? 'चुना गया राज्य (State Filter):' : 'Selected State:'}
                  </ThemedText>
                  <ThemedText style={[styles.stateDropdownValue, { color: theme.text }]}>
                    {selectedState === 'All'
                      ? isHi ? '🌐 सभी राज्य (All India Schemes)' : '🌐 All States (Central Schemes)'
                      : selectedState}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.stateDropdownRightBadge, { backgroundColor: activeGreen }]}>
                <ThemedText style={styles.stateDropdownRightBadgeText}>
                  {isHi ? 'राज्य बदलें ▾' : 'Select State ▾'}
                </ThemedText>
              </View>
            </Pressable>

            {/* Quick State Pills Row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.stateScrollView}
              contentContainerStyle={styles.stateScrollContent}
            >
              {QUICK_STATES.map((st) => {
                const active = selectedState === st;
                return (
                  <Pressable
                    key={st}
                    onPress={() => setSelectedState(st)}
                    style={[
                      styles.stateChip,
                      {
                        backgroundColor: active
                          ? activeGreen
                          : theme.dark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.05)',
                        borderColor: active ? activeGreen : theme.border,
                      },
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'globe', android: 'language', web: 'language' } as any}
                      size={13}
                      tintColor={active ? '#FFFFFF' : theme.textSecondary}
                    />
                    <ThemedText
                      style={[
                        styles.stateChipText,
                        { color: active ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {st === 'All' ? (isHi ? 'सभी राज्य' : 'All States') : st}
                    </ThemedText>
                  </Pressable>
                );
              })}

              {/* More States Button */}
              <Pressable
                onPress={() => setIsStateModalOpen(true)}
                style={[
                  styles.stateChip,
                  {
                    backgroundColor: theme.dark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5',
                    borderColor: activeGreen,
                  },
                ]}
              >
                <SymbolView
                  name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' } as any}
                  size={13}
                  tintColor={activeGreen}
                />
                <ThemedText style={[styles.stateChipText, { color: activeGreen, fontWeight: '700' }]}>
                  {isHi ? '+ अन्य राज्य...' : '+ More States...'}
                </ThemedText>
              </Pressable>
            </ScrollView>

            {/* Land Acreage Input & Preset Buttons */}
            <View style={styles.acreageRow}>
              <View style={styles.acreageInputWrapper}>
                <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  {isHi ? 'आपकी ज़मीन (एकड़):' : 'Land Acreage (Acres):'}
                </ThemedText>
                <View
                  style={[
                    styles.acreageInputContainer,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    style={[styles.acreageInput, { color: theme.text }]}
                    keyboardType="numeric"
                    value={landAcresInput}
                    onChangeText={(val) => setLandAcresInput(val.replace(/[^0-9.]/g, ''))}
                    placeholder="2.5"
                    placeholderTextColor={theme.textSecondary}
                  />
                  <ThemedText style={[styles.acreUnit, { color: theme.textSecondary }]}>
                    {isHi ? 'एकड़' : 'Acres'}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.presetButtonsWrapper}>
                <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  {isHi ? 'त्वरित चयन:' : 'Quick Selection:'}
                </ThemedText>
                <View style={styles.presetRow}>
                  {['1', '2', '5', '10'].map((ac) => {
                    const activePreset = landAcresInput === ac;
                    return (
                      <Pressable
                        key={ac}
                        onPress={() => setLandAcresInput(ac)}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: activePreset
                              ? activeGreen
                              : theme.dark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.05)',
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.presetChipText,
                            { color: activePreset ? '#FFFFFF' : theme.text },
                          ]}
                        >
                          {ac} {isHi ? 'एकड़' : 'Ac'}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Search Input Bar */}
          <View
            style={[
              styles.searchCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' } as any}
              size={18}
              tintColor={theme.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={
                isHi
                  ? 'योजना का नाम, सोलर पंप, ट्रैक्टर या लोन खोजें...'
                  : 'Search scheme, solar pump, tractor, loan...'
              }
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any}
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollView}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active ? activeGreen : theme.card,
                      borderColor: active ? activeGreen : theme.border,
                    },
                  ]}
                >
                  <SymbolView
                    name={cat.iconSymbol}
                    size={14}
                    tintColor={active ? '#FFFFFF' : theme.dark ? '#A1A1AA' : activeGreen}
                  />
                  <ThemedText
                    style={[
                      styles.categoryChipText,
                      { color: active ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {isHi ? cat.nameHi : cat.nameEn}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Schemes Count & Section Header */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconHeadingRow}>
              <SymbolView
                name={{ ios: 'list.bullet.rectangle.fill', android: 'view_list', web: 'view_list' } as any}
                size={16}
                tintColor={activeGreen}
              />
              <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                {isHi ? 'उपलब्ध सरकारी योजनाएं' : 'Available Government Schemes'}
              </ThemedText>
            </View>
            <View style={[styles.countBadge, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
              <ThemedText style={[styles.sectionBadgeText, { color: activeGreen }]}>
                {filteredSchemes.length} {isHi ? 'योजनाएं' : 'Schemes'}
              </ThemedText>
            </View>
          </View>

          {/* Empty State if no schemes found */}
          {filteredSchemes.length === 0 && (
            <View
              style={[
                styles.emptyStateCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <SymbolView
                name={{ ios: 'magnifyingglass.circle.fill', android: 'search_off', web: 'search_off' } as any}
                size={36}
                tintColor={theme.textSecondary}
              />
              <ThemedText style={[styles.emptyStateTitle, { color: theme.text, marginTop: 8 }]}>
                {isHi ? 'कोई योजना नहीं मिली' : 'No Schemes Found'}
              </ThemedText>
              <ThemedText style={[styles.emptyStateSub, { color: theme.textSecondary }]}>
                {isHi
                  ? 'कृपया अपने खोज शब्द या राज्य फ़िल्टर को बदल कर देखें।'
                  : 'Try changing your search term or state filter.'}
              </ThemedText>
              <Pressable
                onPress={() => {
                  setSelectedState('All');
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                style={[styles.resetFilterBtn, { backgroundColor: activeGreen }]}
              >
                <ThemedText style={styles.resetFilterBtnText}>
                  {isHi ? 'फ़िल्टर रिसेट करें' : 'Reset Filters'}
                </ThemedText>
              </Pressable>
            </View>
          )}

          {/* Schemes List */}
          {filteredSchemes.map((scheme, idx) => (
            <Animated.View
              key={scheme.id}
              entering={FadeInDown.delay(idx * 50).duration(250)}
              style={[
                styles.schemeCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.schemeCardHeader}>
                <View style={styles.schemeCategoryTagRow}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: 'rgba(5, 150, 105, 0.12)' },
                    ]}
                  >
                    <ThemedText style={[styles.categoryBadgeText, { color: activeGreen }]}>
                      {scheme.category.toUpperCase()}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.stateBadge,
                      {
                        backgroundColor:
                          scheme.state === 'All'
                            ? 'rgba(59, 130, 246, 0.12)'
                            : 'rgba(245, 158, 11, 0.12)',
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.stateBadgeText,
                        {
                          color: scheme.state === 'All' ? '#2563EB' : '#D97706',
                        },
                      ]}
                    >
                      {scheme.state === 'All' ? (isHi ? 'केंद्र सरकार' : 'Central') : scheme.state}
                    </ThemedText>
                  </View>
                </View>

                <View
                  style={[
                    styles.subsidyBadge,
                    { backgroundColor: theme.dark ? '#064E3B' : '#DCFCE7' },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.subsidyBadgeText,
                      { color: theme.dark ? '#34D399' : '#047857' },
                    ]}
                  >
                    {scheme.maxBenefitAmount}
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={[styles.schemeTitle, { color: theme.text }]}>
                {isHi ? scheme.nameHi : scheme.nameEn}
              </ThemedText>

              <ThemedText
                numberOfLines={2}
                style={[styles.schemeDescription, { color: theme.textSecondary }]}
              >
                {isHi ? scheme.descriptionHi : scheme.descriptionEn}
              </ThemedText>

              {/* Quick Info Bar */}
              <View
                style={[
                  styles.schemeMetaBar,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <View style={styles.metaItem}>
                  <ThemedText style={[styles.metaLabel, { color: theme.textSecondary }]}>
                    {isHi ? 'पात्रता:' : 'Eligibility:'}
                  </ThemedText>
                  <ThemedText style={[styles.metaValue, { color: theme.text }]}>
                    {scheme.maxLandAcres >= 99
                      ? isHi ? 'सभी किसान' : 'All Farmers'
                      : isHi ? `${scheme.maxLandAcres} एकड़ तक` : `Up to ${scheme.maxLandAcres} Acres`}
                  </ThemedText>
                </View>

                <View style={styles.metaDivider} />

                <View style={styles.metaItem}>
                  <ThemedText style={[styles.metaLabel, { color: theme.textSecondary }]}>
                    {isHi ? 'सरकारी सब्सिडी:' : 'Subsidy:'}
                  </ThemedText>
                  <ThemedText style={[styles.metaValue, { color: activeGreen }]}>
                    {scheme.subsidyPercentage}%
                  </ThemedText>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.schemeActionRow}>
                <Pressable
                  onPress={() => setActiveScheme(scheme)}
                  style={({ pressed }) => [
                    styles.detailsButton,
                    { backgroundColor: activeGreen },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'doc.text.fill', android: 'description', web: 'description' } as any}
                    size={14}
                    tintColor="#FFFFFF"
                  />
                  <ThemedText style={styles.detailsButtonText}>
                    {isHi ? 'विस्तृत आवेदन गाइड' : 'Full Guide & Apply'}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => handleDialHelpline(scheme.helplinePhone)}
                  style={({ pressed }) => [
                    styles.helplineButton,
                    { borderColor: activeGreen, backgroundColor: theme.card },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'phone.fill', android: 'call', web: 'call' } as any}
                    size={13}
                    tintColor={activeGreen}
                  />
                  <ThemedText style={[styles.helplineButtonText, { color: activeGreen }]}>
                    {scheme.helplinePhone}
                  </ThemedText>
                </Pressable>
              </View>
            </Animated.View>
          ))}

          {/* Live Scheme News Bulletin Section */}
          <View style={styles.newsSectionContainer}>
            <Pressable
              onPress={() => setShowNews(!showNews)}
              style={styles.newsHeaderRow}
            >
              <View style={styles.iconHeadingRow}>
                <SymbolView
                  name={{ ios: 'newspaper.fill', android: 'newspaper', web: 'newspaper' } as any}
                  size={16}
                  tintColor={activeGreen}
                />
                <ThemedText style={[styles.newsSectionTitle, { color: theme.text }]}>
                  {isHi ? 'योजनाएं लाइव अपडेट (News Bulletins)' : 'Schemes Live Bulletins'}
                </ThemedText>
              </View>
              <ThemedText style={[styles.newsToggleText, { color: activeGreen }]}>
                {showNews ? (isHi ? 'छिपाएं ▲' : 'Hide ▲') : (isHi ? 'देखें ▼' : 'Show ▼')}
              </ThemedText>
            </Pressable>

            {showNews && (
              <View style={{ marginTop: 8 }}>
                {loadingNews ? (
                  <ActivityIndicator size="small" color={activeGreen} style={{ marginVertical: 16 }} />
                ) : (
                  schemeNews.map((news) => (
                    <Pressable
                      key={news.id}
                      onPress={() => handleOpenLink(news.url)}
                      style={({ pressed }) => [
                        styles.newsCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <View style={styles.newsMetaHeader}>
                        <ThemedText style={[styles.newsSource, { color: activeGreen }]}>
                          {news.source}
                        </ThemedText>
                        <ThemedText style={[styles.newsDate, { color: theme.textSecondary }]}>
                          {news.date}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.newsTitle, { color: theme.text }]}>
                        {isHi ? news.titleHi : news.titleEn}
                      </ThemedText>
                      <ThemedText style={[styles.newsSummary, { color: theme.textSecondary }]}>
                        {isHi ? news.summaryHi : news.summaryEn}
                      </ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <ThemedText style={[styles.newsReadMore, { color: activeGreen }]}>
                          {isHi ? 'अधिकारिक सूचना पढ़ें' : 'Read Official Notification'}
                        </ThemedText>
                        <SymbolView
                          name={{ ios: 'arrow.up.right.square.fill', android: 'open_in_new', web: 'open_in_new' } as any}
                          size={12}
                          tintColor={activeGreen}
                        />
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* State Selection Modal Popup */}
      <SelectionModal
        visible={isStateModalOpen}
        title={isHi ? 'राज्य का चयन करें (Select State)' : 'Select State'}
        placeholder={isHi ? 'राज्य का नाम खोजें...' : 'Search state name...'}
        list={ALL_INDIAN_STATES}
        selectedValue={selectedState}
        onSelect={(st) => {
          setSelectedState(st);
          setIsStateModalOpen(false);
        }}
        onClose={() => setIsStateModalOpen(false)}
      />

      {/* Scheme Detail Bottom Sheet Modal */}
      {activeScheme && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setActiveScheme(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                    {isHi ? activeScheme.nameHi : activeScheme.nameEn}
                  </ThemedText>
                  <ThemedText style={[styles.modalSub, { color: activeGreen }]}>
                    {activeScheme.maxBenefitAmount} ({activeScheme.subsidyPercentage}% Subsidy)
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => setActiveScheme(null)}
                  style={[styles.closeModalBtn, { backgroundColor: theme.background }]}
                >
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'close' } as any}
                    size={18}
                    tintColor={theme.text}
                  />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Description */}
                <View style={styles.detailSection}>
                  <View style={styles.iconHeadingRow}>
                    <SymbolView
                      name={{ ios: 'info.circle.fill', android: 'info', web: 'info' } as any}
                      size={16}
                      tintColor={activeGreen}
                    />
                    <ThemedText style={[styles.detailSectionTitle, { color: theme.text }]}>
                      {isHi ? 'योजना विवरण (Overview)' : 'Overview'}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                    {isHi ? activeScheme.descriptionHi : activeScheme.descriptionEn}
                  </ThemedText>
                </View>

                {/* Eligibility */}
                <View style={styles.detailSection}>
                  <View style={styles.iconHeadingRow}>
                    <SymbolView
                      name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' } as any}
                      size={16}
                      tintColor={activeGreen}
                    />
                    <ThemedText style={[styles.detailSectionTitle, { color: theme.text }]}>
                      {isHi ? 'पात्रता (Eligibility Rules)' : 'Eligibility'}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                    {isHi ? activeScheme.eligibilityHi : activeScheme.eligibilityEn}
                  </ThemedText>
                </View>

                {/* Required Documents */}
                <View style={styles.detailSection}>
                  <View style={styles.iconHeadingRow}>
                    <SymbolView
                      name={{ ios: 'folder.fill', android: 'folder', web: 'folder' } as any}
                      size={16}
                      tintColor={activeGreen}
                    />
                    <ThemedText style={[styles.detailSectionTitle, { color: theme.text }]}>
                      {isHi ? 'आवश्यक दस्तावेज (Documents Required)' : 'Documents Required'}
                    </ThemedText>
                  </View>
                  {(isHi ? activeScheme.documentsHi : activeScheme.documentsEn).map((doc, idx) => (
                    <View key={idx} style={styles.bulletRow}>
                      <SymbolView
                        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as any}
                        size={14}
                        tintColor={activeGreen}
                      />
                      <ThemedText style={[styles.bulletText, { color: theme.text }]}>
                        {doc}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                {/* Step by Step Guide */}
                <View style={styles.detailSection}>
                  <View style={styles.iconHeadingRow}>
                    <SymbolView
                      name={{ ios: 'list.number', android: 'format_list_numbered', web: 'format_list_numbered' } as any}
                      size={16}
                      tintColor={activeGreen}
                    />
                    <ThemedText style={[styles.detailSectionTitle, { color: theme.text }]}>
                      {isHi ? 'आवेदन प्रक्रिया (Step-by-Step Guide)' : 'How to Apply'}
                    </ThemedText>
                  </View>
                  {(isHi ? activeScheme.stepsHi : activeScheme.stepsEn).map((step, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <View style={[styles.stepNumberBadge, { backgroundColor: activeGreen }]}>
                        <ThemedText style={styles.stepNumberText}>{idx + 1}</ThemedText>
                      </View>
                      <ThemedText style={[styles.stepText, { color: theme.text, flex: 1 }]}>
                        {step}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Modal Footer Actions */}
              <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                <Pressable
                  onPress={() => handleDialHelpline(activeScheme.helplinePhone)}
                  style={[styles.footerCallBtn, { borderColor: activeGreen }]}
                >
                  <SymbolView
                    name={{ ios: 'phone.fill', android: 'call', web: 'call' } as any}
                    size={15}
                    tintColor={activeGreen}
                  />
                  <ThemedText style={[styles.footerCallText, { color: activeGreen }]}>
                    {isHi ? '1-क्लिक कॉल' : 'Helpline'}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => handleOpenLink(activeScheme.officialUrl)}
                  style={[styles.footerApplyBtn, { backgroundColor: activeGreen }]}
                >
                  <ThemedText style={styles.footerApplyText}>
                    {isHi ? 'अधिकारिक पोर्टल पर जाएं' : 'Official Portal'}
                  </ThemedText>
                  <SymbolView
                    name={{ ios: 'arrow.up.right', android: 'open_in_new', web: 'open_in_new' } as any}
                    size={14}
                    tintColor="#FFFFFF"
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  maxContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  heroBanner: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  breakdownToggleBtn: {
    padding: 4,
  },
  breakdownToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '800',
  },
  heroInfoColumn: {
    flex: 1,
    minWidth: 160,
  },
  heroInfoText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  breakdownContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownItemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownItemNote: {
    fontSize: 11,
    marginTop: 2,
  },
  breakdownItemAmount: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  controlsCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  iconHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  controlSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  stateDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginVertical: 8,
  },
  stateDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stateDropdownLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  stateDropdownValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  stateDropdownRightBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  stateDropdownRightBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stateScrollView: {
    marginBottom: 10,
    marginTop: 4,
  },
  stateScrollContent: {
    gap: 8,
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  stateChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  acreageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  acreageInputWrapper: {
    flex: 1,
    minWidth: 130,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  acreageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  acreageInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    padding: 0,
  },
  acreUnit: {
    fontSize: 11,
    marginLeft: 4,
  },
  presetButtonsWrapper: {
    flex: 1,
    minWidth: 150,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    padding: 0,
  },
  categoryScrollView: {
    marginBottom: 14,
  },
  categoryScrollContent: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyStateCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
  },
  resetFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  schemeCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  schemeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  schemeCategoryTagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subsidyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subsidyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  schemeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  schemeDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  schemeMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 8,
  },
  schemeActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  helplineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  helplineButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  newsSectionContainer: {
    marginTop: 12,
  },
  newsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  newsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  newsToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  newsCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  newsMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  newsSource: {
    fontSize: 11,
    fontWeight: '700',
  },
  newsDate: {
    fontSize: 11,
  },
  newsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  newsSummary: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  newsReadMore: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '88%',
    minHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  closeModalBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 14,
  },
  detailSection: {
    marginBottom: 14,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bulletText: {
    fontSize: 12,
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 8,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 12,
    lineHeight: 17,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  footerCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  footerCallText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footerApplyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  footerApplyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
