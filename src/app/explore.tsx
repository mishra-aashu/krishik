import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LocalStorage } from '@/utils/storage';

// Agronomic data constants per Acre
const AGRONOMY_PRESETS = {
  'Wheat (गेहूं)': { seed: 40, seedUnit: 'kg', n: 50, p: 20, k: 15, waterRounds: 5, waterVolume: 150000 },
  'Paddy (धान)': { seed: 8, seedUnit: 'kg (Nursery)', n: 60, p: 24, k: 20, waterRounds: 10, waterVolume: 350000 },
  'Sugarcane (गन्ना)': { seed: 2500, seedUnit: 'kg (Setts)', n: 100, p: 50, k: 40, waterRounds: 12, waterVolume: 450000 },
  'Potato (आलू)': { seed: 1000, seedUnit: 'kg (Tubers)', n: 60, p: 40, k: 60, waterRounds: 7, waterVolume: 200000 },
  'Cotton (कपास)': { seed: 2, seedUnit: 'kg', n: 60, p: 30, k: 30, waterRounds: 5, waterVolume: 180000 },
  'Mustard (सरसों)': { seed: 2, seedUnit: 'kg', n: 32, p: 16, k: 12, waterRounds: 2, waterVolume: 70000 }
};

// Pests and diseases database
const PEST_DIRECTORY = [
  {
    id: 'p1',
    crop: {
      en: 'Potato',
      hi: 'आलू'
    },
    disease: {
      en: 'Late Blight',
      hi: 'पछेती झुलसा रोग'
    },
    symptoms: {
      en: 'Water-soaked brown spots on leaf tips, fuzzy white fungal growth underneath leaves in moist weather.',
      hi: 'पत्तियों के सिरों पर पानी जैसे भीगे भूरे धब्बे, नम मौसम में पत्तियों के नीचे सफेद फफूंद की वृद्धि।'
    },
    organic: {
      en: 'Treat seeds with Trichoderma viride. Spray sour buttermilk (chaas) fermented for 10 days mixed with water, or copper hydroxide.',
      hi: 'ट्राइकोडर्मा विरिडी से बीजों का उपचार करें। पानी में मिला हुआ खट्टा मट्ठा (छाछ) या कॉपर हाइड्रोक्साइड का छिड़काव करें।'
    },
    chemical: {
      en: 'Spray Mancozeb 75 WP (2.5 g/L) or Metalaxyl + Mancozeb (2 g/L) at first sign of disease.',
      hi: 'रोग के पहले लक्षण पर मैंकोजेब 75 डब्ल्यूपी (2.5 ग्राम/लीटर) या मेटलैक्सिल + मैंकोजेब (2 ग्राम/लीटर) का छिड़काव करें।'
    }
  },
  {
    id: 'p2',
    crop: {
      en: 'Wheat',
      hi: 'गेहूं'
    },
    disease: {
      en: 'Yellow Rust',
      hi: 'पीला रतुआ'
    },
    symptoms: {
      en: 'Linear stripes of bright yellow powdery pustules (spores) on the leaf surface, which rub off easily on fingers.',
      hi: 'पत्तियों की सतह पर चमकीले पीले पाउडर जैसे धारियां बन जाना, जो उंगलियों पर आसानी से लग जाती हैं।'
    },
    organic: {
      en: 'Sow resistant varieties like HD-3086. Spray fermented liquid compost extract or dilute wood ash + sulfur mixture.',
      hi: 'एचडी-3086 जैसी रोग प्रतिरोधी किस्में बोएं। खमीरयुक्त तरल कंपोस्ट या लकड़ी की राख + सल्फर के मिश्रण का छिड़काव करें।'
    },
    chemical: {
      en: 'Spray Propiconazole 25 EC (1 ml/L) or Tebuconazole (1.5 ml/L) mixed in water.',
      hi: 'प्रोपिकोनाज़ोल 25 ईसी (1 मिली/लीटर) या टेबुकोनाज़ोल (1.5 मिली/लीटर) को पानी में मिलाकर छिड़काव करें।'
    }
  },
  {
    id: 'p3',
    crop: {
      en: 'Paddy',
      hi: 'धान'
    },
    disease: {
      en: 'Blast Disease',
      hi: 'झोंका रोग'
    },
    symptoms: {
      en: 'Spindle-shaped (eye-like) brown spots on leaves with greyish centers. Nodes and neck of panicles turn black and break.',
      hi: 'पत्तियों पर धूसर केंद्र वाले भूरे रंग के धब्बे बनना। गांठें और गर्दन काली पड़ जाती हैं और टूट जाती हैं।'
    },
    organic: {
      en: 'Treat seeds with Pseudomonas fluorescens (10g/kg seed). Avoid high nitrogen application and maintain clean bunds.',
      hi: 'स्यूडोमोनास फ्लोरेसेंस (10 ग्राम/किग्रा बीज) से बीजों का उपचार करें। अधिक नाइट्रोजन के प्रयोग से बचें और मेंडों को साफ रखें.'
    },
    chemical: {
      en: 'Spray Tricyclazole 75 WP (0.6 g/L) or Isoprothiolane 40 EC (1.5 ml/L).',
      hi: 'ट्राइसाइक्लाज़ोल 75 डब्ल्यूपी (0.6 ग्राम/लीटर) या आइसोप्रूथियोलेन 40 ईसी (1.5 मिली/लीटर) का छिड़काव करें।'
    }
  },
  {
    id: 'p4',
    crop: {
      en: 'Cotton',
      hi: 'कपास'
    },
    disease: {
      en: 'Whitefly Infestation',
      hi: 'सफेद मक्खी'
    },
    symptoms: {
      en: 'Tiny white insects under leaves. Leaves turn yellow, curl upward, and are covered with sticky honeydew attracting black mold.',
      hi: 'पत्तियों के नीचे छोटे सफेद कीड़े। पत्तियां पीली होकर ऊपर की ओर मुड़ जाती हैं और चिपचिपे पदार्थ से ढक जाती हैं।'
    },
    organic: {
      en: 'Install yellow sticky traps (10-15 per acre). Spray Neem Seed Kernel Extract (5% NSKE) or castor oil soaps.',
      hi: 'पीले चिपचिपे ट्रैप लगाएं (10-15 प्रति एकड़)। नीम के बीज के अर्क (5% NSKE) या अरंडी के तेल के साबुन का छिड़काव करें।'
    },
    chemical: {
      en: 'Spray Diafenthiuron 50 WP (1.2 g/L) or Pyriproxyfen + Fenpropathrin (2 ml/L).',
      hi: 'डाईफेंटीयूरॉन 50 डब्ल्यूपी (1.2 ग्राम/लीटर) या पायरीप्रॉक्सीफेन + फेनप्रोपैथ्रिन (2 मिली/लीटर) का छिड़काव करें।'
    }
  }
];

