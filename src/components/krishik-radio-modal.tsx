import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { useTheme } from '../hooks/use-theme';
import { Colors } from '../constants/theme';
import { useLanguage } from '../context/language-context';
import {
  INITIAL_RADIO_STATIONS,
  DEFAULT_AI_STATION,
  RadioStation,
  radioService,
  fetchLiveIndianRadioStations,
  searchRadioBrowserStations,
} from '../services/radio-service';

interface KrishikRadioModalProps {
  visible: boolean;
  onClose: () => void;
  weatherContext?: { temp?: number; state?: string; crop?: string };
}

export const KrishikRadioModal: React.FC<KrishikRadioModalProps> = ({
  visible,
  onClose,
  weatherContext,
}) => {
  const theme = useTheme() || Colors.dark;
  const { language } = useLanguage();

  const [stations, setStations] = useState<RadioStation[]>(INITIAL_RADIO_STATIONS);
  const [activeStation, setActiveStation] = useState<RadioStation>(DEFAULT_AI_STATION);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingStations, setIsFetchingStations] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setIsFetchingStations(true);
      fetchLiveIndianRadioStations()
        .then((fetched) => {
          if (fetched && fetched.length > 0) {
            setStations(fetched);
          }
        })
        .finally(() => {
          setIsFetchingStations(false);
        });
    }
  }, [visible]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsFetchingStations(true);
    searchRadioBrowserStations(query)
      .then((results) => {
        if (results && results.length > 0) {
          setStations(results);
        }
      })
      .finally(() => {
        setIsFetchingStations(false);
      });
  };

  // Dynamic 5-bar VU Equalizer Animation
  const eq1 = useSharedValue(4);
  const eq2 = useSharedValue(10);
  const eq3 = useSharedValue(6);
  const eq4 = useSharedValue(14);
  const eq5 = useSharedValue(8);

  useEffect(() => {
    if (isPlaying) {
      eq1.value = withRepeat(withTiming(16, { duration: 350, easing: Easing.ease }), -1, true);
      eq2.value = withRepeat(withTiming(5, { duration: 480, easing: Easing.ease }), -1, true);
      eq3.value = withRepeat(withTiming(18, { duration: 300, easing: Easing.ease }), -1, true);
      eq4.value = withRepeat(withTiming(6, { duration: 420, easing: Easing.ease }), -1, true);
      eq5.value = withRepeat(withTiming(15, { duration: 360, easing: Easing.ease }), -1, true);
    } else {
      eq1.value = withTiming(4);
      eq2.value = withTiming(4);
      eq3.value = withTiming(4);
      eq4.value = withTiming(4);
      eq5.value = withTiming(4);
    }
  }, [isPlaying]);

  const styleEq1 = useAnimatedStyle(() => ({ height: eq1.value }));
  const styleEq2 = useAnimatedStyle(() => ({ height: eq2.value }));
  const styleEq3 = useAnimatedStyle(() => ({ height: eq3.value }));
  const styleEq4 = useAnimatedStyle(() => ({ height: eq4.value }));
  const styleEq5 = useAnimatedStyle(() => ({ height: eq5.value }));

  const handleTogglePlay = async (station: RadioStation) => {
    if (activeStation.id === station.id && isPlaying) {
      await radioService.stopCurrent();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setActiveStation(station);

    const success = await radioService.playStation(
      station,
      weatherContext,
      language,
      (playing, stationId) => {
        setIsPlaying(playing);
        if (stationId) {
          const found = stations.find((s) => s.id === stationId);
          if (found) setActiveStation(found);
        }
      }
    );

    setIsLoading(false);
    if (!success) {
      setIsPlaying(false);
    }
  };

  const handleClose = async () => {
    await radioService.stopCurrent();
    setIsPlaying(false);
    onClose();
  };

  if (!visible) return null;

  const isDarkMode = theme.dark !== false;
  const pageBg = isDarkMode ? '#0B0F19' : '#F0F9FF';
  const cyanAccent = '#0EA5E9';
  const sapphireBlue = '#2563EB';

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.fullScreenContainer, { backgroundColor: pageBg }]}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.mainContentPadding}>
            {/* Top Compact Header Bar */}
            <View style={[styles.headerRow, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : theme.border }]}>
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.7}
                style={[styles.backBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : theme.backgroundElement }]}
              >
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any}
                  size={16}
                  tintColor={theme.text}
                />
              </TouchableOpacity>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: '800', color: theme.text }}>
                    {language === 'hi' ? 'किसान रेडियो ट्रांसिस्टर' : 'Krishik FM Transistor'}
                  </ThemedText>
                  {isPlaying && (
                    <View style={styles.headerLivePulse}>
                      <View style={styles.headerLiveDot} />
                    </View>
                  )}
                </View>
                <ThemedText style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '600' }}>
                  {language === 'hi' ? 'कृषि सलाह, मौसम व समाचार बुलेटिन' : 'Live Agricultural Audio Bulletins'}
                </ThemedText>
              </View>

              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.7}
                style={[styles.closeBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : theme.backgroundElement }]}
              >
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' } as any}
                  size={14}
                  tintColor={theme.text}
                />
              </TouchableOpacity>
            </View>

            {/* ELECTRIC SAPPHIRE & CYAN FM STEREO TRANSISTOR DECK */}
            <View style={styles.transistorDeckContainer}>
              {/* Left/Center LED Display Screen */}
              <View style={styles.transistorLedScreen}>
                {/* Top Row: Frequency Digital Pill + Station Title + VU Equalizer */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    {/* Glowing Digital Frequency Cyan Pill */}
                    <View style={styles.digitalFreqBadge}>
                      <ThemedText style={styles.digitalFreqText}>
                        {activeStation.frequency}
                      </ThemedText>
                    </View>

                    <ThemedText numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: '#F0F9FF', flex: 1 }}>
                      {language === 'hi' ? activeStation.nameHi : activeStation.nameEn}
                    </ThemedText>
                  </View>

                  {/* VU Equalizer Meter */}
                  <View style={styles.vuMeterContainer}>
                    <Animated.View style={[styles.vuBar, styleEq1]} />
                    <Animated.View style={[styles.vuBar, styleEq2]} />
                    <Animated.View style={[styles.vuBar, styleEq3]} />
                    <Animated.View style={[styles.vuBar, styleEq4]} />
                    <Animated.View style={[styles.vuBar, styleEq5]} />
                  </View>
                </View>

                {/* Inline Compact Cyan FM Frequency Tuner Ruler */}
                <View style={styles.inlineRulerBox}>
                  <View style={styles.rulerTicksRow}>
                    {[88, 92, 96, 100, 104, 108].map((freq) => {
                      const isActive = Math.abs(activeStation.freqMHz - freq) < 2.5;
                      return (
                        <View key={freq} style={{ alignItems: 'center' }}>
                          <View
                            style={[
                              styles.rulerTickLine,
                              {
                                backgroundColor: isActive ? '#38BDF8' : 'rgba(56, 189, 248, 0.3)',
                                height: isActive ? 8 : 4,
                                width: isActive ? 2 : 1,
                              },
                            ]}
                          />
                          <ThemedText
                            style={{
                              fontSize: 8,
                              fontWeight: isActive ? '800' : '600',
                              color: isActive ? '#38BDF8' : 'rgba(125, 211, 252, 0.5)',
                            }}
                          >
                            {freq}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                  {/* Tuner Pointer Needle Line */}
                  <View style={styles.rulerNeedleLine} />
                </View>

                {/* Region / Status Sub-line */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                  <ThemedText numberOfLines={1} style={{ fontSize: 9.5, color: '#7DD3FC', fontWeight: '500', flex: 1 }}>
                    {language === 'hi' ? activeStation.regionHi : activeStation.regionEn}
                  </ThemedText>

                  {isPlaying && (
                    <View style={styles.transistorLiveBadge}>
                      <View style={styles.transistorLiveDot} />
                      <ThemedText style={{ color: '#EF4444', fontSize: 8.5, fontWeight: '800' }}>
                        LIVE FM
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>

              {/* Right Side Round Electric Sapphire / Cyan Play Knob */}
              <TouchableOpacity
                onPress={() => handleTogglePlay(activeStation)}
                disabled={isLoading}
                activeOpacity={0.8}
                style={[
                  styles.radioControlKnob,
                  {
                    backgroundColor: isPlaying ? sapphireBlue : cyanAccent,
                    borderColor: isPlaying ? '#60A5FA' : '#38BDF8',
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <SymbolView
                    name={{
                      ios: isPlaying ? 'pause.fill' : 'play.fill',
                      android: isPlaying ? 'pause' : 'play_arrow',
                      web: isPlaying ? 'pause' : 'play_arrow',
                    } as any}
                    size={18}
                    tintColor="#FFFFFF"
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Station Channel Selector Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 6 }}>
              <ThemedText style={{ fontSize: 13, fontWeight: '800', color: theme.text }}>
                {language === 'hi' ? 'रेडियो चैनल सूची' : 'FM Radio Channels'}
              </ThemedText>
              {isFetchingStations && (
                <ActivityIndicator size="small" color={cyanAccent} />
              )}
            </View>

            {/* Seamless Search Bar (No Native Web Outline Box) */}
            <View
              style={[
                styles.searchBoxRow,
                {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : theme.border,
                },
              ]}
            >
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' } as any}
                size={14}
                tintColor={theme.textSecondary}
              />
              <TextInput
                style={[styles.radioSearchInput, { color: theme.text }]}
                placeholder={language === 'hi' ? 'चैनल, राज्य या AIR स्ट्रीम खोजें...' : 'Search station, state or AIR stream...'}
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <SymbolView
                    name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any}
                    size={14}
                    tintColor={theme.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Full Height Station List */}
            <ScrollView style={styles.stationListScroll} showsVerticalScrollIndicator={false}>
              {/* Farming Section Header */}
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={{ fontSize: 11.5, fontWeight: '800', color: cyanAccent, letterSpacing: 0.2 }}>
                  {language === 'hi' ? 'कृषि व किसान विशेष चैनल (Top Picks)' : 'Agriculture & Farming Stations (Top Picks)'}
                </ThemedText>
              </View>

              {stations.map((station, index) => {
                const isCurrent = activeStation.id === station.id;
                const isThisPlaying = isCurrent && isPlaying;
                const showGeneralHeader = index > 0 && !station.isFarmingStation && stations[index - 1]?.isFarmingStation;

                const iconSymbol = station.isAiStation
                  ? { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }
                  : station.isFarmingStation
                  ? { ios: 'leaf.fill', android: 'eco', web: 'eco' }
                  : { ios: 'radio.fill', android: 'radio', web: 'radio' };

                return (
                  <React.Fragment key={station.id}>
                    {showGeneralHeader && (
                      <View style={[styles.sectionHeaderRow, { marginTop: 10 }]}>
                        <ThemedText style={{ fontSize: 11.5, fontWeight: '800', color: theme.textSecondary, letterSpacing: 0.2 }}>
                          {language === 'hi' ? 'आकाशवाणी व अन्य एफएम चैनल (AIR Live)' : 'All India Radio & Regional FM Streams'}
                        </ThemedText>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => handleTogglePlay(station)}
                      activeOpacity={0.75}
                      style={[
                        styles.stationRow,
                        {
                          backgroundColor: isCurrent
                            ? (isDarkMode ? 'rgba(14, 165, 233, 0.18)' : '#E0F2FE')
                            : (isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF'),
                          borderColor: isCurrent
                            ? cyanAccent
                            : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : theme.border),
                        },
                      ]}
                    >
                      {/* Crisp Clean Vector Icon Circle Badge */}
                      <View
                        style={[
                          styles.stationIconCircle,
                          {
                            backgroundColor: isCurrent
                              ? cyanAccent
                              : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6'),
                            borderColor: isCurrent ? '#38BDF8' : 'transparent',
                          },
                        ]}
                      >
                        <SymbolView
                          name={iconSymbol as any}
                          size={15}
                          tintColor={isCurrent ? '#FFFFFF' : theme.text}
                        />
                      </View>

                      {/* Full Width Station Name (Row 1) & Micro Pill Badges (Row 2) */}
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <ThemedText numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
                          {language === 'hi' ? station.nameHi : station.nameEn}
                        </ThemedText>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          <View style={[styles.freqTagPill, { backgroundColor: isCurrent ? cyanAccent : 'rgba(14, 165, 233, 0.15)' }]}>
                            <ThemedText style={{ fontSize: 8.5, fontWeight: '800', color: isCurrent ? '#FFFFFF' : cyanAccent }}>
                              {station.frequency}
                            </ThemedText>
                          </View>
                          {station.isFarmingStation && (
                            <View style={styles.farmingPillMini}>
                              <ThemedText style={{ fontSize: 7.5, fontWeight: '800', color: cyanAccent, letterSpacing: 0.2 }}>
                                {language === 'hi' ? 'कृषि' : 'KRISHI'}
                              </ThemedText>
                            </View>
                          )}
                          <ThemedText numberOfLines={1} style={{ fontSize: 10, color: theme.textSecondary, flex: 1 }}>
                            • {language === 'hi' ? station.regionHi : station.regionEn}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Right Side Action Play Mini Button */}
                      <View
                        style={[
                          styles.playMiniBtn,
                          {
                            backgroundColor: isThisPlaying ? sapphireBlue : cyanAccent,
                            shadowColor: cyanAccent,
                            shadowOpacity: isThisPlaying ? 0.4 : 0.2,
                            shadowRadius: 4,
                          },
                        ]}
                      >
                        <SymbolView
                          name={{
                            ios: isThisPlaying ? 'pause.fill' : 'play.fill',
                            android: isThisPlaying ? 'pause' : 'play_arrow',
                            web: isThisPlaying ? 'pause' : 'play_arrow',
                          } as any}
                          size={12}
                          tintColor="#FFFFFF"
                        />
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mainContentPadding: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLivePulse: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  headerLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EF4444',
  },

  /* ELECTRIC SAPPHIRE & CYAN STEREO TRANSISTOR DECK */
  transistorDeckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#0EA5E9',
    padding: 8,
    marginTop: 6,
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(14, 165, 233, 0.3)' } as any,
      default: { elevation: 6 },
    }),
  },
  transistorLedScreen: {
    flex: 1,
    backgroundColor: '#082F49',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  digitalFreqBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  digitalFreqText: {
    color: '#F0F9FF',
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  vuMeterContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2.5,
    height: 16,
  },
  vuBar: {
    width: 3,
    backgroundColor: '#38BDF8',
    borderRadius: 1.5,
  },
  inlineRulerBox: {
    position: 'relative',
    marginVertical: 4,
  },
  rulerTicksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  rulerTickLine: {
    borderRadius: 1,
  },
  rulerNeedleLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#38BDF8',
    opacity: 0.9,
  },
  transistorLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  transistorLiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  radioControlKnob: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 2px 10px rgba(14, 165, 233, 0.4)' } as any,
      default: { elevation: 4 },
    }),
  },

  searchBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  radioSearchInput: {
    flex: 1,
    fontSize: 12.5,
    paddingVertical: Platform.OS === 'ios' ? 3 : 1,
    ...Platform.select({
      web: { outlineStyle: 'none', borderStyle: 'none' } as any,
    }),
  },
  stationListScroll: {
    flex: 1,
  },
  sectionHeaderRow: {
    marginBottom: 5,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  stationIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  freqTagPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  farmingPillMini: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  playMiniBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
