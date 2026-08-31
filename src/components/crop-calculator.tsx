import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { Spacing } from '@/constants/theme';
import { calculateStandardDosage, AGRONOMY_PRESETS } from '@/utils/agronomy-math';
import cropsData from '@/constants/crops.json';

interface CropCalculatorProps {
  language: 'hi' | 'en';
  theme: any;
  formatLabel: (label: string) => string;
}

export default function CropCalculator({ language, theme, formatLabel }: CropCalculatorProps) {
  const { width } = useWindowDimensions();
  const [landArea, setLandArea] = useState('1');
  const [landUnit, setLandUnit] = useState<'acre' | 'bigha'>('acre');
  const [calcCrop, setCalcCrop] = useState('Wheat (गेहूं)');
  const [cropSearchQuery, setCropSearchQuery] = useState('');

  const dosage = calculateStandardDosage(landArea, landUnit, calcCrop);

  return (
    <View style={styles.sectionContainer}>
      <ThemedView type="card" style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.half, flexWrap: 'wrap', gap: Spacing.one }}>
          <ThemedText type="smallBold" style={[styles.cardTitle, { marginBottom: 0 }]}>
            {language === 'hi' ? 'खुराक कैलकुलेटर' : 'Crop Input Calculator'}
          </ThemedText>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(76, 175, 80, 0.12)',
            paddingVertical: 2,
            paddingHorizontal: 8,
            borderRadius: 12,
            gap: 4
          }}>
            <SymbolView
              name={{ ios: 'checkmark.shield.fill', android: 'verified', web: 'verified' } as any}
              size={12}
              tintColor="#388E3C"
            />
            <ThemedText type="code" style={{ color: '#388E3C', fontSize: 10, fontWeight: '700' }}>
              {language === 'hi' ? 'ऑफ़लाइन सक्षम' : 'Offline Ready'}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.two }}>
          {language === 'hi'
            ? 'अपनी भूमि के क्षेत्रफल के अनुसार बीज दर, सिंचाई चक्र और उर्वरक आवश्यकताओं (NPK) की गणना करें।'
            : 'Calculate seed rates, irrigation counts, and fertilizer requirements (NPK) according to your acreage.'}
        </ThemedText>

        <View style={styles.formRow}>
          <View style={{ flex: 2 }}>
            <ThemedText type="code" style={styles.formLabel}>
              {language === 'hi' ? 'भूमि का क्षेत्रफल' : 'LAND AREA'}
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: theme.text,
                  borderColor: (landArea.trim() !== '' && (parseFloat(landArea) <= 0 || parseFloat(landArea) > 1000 || isNaN(parseFloat(landArea)))) ? theme.error : theme.border,
                  backgroundColor: theme.backgroundElement
                }
              ]}
              keyboardType="numeric"
              value={landArea}
              onChangeText={setLandArea}
              placeholder={language === 'hi' ? 'क्षेत्रफल दर्ज करें' : 'Enter land area'}
              placeholderTextColor={theme.textSecondary}
            />
            {landArea.trim() !== '' && (parseFloat(landArea) <= 0 || parseFloat(landArea) > 1000 || isNaN(parseFloat(landArea))) && (
              <ThemedText style={{ color: theme.error, fontSize: 10, marginTop: 4, fontWeight: '600' }}>
                {language === 'hi' ? 'मान्य क्षेत्रफल दर्ज करें (0.1 - 1000)' : 'Enter valid area (0.1 - 1000)'}
              </ThemedText>
            )}
          </View>

          <View style={{ flex: 1.2 }}>
            <ThemedText type="code" style={styles.formLabel}>
              {language === 'hi' ? 'इकाई' : 'UNIT'}
            </ThemedText>
            <View style={[styles.unitContainer, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <Pressable
                onPress={() => setLandUnit('acre')}
                style={[styles.unitBtn, landUnit === 'acre' && [styles.unitBtnActive, { backgroundColor: theme.primary }]]}
              >
                <ThemedText type="code" style={[styles.unitBtnText, landUnit === 'acre' ? { color: theme.onPrimary, fontWeight: '700' } : { color: theme.textSecondary }]}>
                  {language === 'hi' ? 'एकड़' : 'Acre'}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setLandUnit('bigha')}
                style={[styles.unitBtn, landUnit === 'bigha' && [styles.unitBtnActive, { backgroundColor: theme.primary }]]}
              >
                <ThemedText type="code" style={[styles.unitBtnText, landUnit === 'bigha' ? { color: theme.onPrimary, fontWeight: '700' } : { color: theme.textSecondary }]}>
                  {language === 'hi' ? 'बीघा' : 'Bigha'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.formRow, { marginTop: Spacing.two, flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="code" style={styles.formLabel}>
              {language === 'hi' ? 'फसल का चयन करें' : 'SELECT CROP'}
            </ThemedText>

            <TextInput
              style={{
                height: 40,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: Spacing.three,
                color: theme.text,
                backgroundColor: theme.backgroundElement,
                fontSize: 13,
                marginBottom: Spacing.two,
                marginTop: Spacing.one
              }}
              value={cropSearchQuery}
              onChangeText={setCropSearchQuery}
              placeholder={language === 'hi' ? 'फसल का नाम खोजें (जैसे: आलू, गेहूँ)...' : 'Search crop name (e.g. Potato, Wheat)...'}
              placeholderTextColor={theme.textSecondary}
              clearButtonMode="while-editing"
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropSelectorScroll} contentContainerStyle={{ gap: Spacing.one }}>
              {cropsData
                .filter((cropItem) =>
                  cropItem.name.toLowerCase().includes(cropSearchQuery.toLowerCase()) ||
                  cropItem.en.toLowerCase().includes(cropSearchQuery.toLowerCase()) ||
                  cropItem.hi.includes(cropSearchQuery)
                )
                .map((cropItem) => {
                  const isSelected = calcCrop === cropItem.name;
                  return (
                    <Pressable
                      key={cropItem.id}
                      onPress={() => setCalcCrop(cropItem.name)}
                      style={[
                        styles.cropPill,
                        {
                          borderColor: isSelected ? theme.primary : theme.border,
                          backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.12)' : theme.backgroundElement,
                          borderWidth: isSelected ? 2 : 1,
                          marginRight: Spacing.one
                        }
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{
                          color: isSelected ? theme.primary : theme.text,
                          fontSize: 13,
                          fontWeight: isSelected ? '700' : '500'
                        }}
                      >
                        {formatLabel(cropItem.name)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </ThemedView>

      {dosage && (
        <Animated.View style={styles.resultContainer} entering={FadeInDown.springify().damping(15)}>
          <ThemedText type="smallBold" style={styles.sectionHeading}>
            {language === 'hi' ? 'अनुशंसित आवश्यकताएं' : 'Recommended Requirements'}
          </ThemedText>

          <ThemedView type="card" style={[styles.resultCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <SymbolView
              name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
              size={28}
              tintColor={theme.primary}
            />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">
                {language === 'hi' ? 'बीज की मात्रा' : 'Seed Quantity'}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 13 }}>
                {language === 'hi' ? `प्रकार: ${formatLabel(dosage.seedUnit)}` : `Type: ${dosage.seedUnit}`}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={{ fontSize: 20, color: theme.primary }}>
              {dosage.seed} kg
            </ThemedText>
          </ThemedView>

          <ThemedView type="card" style={[styles.resultCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <SymbolView
              name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' } as any}
              size={28}
              tintColor={theme.primary}
            />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">
                {language === 'hi' ? 'सिंचाई की आवश्यकता' : 'Water & Irrigation'}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 13 }}>
                {language === 'hi' ? `चक्र: ~${dosage.waterRounds} बार` : `Rounds: ~${dosage.waterRounds} cycles`}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.primary }}>
              {dosage.waterVolume.toLocaleString()} {language === 'hi' ? 'लीटर' : 'Liters'}
            </ThemedText>
          </ThemedView>

          <ThemedView type="card" style={[styles.fertilizerCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>
              {language === 'hi' ? 'उर्वरक (NPK) की खुराक' : 'Fertilizers (NPK) Dosage'}
            </ThemedText>
            <View style={[styles.npkRow, width < 360 && { flexDirection: 'column' }]}>
              <View style={[styles.npkItem, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={{ color: '#D32F2F', fontSize: 18 }}>N</ThemedText>
                <ThemedText type="code" style={{ fontSize: 10, opacity: 0.6 }}>
                  {language === 'hi' ? 'नाइट्रोजन' : 'NITROGEN'}
                </ThemedText>
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>{dosage.n} kg</ThemedText>
              </View>

              <View style={[styles.npkItem, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={{ color: '#1976D2', fontSize: 18 }}>P</ThemedText>
                <ThemedText type="code" style={{ fontSize: 10, opacity: 0.6 }}>
                  {language === 'hi' ? 'फास्फोरस' : 'PHOSPHORUS'}
                </ThemedText>
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>{dosage.p} kg</ThemedText>
              </View>

              <View style={[styles.npkItem, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={{ color: '#388E3C', fontSize: 18 }}>K</ThemedText>
                <ThemedText type="code" style={{ fontSize: 10, opacity: 0.6 }}>
                  {language === 'hi' ? 'पोटैशियम' : 'POTASSIUM'}
                </ThemedText>
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>{dosage.k} kg</ThemedText>
              </View>
            </View>
          </ThemedView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    gap: Spacing.three
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: Spacing.half
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-end'
  },
  formLabel: {
    fontSize: 9,
    opacity: 0.6,
    marginBottom: Spacing.one
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    fontSize: 14
  },
  unitContainer: {
    flexDirection: 'row',
    height: 40,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: 2,
    alignItems: 'center'
  },
  unitBtn: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Spacing.two - 2
  },
  unitBtnActive: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  unitBtnText: {
    fontSize: 11
  },
  cropSelectorScroll: {
    flexDirection: 'row'
  },
  cropPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: Spacing.one
  },
  cropPillText: {
    fontSize: 12
  },
  sectionHeading: {
    fontSize: 16,
    marginTop: Spacing.one
  },
  resultContainer: {
    gap: Spacing.two
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.three
  },
  fertilizerCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1
  },
  npkRow: {
    flexDirection: 'row',
    gap: Spacing.two
  },
  npkItem: {
    flex: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    alignItems: 'center',
    gap: 2
  }
});