// Schemes database
const SCHEMES = [
  {
    title: {
      en: 'PM-KISAN Samman Nidhi',
      hi: 'पीएम-किसान सम्मान निधि'
    },
    benefit: {
      en: 'Direct income support of ₹6,000 per year in three equal installments of ₹2,000 directly into bank accounts.',
      hi: 'बैंक खातों में सीधे ₹2,000 की तीन समान किश्तों में प्रति वर्ष ₹6,000 की सीधी आय सहायता।'
    },
    eligibility: {
      en: 'All landholding farmer families in India (with minor institutional exclusions).',
      hi: 'भारत में सभी भूमिधारक किसान परिवार (मामूली संस्थागत बहिष्करणों के साथ)।'
    },
    documents: {
      en: 'Aadhaar Card, Land Record (Jamabandi/Khatauni), Bank Account details, Mobile Number.',
      hi: 'आधार कार्ड, भूमि रिकॉर्ड (जमाबंदी/खतौनी), बैंक खाता विवरण, मोबाइल नंबर।'
    }
  },
  {
    title: {
      en: 'PM Fasal Bima Yojana (PMFBY)',
      hi: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)'
    },
    benefit: {
      en: 'Crop insurance protection against natural calamities, pests, and diseases. Farmer premium is capped at 1.5% to 2% for food crops.',
      hi: 'प्राकृतिक आपदाओं, कीटों और बीमारियों के खिलाफ फसल बीमा सुरक्षा। खाद्य फसलों के लिए किसान प्रीमियम 1.5% से 2% तक सीमित है।'
    },
    eligibility: {
      en: 'All farmers growing notified crops in notified areas (both loanee and non-loanee).',
      hi: 'अधिसूचित क्षेत्रों में अधिसूचित फसलें उगाने वाले सभी किसान (ऋणी और गैर-ऋणी दोनों)।'
    },
    documents: {
      en: 'Land Possession Certificate, Sowing Certificate from Panchayat/Patwari, ID Proof, Bank Passbook.',
      hi: 'भूमि कब्जा प्रमाण पत्र, पंचायत/पटवारी से बुआई प्रमाण पत्र, पहचान पत्र, बैंक पासबुक।'
    }
  },
  {
    title: {
      en: 'Soil Health Card Scheme',
      hi: 'मृदा स्वास्थ्य कार्ड योजना'
    },
    benefit: {
      en: 'Provides printed cards showing status of 12 soil parameters (macro, secondary, and micro-nutrients) and custom fertilizer recommendations.',
      hi: '12 मृदा मापदंडों (मैक्रो, सेकेंडरी, और माइक्रो-पोषक तत्व) की स्थिति और कस्टम उर्वरक सिफारिशें दिखाने वाले कार्ड प्रदान करता है।'
    },
    eligibility: {
      en: 'All farmers holding operational agricultural land holdings.',
      hi: 'कृषि योग्य भूमि रखने वाले सभी किसान।'
    },
    documents: {
      en: 'None required (Soil samples are collected directly from fields by government agents).',
      hi: 'कोई दस्तावेज आवश्यक नहीं (सरकारी एजेंटों द्वारा सीधे खेतों से मिट्टी के नमूने एकत्र किए जाते हैं)।'
    }
  }
];

