import React from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable, Linking } from 'react-native';
import { ThemedText } from './themed-text';
import { SymbolView } from 'expo-symbols';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  type DisasterAlert,
  type DailyForecastItem,
  getWeatherCondition,
  generateWeatherAdvisory,
} from '@/services/weather-service';

interface WeatherDisasterModalProps {
  visible: boolean;
  onClose: () => void;
  disasterAlert: DisasterAlert | null;
  daily7d?: DailyForecastItem[];
  currentTemp?: number;
  stateName: string;
  cropName: string;
  language: 'hi' | 'en';
  onNavigateToChat?: (initialMessage: string) => void;
}

export function WeatherDisasterModal({
  visible,
  onClose,
  disasterAlert,
  daily7d = [],
  currentTemp,
  stateName,
  cropName,
  language,
  onNavigateToChat,
}: WeatherDisasterModalProps) {
  const theme = useTheme();
  const isHindi = language === 'hi';

  const alertTitle = disasterAlert
    ? isHindi ? disasterAlert.titleHi : disasterAlert.titleEn
    : isHindi ? '48-घंटे मौसम चेतावनी' : '48h Weather Hazard Alert';

  const alertDesc = disasterAlert
    ? isHindi ? disasterAlert.descHi : disasterAlert.descEn
    : isHindi ? `${stateName} के मौसम अलर्ट की जानकारी।` : `Weather advisories for ${stateName}.`;

  const actionItems = disasterAlert
    ? isHindi ? disasterAlert.actionItemsHi : disasterAlert.actionItemsEn
    : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header Bar */}
          <View style={[styles.headerBar, { backgroundColor: theme.primary + '14', borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.alertIconBadge, { backgroundColor: theme.primary }]}>
                <SymbolView
                  name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' } as any}
                  size={16}
                  tintColor="#FFFFFF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={{ fontSize: 16, color: theme.text }}>
                  {isHindi ? '7-दिवसीय मौसम पूर्वानुमान' : '7-Day Weather Forecast'}
                </ThemedText>
                <ThemedText type="code" style={{ fontSize: 11, color: theme.textSecondary }}>
                  {stateName} • {cropName}
                </ThemedText>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any}
                size={22}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. Emergency Warning Banner if Active Alert exists */}
            {disasterAlert && (
              <View style={[styles.disasterBox, { backgroundColor: theme.error + '12', borderColor: theme.error + '44' }]}>
                <View style={styles.disasterHeader}>
                  <SymbolView
                    name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' } as any}
                    size={18}
                    tintColor={theme.error}
                  />
                  <ThemedText type="smallBold" style={{ fontSize: 14, color: theme.error, flex: 1 }}>
                    {alertTitle}
                  </ThemedText>
                  <View style={[styles.probChip, { backgroundColor: theme.error }]}>
                    <ThemedText type="code" style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '800' }}>
                      {disasterAlert.probability}% {isHindi ? 'खतरा' : 'RISK'}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText type="small" style={{ color: theme.text, fontSize: 12.5, lineHeight: 18, marginTop: 4 }}>
                  {alertDesc}
                </ThemedText>

                {actionItems.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {actionItems.map((item, idx) => (
                      <View key={`act-${idx}`} style={styles.actionRow}>
                        <View style={[styles.actionDot, { backgroundColor: theme.error }]} />
                        <ThemedText type="small" style={{ flex: 1, fontSize: 12, color: theme.text }}>
                          {item}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 2. 7-Day Date-Wise Weather Forecast List */}
            <View style={{ marginTop: disasterAlert ? Spacing.three : 0 }}>
              <View style={styles.sectionHeaderRow}>
                <SymbolView
                  name={{ ios: 'cloud.sun.fill', android: 'wb_sunny', web: 'wb_sunny' } as any}
                  size={18}
                  tintColor={theme.primary}
                />
                <ThemedText type="smallBold" style={{ fontSize: 15, color: theme.text }}>
                  {isHindi ? '7 दिनों का दैनिक मौसम व कृषि सलाह' : '7-Day Daily Forecast & Farm Advisory'}
                </ThemedText>
              </View>

              <View style={styles.forecastList}>
                {daily7d.map((day, dIdx) => {
                  const cond = getWeatherCondition(day.weatherCode);
                  const isRain = day.precProb >= 40 || day.weatherCode >= 50;

                  return (
                    <View
                      key={`day-${dIdx}`}
                      style={[
                        styles.dayCard,
                        {
                          backgroundColor: dIdx === 0 ? theme.backgroundSelected : theme.backgroundElement,
                          borderColor: dIdx === 0 ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      {/* Top Row: Date | Icon + Condition | Temp Range | Rain Badge */}
                      <View style={styles.dayTopRow}>
                        <View style={styles.dateCol}>
                          <ThemedText
                            type="smallBold"
                            style={{
                              fontSize: 14,
                              color: dIdx === 0 ? theme.primary : theme.text,
                            }}
                          >
                            {isHindi ? day.dayNameHi : day.dayNameEn}
                          </ThemedText>
                          <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                            {day.dateFormatted}
                          </ThemedText>
                        </View>

                        <View style={styles.conditionCol}>
                          <SymbolView
                            name={cond.icon as any}
                            size={20}
                            tintColor={isRain ? theme.primary : theme.accent}
                          />
                          <ThemedText type="small" style={{ fontSize: 12, color: theme.text }}>
                            {isHindi ? cond.hi : cond.en}
                          </ThemedText>
                        </View>

                        <View style={styles.tempCol}>
                          <View style={{ alignItems: 'flex-end' }}>
                            {dIdx === 0 && currentTemp !== undefined ? (
                              <>
                                <ThemedText type="smallBold" style={{ fontSize: 13.5, color: theme.primary }}>
                                  {currentTemp}°C <ThemedText type="code" style={{ fontSize: 9, color: theme.textSecondary }}>({isHindi ? 'अभी' : 'Now'})</ThemedText>
                                </ThemedText>
                                <ThemedText type="code" style={{ fontSize: 9.5, color: theme.textSecondary }}>
                                  {isHindi ? `उच्च ${day.maxTemp}° • कम ${day.minTemp}°` : `H: ${day.maxTemp}° • L: ${day.minTemp}°`}
                                </ThemedText>
                              </>
                            ) : (
                              <>
                                <ThemedText type="smallBold" style={{ fontSize: 13.5 }}>
                                  {day.maxTemp}°C
                                </ThemedText>
                                <ThemedText type="code" style={{ fontSize: 9.5, color: theme.textSecondary }}>
                                  {isHindi ? `कम ${day.minTemp}°C` : `Low ${day.minTemp}°C`}
                                </ThemedText>
                              </>
                            )}
                          </View>
                        </View>

                        {day.precProb > 0 && (
                          <View
                            style={[
                              styles.rainBadge,
                              { backgroundColor: isRain ? theme.primary + '1F' : theme.backgroundElement },
                            ]}
                          >
                            <SymbolView
                              name={{ ios: 'cloud.rain.fill', android: 'grain', web: 'grain' } as any}
                              size={12}
                              tintColor={isRain ? theme.primary : theme.textSecondary}
                            />
                            <ThemedText
                              type="code"
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isRain ? theme.primary : theme.textSecondary,
                              }}
                            >
                              {day.precProb}%
                            </ThemedText>
                          </View>
                        )}
                      </View>

                      {/* Advisory 1-Liner for each day */}
                      <View style={[styles.dayAdvisoryRow, { borderTopColor: theme.border + '55' }]}>
                        <SymbolView
                          name={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' } as any}
                          size={12}
                          tintColor={theme.accent}
                        />
                        <ThemedText type="small" style={{ fontSize: 11.5, color: theme.textSecondary, flex: 1, lineHeight: 16 }}>
                          {generateWeatherAdvisory(day.maxTemp, day.precProb, day.weatherCode, stateName, cropName, language)}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* AI Weather Consultation Button */}
            {onNavigateToChat && (
              <View style={styles.bottomBarRow}>
                <Pressable
                  onPress={() => {
                    onClose();
                    onNavigateToChat(
                      isHindi
                        ? `${stateName} में अगले 7 दिनों का मौसम कैसा रहेगा? ${cropName} की फसल के लिए सलाह दें।`
                        : `What is the 7-day weather forecast for ${stateName}? Advise on ${cropName} crop.`
                    );
                  }}
                  style={({ pressed }) => [
                    styles.aiHelpBtn,
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                    size={16}
                    tintColor="#FFFFFF"
                  />
                  <ThemedText type="smallBold" style={{ color: '#FFFFFF', fontSize: 13 }}>
                    {isHindi ? 'AI मित्र से विस्तृत मौसम सलाह लें' : 'Ask AI Mitra Weather Forecast'}
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    minHeight: '60%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerBar: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  alertIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
  },
  disasterBox: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  disasterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  probChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 3,
  },
  actionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.two,
  },
  forecastList: {
    gap: Spacing.two,
  },
  dayCard: {
    padding: Spacing.two + 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateCol: {
    width: 70,
  },
  conditionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingHorizontal: 4,
  },
  tempCol: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    minWidth: 70,
  },
  rainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayAdvisoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  bottomBarRow: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  helplineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  aiHelpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});
