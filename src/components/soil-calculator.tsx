import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  View,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { Spacing } from '@/constants/theme';
import { extractSoilHealthCardData, PhysicalSoilAnalysis } from '@/services/ai-service';
import { calculateSoilDosage, AGRONOMY_PRESETS } from '@/utils/agronomy-math';
import * as ImagePicker from 'expo-image-picker';
import cropsData from '@/constants/crops.json';

interface SoilCalculatorProps {
  language: 'hi' | 'en';
  theme: any;
  formatLabel: (label: string) => string;
}

export default function SoilCalculator({ language, theme, formatLabel }: SoilCalculatorProps) {
  const { width } = useWindowDimensions();

  // Inputs
  const [landArea, setLandArea] = useState('1');
  const [landUnit, setLandUnit] = useState<'acre' | 'bigha'>('acre');
  const [calcCrop, setCalcCrop] = useState('Wheat (गेहूं)');
  const [cropSearchQuery, setCropSearchQuery] = useState('');

  // Soil Parameters
  const [soilPh, setSoilPh] = useState('');
  const [soilN, setSoilN] = useState('');
  const [soilP, setSoilP] = useState('');
  const [soilK, setSoilK] = useState('');
  const [soilOc, setSoilOc] = useState('');

  // Mode and Easy Levels
  const [inputMode, setInputMode] = useState<'simple' | 'advanced'>('simple');
  const [simplePh, setSimplePh] = useState<'acidic' | 'neutral' | 'alkaline' | null>('neutral');
  const [simpleN, setSimpleN] = useState<'low' | 'medium' | 'high' | null>('medium');
  const [simpleP, setSimpleP] = useState<'low' | 'medium' | 'high' | null>('medium');
  const [simpleK, setSimpleK] = useState<'low' | 'medium' | 'high' | null>('medium');
  const [simpleOc, setSimpleOc] = useState<'low' | 'medium' | 'high' | null>('medium');
  const [showParameters, setShowParameters] = useState(false);
  const [visualAnalysis, setVisualAnalysis] = useState<PhysicalSoilAnalysis | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const [fertilizerSource, setFertilizerSource] = useState<'dap' | 'ssp'>('dap');
  const [soilCardImage, setSoilCardImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // Pick or take photo for soil health card
  const pickSoilCardImage = async (useCamera: boolean) => {
    try {
      if (Platform.OS !== 'web') {
        const permissionResult = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.status !== 'granted') {
          Alert.alert(
            language === 'hi' ? 'अनुमति आवश्यक' : 'Permission Required',
            language === 'hi'
              ? (useCamera ? 'कैमरा अनुमति की आवश्यकता है।' : 'गैलरी अनुमति की आवश्यकता है।')
              : (useCamera ? 'Camera permission is required.' : 'Media library permission is required.')
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Str = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        setSoilCardImage(base64Str);
        // Automatically extract data
        handleExtractSoilCard(base64Str);
      }
    } catch (err) {
      console.error('Error selecting soil report image:', err);
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'फोटो चुनने में समस्या आई।' : 'Failed to select image.'
      );
    }
  };

  const handleExtractSoilCard = async (base64Image: string) => {
    setIsExtracting(true);
    try {
      const data = await extractSoilHealthCardData(base64Image, language);
      if (data) {
        if (data.isReportCard) {
          // It is a lab report card
          setVisualAnalysis(null);
          
          if (data.pH !== null) setSoilPh(data.pH.toString());
          if (data.nitrogen !== null) setSoilN(data.nitrogen.toString());
          if (data.phosphorus !== null) setSoilP(data.phosphorus.toString());
          if (data.potassium !== null) setSoilK(data.potassium.toString());
          if (data.organicCarbon !== null) setSoilOc(data.organicCarbon.toString());

          if (data.estimatedPh) setSimplePh(data.estimatedPh);
          if (data.estimatedN) setSimpleN(data.estimatedN);
          if (data.estimatedP) setSimpleP(data.estimatedP);
          if (data.estimatedK) setSimpleK(data.estimatedK);
          if (data.estimatedOc) setSimpleOc(data.estimatedOc);

          setInputMode('advanced'); // For reports, defaults to advanced numeric
          
          Alert.alert(
            language === 'hi' ? 'सफलता' : 'Success',
            language === 'hi'
              ? 'मृदा स्वास्थ्य कार्ड से डेटा सफलतापूर्वक निकाला गया।'
              : 'Soil parameters extracted successfully from the health card.'
          );
        } else {
          // It is physical soil
          setVisualAnalysis(data.physicalSoil);
          
          if (data.estimatedPh) {
            setSimplePh(data.estimatedPh);
            setSoilPh(data.estimatedPh === 'acidic' ? '5.5' : data.estimatedPh === 'alkaline' ? '8.5' : '6.8');
          }
          if (data.estimatedN) {
            setSimpleN(data.estimatedN);
            setSoilN(data.estimatedN === 'low' ? '180' : data.estimatedN === 'high' ? '600' : '380');
          }
          if (data.estimatedP) {
            setSimpleP(data.estimatedP);
            setSoilP(data.estimatedP === 'low' ? '7' : data.estimatedP === 'high' ? '30' : '16');
          }
          if (data.estimatedK) {
            setSimpleK(data.estimatedK);
            setSoilK(data.estimatedK === 'low' ? '80' : data.estimatedK === 'high' ? '350' : '200');
          }
          if (data.estimatedOc) {
            setSimpleOc(data.estimatedOc);
            setSoilOc(data.estimatedOc === 'low' ? '0.3' : data.estimatedOc === 'high' ? '0.9' : '0.6');
          }

          setInputMode('simple'); // Keep simple mode active for direct soil visual analysis
          
          Alert.alert(
            language === 'hi' ? 'भौतिक विश्लेषण पूरा हुआ' : 'Visual Analysis Complete',
            language === 'hi'
              ? `मिट्टी का प्रकार: ${data.physicalSoil?.soilTypeHi || 'अज्ञात'}\nनमी: ${data.physicalSoil?.moistureHi || 'अज्ञात'}`
              : `Detected: ${data.physicalSoil?.soilTypeEn || 'Unknown'}\nMoisture: ${data.physicalSoil?.moistureEn || 'Unknown'}`
          );
        }
      }
    } catch (err) {
      console.error('[SoilOCR] Failed extraction:', err);
      Alert.alert(
        language === 'hi' ? 'सचेत' : 'Notice',
        language === 'hi'
          ? 'फोटो का विश्लेषण करने में समस्या आई। कृपया मापदंडों को मैन्युअल रूप से दर्ज करें।'
          : 'Failed to analyze the photo. Please enter soil parameters manually.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const clearReportImage = () => {
    setSoilCardImage(null);
    setVisualAnalysis(null);
  };

  // Perform dosage math
  const effectivePh = inputMode === 'simple' ? (simplePh ? { acidic: '5.5', neutral: '7.0', alkaline: '8.5' }[simplePh] : '') : soilPh;
  const effectiveN = inputMode === 'simple' ? (simpleN ? { low: '200', medium: '400', high: '600' }[simpleN] : '') : soilN;
  const effectiveP = inputMode === 'simple' ? (simpleP ? { low: '8', medium: '16', high: '25' }[simpleP] : '') : soilP;
  const effectiveK = inputMode === 'simple' ? (simpleK ? { low: '90', medium: '200', high: '300' }[simpleK] : '') : soilK;
  const effectiveOc = inputMode === 'simple' ? (simpleOc ? { low: '0.3', medium: '0.6', high: '0.9' }[simpleOc] : '') : soilOc;

  const dosage = calculateSoilDosage(
    landArea,
    landUnit,
    calcCrop,
    effectivePh,
    effectiveN,
    effectiveP,
    effectiveK,
    effectiveOc,
    fertilizerSource
  );

  return (
    <View style={styles.sectionContainer}>
      {/* 1. Area, Crop Selectors */}
      <ThemedView type="card" style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          {language === 'hi' ? 'क्षेत्रफल और फसल' : 'Area & Crop Selection'}
        </ThemedText>

        <View style={styles.formRow}>
          <View style={{ flex: 2 }}>
            <ThemedText type="code" style={styles.formLabel}>
              {language === 'hi' ? 'भूमि का क्षेत्रफल' : 'LAND AREA'}
            </ThemedText>
            <TextInput
              style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              keyboardType="numeric"
              value={landArea}
              onChangeText={setLandArea}
              placeholder={language === 'hi' ? 'क्षेत्रफल दर्ज करें' : 'Enter land area'}
              placeholderTextColor={theme.textSecondary}
            />
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

      {/* 2. Soil Health Card Vision OCR */}
      <ThemedView type="card" style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          {language === 'hi' ? 'मृदा स्वास्थ्य कार्ड अपलोड' : 'Upload Soil Health Card'}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.two }}>
          {language === 'hi'
            ? 'अपनी रिपोर्ट या स्वास्थ्य कार्ड की फोटो अपलोड करें। एआई खुद ही सभी मानक माप निकाल लेगा।'
            : 'Upload a picture of your soil health card. AI will read values automatically.'}
        </ThemedText>

        {!soilCardImage ? (
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <Pressable
              onPress={() => pickSoilCardImage(true)}
              style={({ pressed }) => [
                styles.uploadBtn,
                { backgroundColor: theme.primary, flex: 1, height: 42, borderRadius: Spacing.two },
                pressed && { opacity: 0.9 }
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                <SymbolView
                  name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as any}
                  size={18}
                  tintColor={theme.onPrimary}
                />
                <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                  {language === 'hi' ? 'कैमरा' : 'Camera'}
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => pickSoilCardImage(false)}
              style={({ pressed }) => [
                styles.uploadBtn,
                { borderColor: theme.primary, borderWidth: 1, flex: 1, height: 42, borderRadius: Spacing.two },
                pressed && { opacity: 0.9 }
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                <SymbolView
                  name={{ ios: 'photo.on.rectangle.angled', android: 'photo_library', web: 'photo_library' } as any}
                  size={18}
                  tintColor={theme.primary}
                />
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {language === 'hi' ? 'गैलरी' : 'Gallery'}
                </ThemedText>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.imagePreviewContainer, { borderColor: theme.border }]}>
            <Image source={{ uri: soilCardImage }} style={styles.imagePreview} contentFit="cover" />
            
            {isExtracting && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText type="smallBold" style={{ color: '#fff', marginTop: Spacing.two }}>
                  {language === 'hi' ? 'रिपोर्ट पढ़ी जा रही है...' : 'Extracting data...'}
                </ThemedText>
              </View>
            )}

            {!isExtracting && (
              <Pressable
                onPress={clearReportImage}
                style={({ pressed }) => [
                  styles.removeImageBtn,
                  { backgroundColor: 'rgba(0,0,0,0.6)' },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <SymbolView name="xmark" size={14} tintColor="#fff" />
              </Pressable>
            )}
          </View>
        )}
      </ThemedView>

      {/* 2b. Visual Soil Analysis Card */}
      {visualAnalysis && (
        <ThemedView type="card" style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.two }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FF9800', justifyContent: 'center', alignItems: 'center' }}>
              <SymbolView name={{ ios: 'eye.fill', android: 'visibility', web: 'visibility' } as any} size={14} tintColor="#fff" />
            </View>
            <ThemedText type="smallBold" style={{ flex: 1 }}>
              {language === 'hi' ? 'मिट्टी का भौतिक विश्लेषण' : 'Visual Soil Report'}
            </ThemedText>
            <Pressable
              onPress={() => setVisualAnalysis(null)}
              style={({ pressed }) => [
                { padding: 4, borderRadius: 12, backgroundColor: theme.backgroundElement },
                pressed && { opacity: 0.8 }
              ]}
            >
              <SymbolView name="xmark" size={12} tintColor={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={{ gap: Spacing.two }}>
            {/* Grid of basic attributes */}
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <View style={{ flex: 1, padding: Spacing.two, borderRadius: Spacing.one, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border }}>
                <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>
                  {language === 'hi' ? 'मिट्टी का प्रकार' : 'SOIL TYPE'}
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {language === 'hi' ? visualAnalysis.soilTypeHi : visualAnalysis.soilTypeEn}
                </ThemedText>
              </View>

              <View style={{ flex: 1, padding: Spacing.two, borderRadius: Spacing.one, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border }}>
                <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>
                  {language === 'hi' ? 'रंग' : 'SOIL COLOR'}
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {language === 'hi' ? visualAnalysis.soilColorHi : visualAnalysis.soilColorEn}
                </ThemedText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <View style={{ flex: 1, padding: Spacing.two, borderRadius: Spacing.one, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border }}>
                <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>
                  {language === 'hi' ? 'नमी का स्तर' : 'MOISTURE LEVEL'}
                </ThemedText>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  {language === 'hi' ? visualAnalysis.moistureHi : visualAnalysis.moistureEn}
                </ThemedText>
              </View>

              <View style={{ flex: 1, padding: Spacing.two, borderRadius: Spacing.one, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border }}>
                <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>
                  {language === 'hi' ? 'जैविक स्तर (Organic Carbon)' : 'ORGANIC CARBON'}
                </ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.statusDot, { backgroundColor: (visualAnalysis.organicMatterEn || '').toLowerCase() === 'high' ? '#4CAF50' : (visualAnalysis.organicMatterEn || '').toLowerCase() === 'low' ? '#F44336' : '#FF9800' }]} />
                  <ThemedText type="smallBold" style={{ color: theme.text }}>
                    {language === 'hi' ? visualAnalysis.organicMatterHi : visualAnalysis.organicMatterEn}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Suggested Crops */}
            <View style={{ padding: Spacing.two, borderRadius: Spacing.one, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border }}>
              <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 4 }}>
                {language === 'hi' ? '🌾 उपयुक्त फसलें' : '🌾 SUGGESTED CROPS'}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.text }}>
                {language === 'hi' ? visualAnalysis.suggestedCropsHi : visualAnalysis.suggestedCropsEn}
              </ThemedText>
            </View>

            {/* Observations / Advice */}
            <View style={{ padding: Spacing.two, borderRadius: Spacing.one, backgroundColor: theme.backgroundElement, borderWidth: 1, borderColor: theme.border }}>
              <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 4 }}>
                {language === 'hi' ? '💡 विशेष सुझाव' : '💡 RECOMMENDATIONS'}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.text, lineHeight: 18 }}>
                {language === 'hi' ? visualAnalysis.observationsHi : visualAnalysis.observationsEn}
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      )}

      {/* 2c. Collapsible Parameter Button */}
      {soilCardImage !== null && (
        <Pressable
          onPress={() => setShowParameters(!showParameters)}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: Spacing.two,
              paddingHorizontal: Spacing.three,
              borderRadius: Spacing.two,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
              gap: Spacing.one,
              marginBottom: Spacing.two,
              marginTop: Spacing.one,
            },
            pressed && { opacity: 0.8 }
          ]}
        >
          <SymbolView
            name={showParameters ? 'chevron.up' : ({ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' } as any)}
            size={16}
            tintColor={theme.primary}
          />
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {showParameters 
              ? (language === 'hi' ? 'मापदंडों को छुपाएं' : 'Hide Parameters')
              : (language === 'hi' ? 'मापदंडों को बदलें / उन्नत विकल्प' : 'Manual Adjust / Edit Parameters')}
          </ThemedText>
        </Pressable>
      )}

      {/* 3. Soil Parameters Grid Inputs */}
      {showParameters && (
        <ThemedView type="card" style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="smallBold" style={styles.cardTitle}>
            {language === 'hi' ? 'मृदा स्वास्थ्य मापदंड दर्ज करें' : 'Enter Soil Parameters'}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.two }}>
            {language === 'hi'
              ? 'नीचे दिए गए खेतों में रासायनिक मान दर्ज करें या ऊपर कार्ड स्कैन करें।'
              : 'Fill in chemical parameters manually or let the scan extract them above.'}
          </ThemedText>

          {/* Input Mode Selector */}
          <View style={[styles.unitContainer, { borderColor: theme.border, backgroundColor: theme.backgroundElement, marginBottom: Spacing.two }]}>
            <Pressable
              onPress={() => setInputMode('simple')}
              style={[styles.unitBtn, inputMode === 'simple' && [styles.unitBtnActive, { backgroundColor: theme.primary }]]}
            >
              <ThemedText type="code" style={[styles.unitBtnText, inputMode === 'simple' ? { color: theme.onPrimary, fontWeight: '700' } : { color: theme.textSecondary }]}>
                {language === 'hi' ? 'सरल तरीका (Simple)' : 'Simple Mode'}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setInputMode('advanced')}
              style={[styles.unitBtn, inputMode === 'advanced' && [styles.unitBtnActive, { backgroundColor: theme.primary }]]}
            >
              <ThemedText type="code" style={[styles.unitBtnText, inputMode === 'advanced' ? { color: theme.onPrimary, fontWeight: '700' } : { color: theme.textSecondary }]}>
                {language === 'hi' ? 'संख्या दर्ज करें (Advanced)' : 'Advanced Mode'}
              </ThemedText>
            </Pressable>
          </View>

          {inputMode === 'simple' ? (
            <View style={{ gap: Spacing.two }}>
              {/* pH Selector */}
              <View style={styles.simpleParamRow}>
                <ThemedText type="code" style={styles.simpleParamLabel}>
                  {language === 'hi' ? '१. मिट्टी का पीएच (pH Level)' : '1. SOIL pH LEVEL'}
                </ThemedText>
                <View style={styles.pillContainer}>
                  <Pressable
                    onPress={() => setSimplePh('acidic')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simplePh === 'acidic' && { backgroundColor: '#FFC107', borderColor: '#FFC107' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simplePh === 'acidic' ? { color: '#000', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'अम्लीय (Acidic)' : 'Acidic (< 6.0)'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSimplePh('neutral')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simplePh === 'neutral' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simplePh === 'neutral' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'उदासीन/स्वस्थ' : 'Neutral (6.0-8.2)'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSimplePh('alkaline')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simplePh === 'alkaline' && { backgroundColor: '#FF5722', borderColor: '#FF5722' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simplePh === 'alkaline' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'क्षारीय (Alkaline)' : 'Alkaline (> 8.2)'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* Organic Carbon Selector */}
              <View style={styles.simpleParamRow}>
                <ThemedText type="code" style={styles.simpleParamLabel}>
                  {language === 'hi' ? '२. जैविक कार्बन (Organic Carbon)' : '2. ORGANIC CARBON'}
                </ThemedText>
                <View style={styles.pillContainer}>
                  <Pressable
                    onPress={() => setSimpleOc('low')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleOc === 'low' && { backgroundColor: '#D32F2F', borderColor: '#D32F2F' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleOc === 'low' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'कम (Low)' : 'Low (< 0.5%)'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSimpleOc('medium')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleOc === 'medium' && { backgroundColor: '#FF9800', borderColor: '#FF9800' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleOc === 'medium' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'मध्यम (Medium)' : 'Medium (0.5-0.75%)'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSimpleOc('high')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleOc === 'high' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleOc === 'high' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'अधिक (High)' : 'High (> 0.75%)'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* Nitrogen Selector */}
              <View style={styles.simpleParamRow}>
                <ThemedText type="code" style={styles.simpleParamLabel}>
                  {language === 'hi' ? '३. नाइट्रोजन स्तर (Nitrogen - N)' : '3. NITROGEN (N)'}
                </ThemedText>
                <View style={styles.pillContainer}>
                  <Pressable
                    onPress={() => setSimpleN('low')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleN === 'low' && { backgroundColor: '#D32F2F', borderColor: '#D32F2F' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleN === 'low' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'कम (Low)' : 'Low (< 280)'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSimpleN('medium')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleN === 'medium' && { backgroundColor: '#FF9800', borderColor: '#FF9800' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleN === 'medium' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'मध्यम (Medium)' : 'Medium (280-560)'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSimpleN('high')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleN === 'high' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleN === 'high' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'अधिक (High)' : 'High (> 560)'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* Phosphorus Selector */}
              <View style={styles.simpleParamRow}>
                <ThemedText type="code" style={styles.simpleParamLabel}>
                  {language === 'hi' ? '४. फास्फोरस स्तर (Phosphorus - P)' : '4. PHOSPHORUS (P)'}
                </ThemedText>
                <View style={styles.pillContainer}>
                  <Pressable
                    onPress={() => setSimpleP('low')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleP === 'low' && { backgroundColor: '#D32F2F', borderColor: '#D32F2F' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleP === 'low' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'कम (Low)' : 'Low (< 11)'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSimpleP('medium')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleP === 'medium' && { backgroundColor: '#FF9800', borderColor: '#FF9800' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleP === 'medium' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'मध्यम (Medium)' : 'Medium (11-22)'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSimpleP('high')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleP === 'high' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleP === 'high' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'अधिक (High)' : 'High (> 22)'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* Potassium Selector */}
              <View style={styles.simpleParamRow}>
                <ThemedText type="code" style={styles.simpleParamLabel}>
                  {language === 'hi' ? '५. पोटैशियम स्तर (Potassium - K)' : '5. POTASSIUM (K)'}
                </ThemedText>
                <View style={styles.pillContainer}>
                  <Pressable
                    onPress={() => setSimpleK('low')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleK === 'low' && { backgroundColor: '#D32F2F', borderColor: '#D32F2F' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleK === 'low' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'कम (Low)' : 'Low (< 110)'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSimpleK('medium')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleK === 'medium' && { backgroundColor: '#FF9800', borderColor: '#FF9800' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleK === 'medium' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'मध्यम (Medium)' : 'Medium (110-280)'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => setSimpleK('high')}
                    style={[
                      styles.pillBtn,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      simpleK === 'high' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }
                    ]}
                  >
                    <ThemedText type="smallBold" style={[styles.pillText, simpleK === 'high' ? { color: '#fff', fontWeight: '700' } : { color: theme.text }]}>
                      {language === 'hi' ? 'अधिक (High)' : 'High (> 280)'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ gap: Spacing.two }}>
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="code" style={styles.formLabel}>
                    {language === 'hi' ? 'पीएच (PH)' : 'SOIL PH (4.0 - 10.0)'}
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    keyboardType="numeric"
                    value={soilPh}
                    onChangeText={setSoilPh}
                    placeholder="6.5"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <ThemedText type="code" style={styles.formLabel}>
                    {language === 'hi' ? 'जैविक कार्बन (%)' : 'ORGANIC CARBON (%)'}
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    keyboardType="numeric"
                    value={soilOc}
                    onChangeText={setSoilOc}
                    placeholder="0.5"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="code" style={styles.formLabel}>
                    {language === 'hi' ? 'नाइट्रोजन (N - KG/HA)' : 'NITROGEN (N - KG/HA)'}
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    keyboardType="numeric"
                    value={soilN}
                    onChangeText={setSoilN}
                    placeholder="250"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <ThemedText type="code" style={styles.formLabel}>
                    {language === 'hi' ? 'फास्फोरस (P - KG/HA)' : 'PHOSPHORUS (P - KG/HA)'}
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    keyboardType="numeric"
                    value={soilP}
                    onChangeText={setSoilP}
                    placeholder="15"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <ThemedText type="code" style={styles.formLabel}>
                    {language === 'hi' ? 'पोटैशियम (K - KG/HA)' : 'POTASSIUM (K - KG/HA)'}
                  </ThemedText>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                    keyboardType="numeric"
                    value={soilK}
                    onChangeText={setSoilK}
                    placeholder="180"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>
            </View>
          )}
        </ThemedView>
      )}

      {/* 4. Fertilizer Combination Selector */}
      {(soilCardImage !== null || showParameters) && (
        <ThemedView type="card" style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ThemedText type="smallBold" style={styles.cardTitle}>
            {language === 'hi' ? 'उर्वरक स्रोत का संयोजन' : 'Select Fertilizer Source'}
          </ThemedText>
          <View style={[styles.unitContainer, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <Pressable
              onPress={() => setFertilizerSource('dap')}
              style={[styles.unitBtn, fertilizerSource === 'dap' && [styles.unitBtnActive, { backgroundColor: theme.primary }]]}
            >
              <ThemedText type="code" style={[styles.unitBtnText, fertilizerSource === 'dap' ? { color: theme.onPrimary, fontWeight: '700' } : { color: theme.textSecondary }]}>
                {language === 'hi' ? 'डीएपी + यूरिया + एमओपी (DAP)' : 'DAP + Urea + MOP'}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setFertilizerSource('ssp')}
              style={[styles.unitBtn, fertilizerSource === 'ssp' && [styles.unitBtnActive, { backgroundColor: theme.primary }]]}
            >
              <ThemedText type="code" style={[styles.unitBtnText, fertilizerSource === 'ssp' ? { color: theme.onPrimary, fontWeight: '700' } : { color: theme.textSecondary }]}>
                {language === 'hi' ? 'एसएसपी + यूरिया + एमओपी (SSP)' : 'SSP + Urea + MOP'}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      )}

      {/* 5. Results Section */}
      {dosage && (soilCardImage !== null || showParameters) && (
        <View style={styles.resultContainer}>
          {/* Fertilizer Prescription Card */}
          <ThemedView type="card" style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card, gap: Spacing.two }]}>
            <ThemedText type="smallBold" style={{ fontSize: 15 }}>
              {language === 'hi' ? 'उर्वरक नुस्खा (Smart Prescription)' : 'Smart Fertilizer Recommendation'}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>
              {language === 'hi'
                ? 'संशोधित पोषक तत्वों की आवश्यकता पूरी करने के लिए बाजार के उर्वरकों की सटीक मात्रा:'
                : 'Commercial fertilizer amounts needed to satisfy adjusted targets:'}
            </ThemedText>

            <View style={{ gap: Spacing.two }}>
              {/* Urea bag card */}
              <View style={[styles.fertilizerPrescriptionRow, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.prescriptionIconContainer, { backgroundColor: 'rgba(211, 47, 47, 0.1)' }]}>
                  <ThemedText type="smallBold" style={{ color: '#D32F2F' }}>N</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">
                    {language === 'hi' ? 'यूरिया (Urea)' : 'Urea (46% N)'}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {language === 'hi' ? `${dosage.ureaWeight} किलोग्राम` : `${dosage.ureaWeight} kg total weight`}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.primary }}>
                  {dosage.ureaBags} {language === 'hi' ? 'बोरी' : 'Bags'}
                </ThemedText>
              </View>

              {/* Primary bag card (DAP or SSP) */}
              <View style={[styles.fertilizerPrescriptionRow, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.prescriptionIconContainer, { backgroundColor: 'rgba(25, 118, 210, 0.1)' }]}>
                  <ThemedText type="smallBold" style={{ color: '#1976D2' }}>P</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">
                    {dosage.fertilizerSource === 'dap'
                      ? (language === 'hi' ? 'डीएपी (DAP)' : 'DAP (18% N, 46% P)')
                      : (language === 'hi' ? 'एसएसपी (SSP)' : 'SSP (16% P)')}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {language === 'hi' ? `${dosage.primaryWeight} किलोग्राम` : `${dosage.primaryWeight} kg total weight`}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.primary }}>
                  {dosage.primaryBags} {language === 'hi' ? 'बोरी' : 'Bags'}
                </ThemedText>
              </View>

              {/* MOP bag card */}
              <View style={[styles.fertilizerPrescriptionRow, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.prescriptionIconContainer, { backgroundColor: 'rgba(56, 142, 60, 0.1)' }]}>
                  <ThemedText type="smallBold" style={{ color: '#388E3C' }}>K</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">
                    {language === 'hi' ? 'एमओपी (MOP)' : 'MOP (60% K)'}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {language === 'hi' ? `${dosage.mopWeight} किलोग्राम` : `${dosage.mopWeight} kg total weight`}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.primary }}>
                  {dosage.mopBags} {language === 'hi' ? 'बोरी' : 'Bags'}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.badgeItem, { backgroundColor: theme.backgroundElement, borderLeftColor: theme.primary, borderLeftWidth: 3, marginTop: Spacing.two }]}>
              <ThemedText type="small" style={{ fontSize: 11, fontStyle: 'italic', color: theme.textSecondary }}>
                {language === 'hi'
                  ? '* गणना 45 किग्रा यूरिया और 50 किग्रा अन्य उर्वरक बोरियों के आधार पर की गई है।'
                  : '* Calculations are based on standard 45kg bags for Urea and 50kg bags for DAP/SSP/MOP.'}
              </ThemedText>
            </View>
          </ThemedView>

          {/* Collapsible Trigger for Detailed Diagnostics */}
          <Pressable
            onPress={() => setShowDiagnostics(!showDiagnostics)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: Spacing.two,
                paddingHorizontal: Spacing.three,
                borderRadius: Spacing.two,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                gap: Spacing.one,
                marginTop: Spacing.one,
                marginBottom: Spacing.one,
              },
              pressed && { opacity: 0.8 }
            ]}
          >
            <SymbolView
              name={showDiagnostics ? 'chevron.up' : ({ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' } as any)}
              size={16}
              tintColor={theme.primary}
            />
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {showDiagnostics 
                ? (language === 'hi' ? 'विस्तृत रिपोर्ट छुपाएं' : 'Hide Detailed Analysis & NPK Targets')
                : (language === 'hi' ? 'विस्तृत रिपोर्ट और पोषक तत्व मापदंड देखें' : 'See Detailed Diagnostics / NPK Targets')}
            </ThemedText>
          </Pressable>

          {showDiagnostics ? (
            <View style={{ gap: Spacing.two }}>
              {/* Soil Badges / Recommendations */}
              <ThemedView type="card" style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card, gap: Spacing.two }]}>
                <ThemedText type="smallBold" style={{ fontSize: 15 }}>
                  {language === 'hi' ? 'मिट्टी का स्वास्थ्य विश्लेषण' : 'Soil Health Analysis'}
                </ThemedText>

                <View style={{ gap: Spacing.one }}>
                  {/* pH Badges */}
                  {dosage.pHVal !== null && (
                    <View style={[styles.badgeItem, { backgroundColor: theme.backgroundElement }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                        <View style={[styles.statusDot, { backgroundColor: dosage.pHRating === 'neutral' ? '#4CAF50' : '#FF9800' }]} />
                        <ThemedText type="smallBold" style={{ fontSize: 13 }}>
                          pH: {dosage.pHVal} {`(${dosage.pHRating === 'acidic' ? (language === 'hi' ? 'अम्लीय' : 'Acidic') : dosage.pHRating === 'alkaline' ? (language === 'hi' ? 'क्षारीय' : 'Alkaline') : (language === 'hi' ? 'उदासीन/स्वस्थ' : 'Neutral')})`}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                        {language === 'hi' ? dosage.pHAmendingTipHi : dosage.pHAmendingTipEn}
                      </ThemedText>
                    </View>
                  )}

                  {/* Organic Carbon Badge */}
                  {dosage.ocVal !== null && (
                    <View style={[styles.badgeItem, { backgroundColor: theme.backgroundElement }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                        <View style={[styles.statusDot, { backgroundColor: dosage.ocRating === 'high' ? '#4CAF50' : dosage.ocRating === 'medium' ? '#8BC34A' : '#F44336' }]} />
                        <ThemedText type="smallBold" style={{ fontSize: 13 }}>
                          {language === 'hi' ? 'जैविक कार्बन' : 'Organic Carbon'}: {dosage.ocVal}% {`(${dosage.ocRating === 'low' ? (language === 'hi' ? 'कम' : 'Low') : dosage.ocRating === 'medium' ? (language === 'hi' ? 'मध्यम' : 'Medium') : (language === 'hi' ? 'अधिक' : 'High')})`}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                        {language === 'hi' ? dosage.ocTipHi : dosage.ocTipEn}
                      </ThemedText>
                    </View>
                  )}

                  {/* NPK Quick Ratings */}
                  <View style={{ flexDirection: 'row', gap: Spacing.one, marginTop: Spacing.one }}>
                    {dosage.nRating && (
                      <View style={[styles.ratingMiniPill, { flex: 1, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                        <ThemedText type="code" style={{ fontSize: 10, color: '#D32F2F', fontWeight: 'bold' }}>N</ThemedText>
                        <ThemedText type="smallBold" style={{ fontSize: 10 }}>
                          {dosage.nRating === 'low' ? (language === 'hi' ? 'कम' : 'Low') : dosage.nRating === 'medium' ? (language === 'hi' ? 'मध्यम' : 'Med') : (language === 'hi' ? 'अधिक' : 'High')}
                        </ThemedText>
                      </View>
                    )}
                    {dosage.pRating && (
                      <View style={[styles.ratingMiniPill, { flex: 1, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                        <ThemedText type="code" style={{ fontSize: 10, color: '#1976D2', fontWeight: 'bold' }}>P</ThemedText>
                        <ThemedText type="smallBold" style={{ fontSize: 10 }}>
                          {dosage.pRating === 'low' ? (language === 'hi' ? 'कम' : 'Low') : dosage.pRating === 'medium' ? (language === 'hi' ? 'मध्यम' : 'Med') : (language === 'hi' ? 'अधिक' : 'High')}
                        </ThemedText>
                      </View>
                    )}
                    {dosage.kRating && (
                      <View style={[styles.ratingMiniPill, { flex: 1, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                        <ThemedText type="code" style={{ fontSize: 10, color: '#388E3C', fontWeight: 'bold' }}>K</ThemedText>
                        <ThemedText type="smallBold" style={{ fontSize: 10 }}>
                          {dosage.kRating === 'low' ? (language === 'hi' ? 'कम' : 'Low') : dosage.kRating === 'medium' ? (language === 'hi' ? 'मध्यम' : 'Med') : (language === 'hi' ? 'अधिक' : 'High')}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </ThemedView>

              {/* Targets Comparison Table */}
              <ThemedView type="card" style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card, gap: Spacing.two }]}>
                <ThemedText type="smallBold" style={{ fontSize: 15 }}>
                  {language === 'hi' ? 'अपेक्षित पोषक तत्वों की तुलना (NPK)' : 'NPK Nutrient Target Adjustments'}
                </ThemedText>
                
                <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText type="code" style={{ fontSize: 11, flex: 1 }}>{language === 'hi' ? 'तत्व' : 'NUTRIENT'}</ThemedText>
                    <ThemedText type="code" style={{ fontSize: 11, width: 90, textAlign: 'right' }}>{language === 'hi' ? 'सामान्य RDF' : 'BASE RDF'}</ThemedText>
                    <ThemedText type="code" style={{ fontSize: 11, width: 90, textAlign: 'right', color: theme.primary }}>{language === 'hi' ? 'संशोधित लक्ष्य' : 'SOIL TARGET'}</ThemedText>
                  </View>
                </View>

                <View style={{ gap: Spacing.one }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText type="smallBold" style={{ flex: 1, color: '#D32F2F' }}>Nitrogen (N)</ThemedText>
                    <ThemedText type="small" style={{ width: 90, textAlign: 'right' }}>{dosage.baseN} kg</ThemedText>
                    <ThemedText type="smallBold" style={{ width: 90, textAlign: 'right', color: theme.primary }}>{dosage.targetN} kg</ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText type="smallBold" style={{ flex: 1, color: '#1976D2' }}>Phosphorus (P)</ThemedText>
                    <ThemedText type="small" style={{ width: 90, textAlign: 'right' }}>{dosage.baseP} kg</ThemedText>
                    <ThemedText type="smallBold" style={{ width: 90, textAlign: 'right', color: theme.primary }}>{dosage.targetP} kg</ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText type="smallBold" style={{ flex: 1, color: '#388E3C' }}>Potassium (K)</ThemedText>
                    <ThemedText type="small" style={{ width: 90, textAlign: 'right' }}>{dosage.baseK} kg</ThemedText>
                    <ThemedText type="smallBold" style={{ width: 90, textAlign: 'right', color: theme.primary }}>{dosage.targetK} kg</ThemedText>
                  </View>
                </View>
              </ThemedView>
            </View>
          ) : null}
        </View>
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
  uploadBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {}
    })
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 180,
    width: '100%',
    borderRadius: Spacing.two,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: Spacing.one,
    marginBottom: Spacing.one
  },
  imagePreview: {
    width: '100%',
    height: '100%'
  },
  removeImageBtn: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    borderRadius: 15,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3
  },
  resultContainer: {
    gap: Spacing.two
  },
  badgeItem: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ratingMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    gap: 6
  },
  fertilizerPrescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    gap: Spacing.two
  },
  prescriptionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  simpleParamRow: {
    gap: Spacing.one,
  },
  simpleParamLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8
  },
  pillContainer: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  pillBtn: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  pillText: {
    fontSize: 11,
    textAlign: 'center',
  }
});