export default function ExploreScreen() {
  const router = useRouter();
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');

  const getTabLabel = (tab: 'calc' | 'pest' | 'scheme') => {
    const isHindi = language === 'hi';
    const isSmall = width < 390;
    
    if (tab === 'calc') {
      if (isSmall) return isHindi ? 'गणना' : 'Calc';
      return isHindi ? 'कैलकुलेटर' : 'Calculator';
    }
    if (tab === 'pest') {
      if (isSmall) return isHindi ? 'कीट' : 'Pests';
      return isHindi ? 'कीट निर्देशिका' : 'Pest Directory';
    }
    if (tab === 'scheme') {
      if (isSmall) return isHindi ? 'योजनाएं' : 'Schemes';
      return isHindi ? 'सरकारी योजनाएं' : 'Govt Schemes';
    }
    return '';
  };

  useEffect(() => {
    const loadLanguage = async () => {
      const savedLang = await LocalStorage.getItem('chat_lang');
      if (savedLang === 'hi' || savedLang === 'en') {
        setLanguage(savedLang);
      }
    };
    loadLanguage();
  }, []);

  const formatLabel = (text: string) => {
    if (!text) return '';
    const parts = text.split('(');
    if (parts.length < 2) return text;
    const english = parts[0].trim();
    const hindi = parts[1].replace(')', '').trim();
    return language === 'hi' ? hindi : english;
  };

  const bottomInset = safeAreaInsets.bottom + BottomTabInset + Spacing.three;
  const contentPlatformStyle = Platform.select({
    android: { paddingBottom: bottomInset },
    web: { paddingBottom: Spacing.four }
  });

  const [landArea, setLandArea] = useState('1');
  const [landUnit, setLandUnit] = useState<'acre' | 'bigha'>('acre');
  const [calcCrop, setCalcCrop] = useState('Wheat (गेहूं)');
  const [activeTab, setActiveTab] = useState<'calc' | 'pest' | 'scheme'>('calc');

  const calculateDosage = () => {
    const area = parseFloat(landArea) || 0;
    const cropPreset = AGRONOMY_PRESETS[calcCrop as keyof typeof AGRONOMY_PRESETS];
    if (!cropPreset) return null;
    const areaMultiplier = landUnit === 'acre' ? area : area / 1.6;
    return {
      seed: Math.round(cropPreset.seed * areaMultiplier * 10) / 10,
      seedUnit: cropPreset.seedUnit,
      n: Math.round(cropPreset.n * areaMultiplier * 10) / 10,
      p: Math.round(cropPreset.p * areaMultiplier * 10) / 10,
      k: Math.round(cropPreset.k * areaMultiplier * 10) / 10,
      waterRounds: cropPreset.waterRounds,
      waterVolume: Math.round(cropPreset.waterVolume * areaMultiplier)
    };
  };

  const askAiAboutDisease = (crop: string, disease: string) => {
    const query = language === 'hi'
      ? `मेरी ${crop} की फसल में ${disease} के लक्षण दिखे हैं। मुझे विस्तृत निदान, जैविक समाधान और बचाव के उपाय बताएं।`
      : `My ${crop} crop shows symptoms of ${disease}. Please provide detailed diagnosis, organic solutions, and prevention tips.`;
    router.push({
      pathname: '/chat',
      params: { prefill: query }
    });
  };

  const dosage = calculateDosage();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="smallBold" style={styles.headerTitle}>
            {language === 'hi' ? 'कृषि यूटिलिटीज' : 'Krishi Utilities'}
          </ThemedText>
          <ThemedText type="small" style={[styles.headerSub, { color: theme.textSecondary, fontWeight: '600' }]}>
            {language === 'hi' ? 'कृषि उपकरण और डेटाबेस' : 'Agronomic Tools & Database'}
          </ThemedText>
        </View>

        {/* Segmented Control Selector */}
        <View style={[styles.segmentedControl, { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            onPress={() => setActiveTab('calc')}
            style={[styles.segmentBtn, activeTab === 'calc' && [styles.segmentBtnActive, { backgroundColor: theme.card }]]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
              <SymbolView
                name={{ ios: 'plus.minus.and.percent', android: 'calculate', web: 'calculate' } as any}
                size={15}
                tintColor={activeTab === 'calc' ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                type="smallBold"
                style={[styles.segmentBtnText, activeTab === 'calc' ? { color: theme.primary } : { color: theme.textSecondary }]}
              >
                {getTabLabel('calc')}
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('pest')}
            style={[styles.segmentBtn, activeTab === 'pest' && [styles.segmentBtnActive, { backgroundColor: theme.card }]]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
              <SymbolView
                name={{ ios: 'ladybug.fill', android: 'bug_report', web: 'bug_report' } as any}
                size={15}
                tintColor={activeTab === 'pest' ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                type="smallBold"
                style={[styles.segmentBtnText, activeTab === 'pest' ? { color: theme.primary } : { color: theme.textSecondary }]}
              >
                {getTabLabel('pest')}
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('scheme')}
            style={[styles.segmentBtn, activeTab === 'scheme' && [styles.segmentBtnActive, { backgroundColor: theme.card }]]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
              <SymbolView
                name={{ ios: 'scroll.fill', android: 'description', web: 'description' } as any}
                size={15}
                tintColor={activeTab === 'scheme' ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                type="smallBold"
                style={[styles.segmentBtnText, activeTab === 'scheme' ? { color: theme.primary } : { color: theme.textSecondary }]}
              >
                {getTabLabel('scheme')}
              </ThemedText>
            </View>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, contentPlatformStyle]} showsVerticalScrollIndicator={false}>
          {activeTab === 'calc' && (
            <View style={styles.sectionContainer}>
              <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" style={styles.cardTitle}>
                  {language === 'hi' ? 'खुराक कैलकुलेटर' : 'Crop Input Calculator'}
                </ThemedText>
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
                        <ThemedText type="code" style={[styles.unitBtnText, landUnit === 'acre' ? { color: '#ffffff', fontWeight: '700' } : { color: theme.textSecondary }]}>
                          {language === 'hi' ? 'एकड़' : 'Acre'}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => setLandUnit('bigha')}
                        style={[styles.unitBtn, landUnit === 'bigha' && [styles.unitBtnActive, { backgroundColor: theme.primary }]]}
                      >
                        <ThemedText type="code" style={[styles.unitBtnText, landUnit === 'bigha' ? { color: '#ffffff', fontWeight: '700' } : { color: theme.textSecondary }]}>
                          {language === 'hi' ? 'बीघा' : 'Bigha'}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={[styles.formRow, { marginTop: Spacing.two }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="code" style={styles.formLabel}>
                      {language === 'hi' ? 'फसल का चयन करें' : 'SELECT CROP'}
                    </ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropSelectorScroll}>
                      {Object.keys(AGRONOMY_PRESETS).map((crop) => (
                        <Pressable
                          key={crop}
                          onPress={() => setCalcCrop(crop)}
                          style={[
                            styles.cropPill,
                            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                            calcCrop === crop && { backgroundColor: theme.primary }
                          ]}
                        >
                          <ThemedText type="code" style={[styles.cropPillText, calcCrop === crop ? { color: '#ffffff', fontWeight: '700' } : { color: theme.text }]}>
                            {formatLabel(crop)}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </ThemedView>

              {dosage && (
                <View style={styles.resultContainer}>
                  <ThemedText type="smallBold" style={styles.sectionHeading}>
                    {language === 'hi' ? 'अनुशंसित आवश्यकताएं' : 'Recommended Requirements'}
                  </ThemedText>

                  <ThemedView type="card" style={[styles.resultCard, { borderColor: theme.border }]}>
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

                  <ThemedView type="card" style={[styles.resultCard, { borderColor: theme.border }]}>
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

                  <ThemedView type="card" style={[styles.fertilizerCard, { borderColor: theme.border }]}>
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
                </View>
              )}
            </View>
          )}

          {activeTab === 'pest' && (
            <View style={styles.sectionContainer}>
              <ThemedText type="smallBold" style={styles.sectionHeading}>
                {language === 'hi' ? 'सामान्य कीट और रोग सूची' : 'Common Pests & Disease Index'}
              </ThemedText>

              {PEST_DIRECTORY.map((item) => (
                <ThemedView key={item.id} type="card" style={[styles.pestCard, { borderColor: theme.border }]}>
                  <View style={styles.pestHeaderRow}>
                    <View style={{ flex: 1, marginRight: Spacing.two }}>
                      <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                        {language === 'hi' ? item.disease.hi : item.disease.en}
                      </ThemedText>
                      <ThemedText type="code" style={{ fontSize: 10, color: theme.primary, fontWeight: '700' }}>
                        {language === 'hi' ? `फसल: ${item.crop.hi}` : `Crop: ${item.crop.en}`}
                      </ThemedText>
                    </View>
                    <SymbolView
                      name={{ ios: 'ladybug.fill', android: 'bug_report', web: 'bug_report' } as any}
                      size={28}
                      tintColor={theme.primary}
                    />
                  </View>

                  <View style={[styles.pestDivider, { backgroundColor: theme.border }]} />

                  <View style={styles.pestDetailSection}>
                    <ThemedText type="code" style={styles.pestLabel}>
                      {language === 'hi' ? 'लक्षण' : 'SYMPTOMS'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.pestValue}>
                      {language === 'hi' ? item.symptoms.hi : item.symptoms.en}
                    </ThemedText>
                  </View>

                  <View style={styles.pestDetailSection}>
                    <ThemedText type="code" style={[styles.pestLabel, { color: theme.success }]}>
                      {language === 'hi' ? 'जैविक उपचार' : 'ORGANIC TREATMENT'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.pestValue}>
                      {language === 'hi' ? item.organic.hi : item.organic.en}
                    </ThemedText>
                  </View>

                  <View style={styles.pestDetailSection}>
                    <ThemedText type="code" style={[styles.pestLabel, { color: theme.error }]}>
                      {language === 'hi' ? 'रासायनिक उपचार' : 'CHEMICAL TREATMENT'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.pestValue}>
                      {language === 'hi' ? item.chemical.hi : item.chemical.en}
                    </ThemedText>
                  </View>

                  <Pressable
                    onPress={() => askAiAboutDisease(item.crop.en, item.disease.en)}
                    style={({ pressed }) => [styles.askAiBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.8 }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.two }}>
                      <SymbolView
                        name={{ ios: 'cpu', android: 'smart_toy', web: 'smart_toy' } as any}
                        size={15}
                        tintColor="#ffffff"
                      />
                      <ThemedText type="code" style={{ color: '#ffffff', fontWeight: '700', flexShrink: 1 }}>
                        {language === 'hi' ? 'इस बीमारी के बारे में एआई मित्रा से सलाह लें' : 'Consult AI Mitra about this disease'}
                      </ThemedText>
                    </View>
                  </Pressable>
                </ThemedView>
              ))}
            </View>
          )}

          {activeTab === 'scheme' && (
            <View style={styles.sectionContainer}>
              <ThemedText type="smallBold" style={styles.sectionHeading}>
                {language === 'hi' ? 'कृषि कल्याणकारी योजनाएं' : 'Agricultural Welfare Schemes'}
              </ThemedText>

              {SCHEMES.map((scheme, index) => (
                <ThemedView key={index} type="card" style={[styles.schemeCard, { borderColor: theme.border }]}>
                  <View style={styles.schemeHeader}>
                    <ThemedText type="smallBold" style={{ fontSize: 16, color: theme.primary, flex: 1, marginRight: Spacing.two }}>
                      {language === 'hi' ? scheme.title.hi : scheme.title.en}
                    </ThemedText>
                    <SymbolView
                      name={{ ios: 'scroll.fill', android: 'description', web: 'description' } as any}
                      size={28}
                      tintColor={theme.primary}
                    />
                  </View>

                  <View style={[styles.pestDivider, { backgroundColor: theme.border }]} />

                  <View style={styles.pestDetailSection}>
                    <ThemedText type="code" style={styles.pestLabel}>
                      {language === 'hi' ? 'योजना लाभ' : 'BENEFIT'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.pestValue}>
                      {language === 'hi' ? scheme.benefit.hi : scheme.benefit.en}
                    </ThemedText>
                  </View>

                  <View style={styles.pestDetailSection}>
                    <ThemedText type="code" style={styles.pestLabel}>
                      {language === 'hi' ? 'पात्रता' : 'ELIGIBILITY'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.pestValue}>
                      {language === 'hi' ? scheme.eligibility.hi : scheme.eligibility.en}
                    </ThemedText>
                  </View>

                  <View style={styles.pestDetailSection}>
                    <ThemedText type="code" style={styles.pestLabel}>
                      {language === 'hi' ? 'आवश्यक दस्तावेज' : 'REQUIRED DOCUMENTS'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.pestValue}>
                      {language === 'hi' ? scheme.documents.hi : scheme.documents.en}
                    </ThemedText>
                  </View>
                </ThemedView>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column'
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center'
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two
  },
  headerTitle: {
    fontSize: 20
  },
  headerSub: {
    fontSize: 10,
    marginTop: 2
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    padding: 4,
    marginBottom: Spacing.two
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two - 2
  },
  segmentBtnActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1.5
      },
      android: {
        elevation: 2
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0,0,0,0.1)'
      }
    })
  },
  segmentBtnText: {
    fontSize: 12
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three
  },
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
  },
  pestCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two
  },
  pestHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pestDivider: {
    height: 1
  },
  pestDetailSection: {
    gap: 4
  },
  pestLabel: {
    fontSize: 9,
    fontWeight: '700'
  },
  pestValue: {
    lineHeight: 18
  },
  askAiBtn: {
    minHeight: 38,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one
  },
  schemeCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two
  },
  schemeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});
