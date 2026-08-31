import React, { useState, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LocalStorage } from '@/utils/storage';
import { useAuth } from '@/context/auth-context';
import { fetchDynamicSchemes, diagnoseCropDisease, type Scheme, type DiagnosisResult } from '@/services/ai-service';
import * as ImagePicker from 'expo-image-picker';
import cropsData from '@/constants/crops.json';

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

  useFocusEffect(
    React.useCallback(() => {
      const loadLanguage = async () => {
        const savedLang = await LocalStorage.getItem('chat_lang');
        if (savedLang === 'hi' || savedLang === 'en') {
          setLanguage(savedLang);
        }
      };
      loadLanguage();
    }, [])
  );

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
  const [activeView, setActiveView] = useState<'main' | 'calc' | 'pest' | 'scheme'>('main');

  const { farmState, farmCrop } = useAuth();

  // AI Schemes state
  const [schemesList, setSchemesList] = useState<Scheme[]>([]);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(false);

  // AI Diagnosis state
  const [diagnosisCrop, setDiagnosisCrop] = useState('');
  const [cropSearchQuery, setCropSearchQuery] = useState('');
  const [diagnosisSymptoms, setDiagnosisSymptoms] = useState('');

  // Auto-prefill diagnosis crop based on user profile and language
  useEffect(() => {
    if (farmCrop) {
      setDiagnosisCrop(formatLabel(farmCrop));
    }
  }, [farmCrop, language]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);

  // Diagnosis History Type & State
  interface DiagnosisHistoryItem {
    id: string;
    crop: string;
    symptoms: string;
    image: string | null;
    result: DiagnosisResult;
    timestamp: string;
  }
  const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisHistoryItem[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Animation for scanning line
  const [scanAnim] = useState(() => new Animated.Value(0));
  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180]
  });

  // Set default crop in diagnosis input when farmCrop changes
  useEffect(() => {
    if (farmCrop) {
      const cleanCrop = farmCrop.split('(')[0].trim();
      setDiagnosisCrop(cleanCrop);
    }
  }, [farmCrop]);

  // Load diagnosis history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyData = await LocalStorage.getItem('pest_diagnosis_history');
        if (historyData) {
          setDiagnosisHistory(JSON.parse(historyData));
        }
      } catch (err) {
        console.error('[ExploreScreen] Error loading diagnosis history:', err);
      }
    };
    loadHistory();
  }, []);

  // Loop the scanning line animation during diagnosis
  useEffect(() => {
    if (isDiagnosing) {
      scanAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [isDiagnosing]);

  // Select or take a photo using expo-image-picker
  const pickImage = async (useCamera: boolean) => {
    try {
      if (Platform.OS !== 'web') {
        const permissionResult = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.status !== 'granted') {
          Alert.alert(
            language === 'hi' ? 'अनुमति आवश्यक' : 'Permission Required',
            language === 'hi'
              ? (useCamera ? 'फोटो लेने के लिए कैमरा अनुमति की आवश्यकता है।' : 'फोटो चुनने के लिए गैलरी अनुमति की आवश्यकता है।')
              : (useCamera ? 'Camera permission is required to capture photos.' : 'Media library permission is required to select photos.')
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
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
        setUploadedImage(base64Str);
      }
    } catch (err) {
      console.error('Error selecting image:', err);
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'फोटो चुनने में समस्या आई।' : 'Failed to select image.'
      );
    }
  };

  const handleImageInput = (useCamera: boolean) => {
    if (Platform.OS === 'web') {
      pickImage(false); // Web default to file manager
    } else {
      pickImage(useCamera);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    const updated = diagnosisHistory.filter(item => item.id !== id);
    setDiagnosisHistory(updated);
    await LocalStorage.setItem('pest_diagnosis_history', JSON.stringify(updated));
  };

  const clearAllHistory = async () => {
    setDiagnosisHistory([]);
    await LocalStorage.removeItem('pest_diagnosis_history');
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Fetch dynamic schemes
  useEffect(() => {
    let isMounted = true;
    async function loadSchemes() {
      const state = farmState || 'Punjab';
      const crop = farmCrop || 'Wheat (गेहूं)';
      setIsLoadingSchemes(true);
      try {
        const data = await fetchDynamicSchemes(state, crop, language);
        if (isMounted) {
          setSchemesList(data.length > 0 ? data : SCHEMES.map(s => ({
            title: language === 'hi' ? s.title.hi : s.title.en,
            benefit: language === 'hi' ? s.benefit.hi : s.benefit.en,
            eligibility: language === 'hi' ? s.eligibility.hi : s.eligibility.en,
            documents: language === 'hi' ? s.documents.hi : s.documents.en,
          })));
        }
      } catch (err) {
        console.error('Error fetching dynamic schemes:', err);
        if (isMounted) {
          setSchemesList(SCHEMES.map(s => ({
            title: language === 'hi' ? s.title.hi : s.title.en,
            benefit: language === 'hi' ? s.benefit.hi : s.benefit.en,
            eligibility: language === 'hi' ? s.eligibility.hi : s.eligibility.en,
            documents: language === 'hi' ? s.documents.hi : s.documents.en,
          })));
        }
      } finally {
        if (isMounted) {
          setIsLoadingSchemes(false);
        }
      }
    }

    if (activeView === 'scheme') {
      loadSchemes();
    }
  }, [farmState, farmCrop, activeView, language]);

  const handleDiagnose = async () => {
    if (!diagnosisCrop || (!diagnosisSymptoms && !uploadedImage)) return;
    setIsDiagnosing(true);
    setDiagnosisResult(null);
    try {
      const result = await diagnoseCropDisease(
        diagnosisCrop,
        diagnosisSymptoms,
        uploadedImage || undefined,
        language
      );
      setDiagnosisResult(result);

      // Save to history
      const newHistoryItem: DiagnosisHistoryItem = {
        id: Math.random().toString(36).substring(7),
        crop: diagnosisCrop,
        symptoms: diagnosisSymptoms || (language === 'hi' ? 'कोई विवरण नहीं (फ़ोटो से जांच)' : 'No description (from photo)'),
        image: uploadedImage,
        result: result,
        timestamp: new Date().toISOString()
      };
      const updatedHistory = [newHistoryItem, ...diagnosisHistory];
      setDiagnosisHistory(updatedHistory);
      await LocalStorage.setItem('pest_diagnosis_history', JSON.stringify(updatedHistory));
    } catch (err) {
      console.error('Error diagnosing crop:', err);
      setDiagnosisResult({
        disease: language === 'hi' ? 'पहचान में त्रुटि' : 'Detection Error',
        symptoms: diagnosisSymptoms || 'N/A',
        organic: language === 'hi'
          ? 'कृपया दोबारा प्रयास करें। सुनिश्चित करें कि आपका इंटरनेट चालू है और पत्ती की फोटो स्पष्ट है।'
          : 'Please try again. Ensure internet is connected and leaf photo is clear.',
        chemical: language === 'hi'
          ? 'आप हमारे चैट सेक्शन में भी सीधे कृषिक मित्र से सलाह ले सकते हैं।'
          : 'You can also consult AI Mitra in the chat section directly.'
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

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
        {activeView === 'main' ? (
          <View style={styles.header}>
            <ThemedText type="smallBold" style={styles.headerTitle}>
              {language === 'hi' ? 'कृषि यूटिलिटीज' : 'Krishi Utilities'}
            </ThemedText>
            <ThemedText type="small" style={[styles.headerSub, { color: theme.textSecondary, fontWeight: '600' }]}>
              {language === 'hi' ? 'कृषि उपकरण और डेटाबेस' : 'Agronomic Tools & Database'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.subPageHeader}>
            <Pressable
              onPress={() => setActiveView('main')}
              style={({ pressed }) => [
                styles.backBtn,
                { backgroundColor: theme.backgroundElement },
                pressed && { opacity: 0.8 }
              ]}
            >
              <SymbolView
                name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any}
                size={20}
                tintColor={theme.text}
              />
            </Pressable>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" style={{ fontSize: 20 }}>
                {activeView === 'calc' && (language === 'hi' ? 'खुराक कैलकुलेटर' : 'Crop Input Calculator')}
                {activeView === 'pest' && (language === 'hi' ? 'एआई फसल रोग निदान' : 'AI Crop Disease Diagnosis')}
                {activeView === 'scheme' && (language === 'hi' ? 'सरकारी योजनाएं' : 'Government Schemes')}
              </ThemedText>
            </View>
          </View>
        )}

        {activeView === 'main' ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, contentPlatformStyle]}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => setActiveView('calc')}
              style={({ pressed }) => [
                styles.optionCard,
                { borderColor: theme.border, backgroundColor: theme.card },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
              ]}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.12)' }]}>
                <SymbolView
                  name={{ ios: 'plus.minus.and.percent', android: 'calculate', web: 'calculate' } as any}
                  size={24}
                  tintColor={theme.primary}
                />
              </View>
              <View style={styles.optionContent}>
                <ThemedText type="smallBold" style={[styles.optionTitle, { color: theme.text }]}>
                  {language === 'hi' ? 'खुराक कैलकुलेटर' : 'Crop Input Calculator'}
                </ThemedText>
                <ThemedText type="small" style={[styles.optionDescription, { color: theme.textSecondary }]}>
                  {language === 'hi'
                    ? 'अपनी भूमि के क्षेत्रफल के अनुसार बीज दर, सिंचाई चक्र और उर्वरक आवश्यकताओं की गणना करें।'
                    : 'Calculate seed rates, irrigation counts, and fertilizer requirements (NPK) according to your acreage.'}
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                size={18}
                tintColor={theme.textSecondary}
              />
            </Pressable>

            <Pressable
              onPress={() => setActiveView('pest')}
              style={({ pressed }) => [
                styles.optionCard,
                { borderColor: theme.border, backgroundColor: theme.card },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
              ]}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(244, 67, 54, 0.12)' }]}>
                <SymbolView
                  name={{ ios: 'ladybug.fill', android: 'bug_report', web: 'bug_report' } as any}
                  size={24}
                  tintColor="#EF5350"
                />
              </View>
              <View style={styles.optionContent}>
                <ThemedText type="smallBold" style={[styles.optionTitle, { color: theme.text }]}>
                  {language === 'hi' ? 'एआई फसल रोग निदान' : 'AI Crop Disease Diagnosis'}
                </ThemedText>
                <ThemedText type="small" style={[styles.optionDescription, { color: theme.textSecondary }]}>
                  {language === 'hi'
                    ? 'फसल की बीमारी का निदान करने के लिए पत्ती की फोटो लें और जैविक व रासायनिक उपचार तुरंत पाएं।'
                    : 'Describe symptoms or take a photo of the infected crop to diagnose the disease and get treatments.'}
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                size={18}
                tintColor={theme.textSecondary}
              />
            </Pressable>

            <Pressable
              onPress={() => setActiveView('scheme')}
              style={({ pressed }) => [
                styles.optionCard,
                { borderColor: theme.border, backgroundColor: theme.card },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
              ]}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(33, 150, 243, 0.12)' }]}>
                <SymbolView
                  name={{ ios: 'scroll.fill', android: 'description', web: 'description' } as any}
                  size={24}
                  tintColor="#2196F3"
                />
              </View>
              <View style={styles.optionContent}>
                <ThemedText type="smallBold" style={[styles.optionTitle, { color: theme.text }]}>
                  {language === 'hi' ? 'सरकारी योजनाएं' : 'Government Schemes'}
                </ThemedText>
                <ThemedText type="small" style={[styles.optionDescription, { color: theme.textSecondary }]}>
                  {language === 'hi'
                    ? 'कृषि लोन, पीएम किसान सम्मान निधि और राज्य कृषि सब्सिडी व योजनाओं का विवरण देखें।'
                    : 'View government agricultural loans, PM Kisan Nidhi, state subsidies and schemes details.'}
                </ThemedText>
              </View>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                size={18}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              contentPlatformStyle,
              activeView === 'pest' && { flexGrow: 1, justifyContent: 'center' }
            ]}
            showsVerticalScrollIndicator={false}
          >
            {activeView === 'calc' && (
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
                          <ThemedText type="code" style={[styles.cropPillText, calcCrop === crop ? { color: theme.onPrimary, fontWeight: '700' } : { color: theme.text }]}>
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

          {activeView === 'pest' && (
            <View style={styles.sectionContainer}>
              {/* AI Diagnostic Center Card */}
              <ThemedView type="card" style={[styles.card, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" style={styles.cardTitle}>
                  {language === 'hi' ? 'एआई फसल रोग निदान' : 'AI Crop Disease Diagnosis'}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.two }}>
                  {language === 'hi'
                    ? 'फ़ोटो अपलोड करें और फसल की बीमारी तुरंत पहचानें।'
                    : 'Upload photo to diagnose disease instantly.'}
                </ThemedText>

                <View style={{ gap: Spacing.three }}>
                  {/* Select Crop Pills Row */}
                  <View style={{ gap: Spacing.one }}>
                    <ThemedText type="code" style={styles.formLabel}>
                      {language === 'hi' ? 'फसल चुनें' : 'SELECT CROP'}
                    </ThemedText>

                    {/* Crop Search Bar */}
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
                        marginBottom: Spacing.one
                      }}
                      value={cropSearchQuery}
                      onChangeText={setCropSearchQuery}
                      placeholder={language === 'hi' ? 'फसल का नाम खोजें (जैसे: आलू, गेहूँ)...' : 'Search crop name (e.g. Potato, Wheat)...'}
                      placeholderTextColor={theme.textSecondary}
                      clearButtonMode="while-editing"
                    />

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: Spacing.one, paddingVertical: Spacing.one }}
                    >
                      {cropsData
                        .filter((cropItem) =>
                          cropItem.name.toLowerCase().includes(cropSearchQuery.toLowerCase())
                        )
                        .map((cropItem) => {
                          const isSelected = formatLabel(cropItem.name) === diagnosisCrop;
                          return (
                            <Pressable
                              key={cropItem.id}
                              onPress={() => setDiagnosisCrop(formatLabel(cropItem.name))}
                              style={({ pressed }) => [
                                styles.cropPill,
                                {
                                  borderColor: isSelected ? theme.primary : theme.border,
                                  backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.12)' : theme.backgroundElement,
                                  borderWidth: isSelected ? 2 : 1
                                },
                                pressed && { opacity: 0.8 }
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

                  {/* Upload Image Section */}
                  <View style={{ gap: Spacing.one }}>
                    <ThemedText type="code" style={styles.formLabel}>
                      {language === 'hi' ? 'पौधे / पत्ती की फोटो' : 'CROP / LEAF PHOTO'}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
                      <Pressable
                        onPress={() => handleImageInput(true)}
                        disabled={isDiagnosing}
                        style={({ pressed }) => [
                          styles.uploadBtn,
                          {
                            borderColor: theme.primary,
                            borderWidth: 1.5,
                            borderStyle: 'solid',
                            backgroundColor: 'rgba(76, 175, 80, 0.08)',
                            borderRadius: Spacing.two,
                            paddingVertical: 12,
                            flex: 1,
                            alignItems: 'center'
                          },
                          (pressed || isDiagnosing) && { opacity: 0.8 }
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                          <SymbolView
                            name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as any}
                            size={16}
                            tintColor={theme.primary}
                          />
                          <ThemedText type="code" style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
                            {language === 'hi' ? 'कैमरा फोटो' : 'Take Photo'}
                          </ThemedText>
                        </View>
                      </Pressable>

                      <Pressable
                        onPress={() => handleImageInput(false)}
                        disabled={isDiagnosing}
                        style={({ pressed }) => [
                          styles.uploadBtn,
                          {
                            borderColor: theme.primary,
                            borderWidth: 1.5,
                            borderStyle: 'solid',
                            backgroundColor: 'rgba(76, 175, 80, 0.08)',
                            borderRadius: Spacing.two,
                            paddingVertical: 12,
                            flex: 1,
                            alignItems: 'center'
                          },
                          (pressed || isDiagnosing) && { opacity: 0.8 }
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                          <SymbolView
                            name={{ ios: 'photo.fill', android: 'image', web: 'image' } as any}
                            size={16}
                            tintColor={theme.primary}
                          />
                          <ThemedText type="code" style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
                            {language === 'hi' ? 'गैलरी' : 'Gallery'}
                          </ThemedText>
                        </View>
                      </Pressable>
                    </View>

                    {uploadedImage && (
                      <View style={[styles.imagePreviewContainer, { borderColor: theme.border }]}>
                        <Image
                          source={{ uri: uploadedImage }}
                          style={styles.imagePreview}
                          contentFit="cover"
                        />
                        <Pressable
                          onPress={() => setUploadedImage(null)}
                          disabled={isDiagnosing}
                          style={[styles.removeImageBtn, { backgroundColor: theme.error }]}
                        >
                          <ThemedText type="code" style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>✕</ThemedText>
                        </Pressable>

                        {isDiagnosing && (
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' }]}>
                            <Animated.View
                              style={[
                                styles.scanLine,
                                {
                                  backgroundColor: theme.success,
                                  transform: [{ translateY }]
                                }
                              ]}
                            />
                            <ActivityIndicator size="large" color={theme.success} />
                            <ThemedText type="smallBold" style={{ color: '#ffffff', marginTop: Spacing.two }}>
                              {language === 'hi' ? 'एआई पत्ती का विश्लेषण कर रहा है...' : 'AI analyzing leaf...'}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <Pressable
                    onPress={handleDiagnose}
                    disabled={isDiagnosing || !diagnosisCrop || !uploadedImage}
                    style={({ pressed }) => [
                      styles.diagnoseBtn,
                      {
                        backgroundColor: (isDiagnosing || !diagnosisCrop || !uploadedImage) ? theme.border : theme.primary,
                        borderRadius: Spacing.two,
                        paddingVertical: Spacing.two,
                        alignItems: 'center'
                      },
                      (pressed || isDiagnosing || !diagnosisCrop || !uploadedImage) && { opacity: 0.7 }
                    ]}
                  >
                    {isDiagnosing && !uploadedImage ? (
                      <ActivityIndicator size="small" color={theme.onPrimary} />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                        <SymbolView
                          name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' } as any}
                          size={15}
                          tintColor={theme.onPrimary}
                        />
                        <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                          {language === 'hi' ? 'एआई रोग निदान शुरू करें' : 'Start AI Diagnosis'}
                        </ThemedText>
                      </View>
                    )}
                  </Pressable>
                </View>
              </ThemedView>

              {/* Diagnosis Result */}
              {diagnosisResult && (
                <ThemedView type="card" style={[styles.pestCard, { borderColor: theme.success, borderWidth: 2 }]}>
                  <View style={styles.pestHeaderRow}>
                    <View style={{ flex: 1, marginRight: Spacing.two }}>
                      <ThemedText type="smallBold" style={{ fontSize: 18, color: theme.success }}>
                        {diagnosisResult.disease}
                      </ThemedText>
                      <ThemedText type="code" style={{ fontSize: 10, color: theme.primary, fontWeight: '700' }}>
                        {language === 'hi' ? 'निदान परिणाम' : 'DIAGNOSIS RESULT'}
                      </ThemedText>
                    </View>
                    <SymbolView
                      name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' } as any}
                      size={28}
                      tintColor={theme.success}
                    />
                  </View>

                  {uploadedImage && (
                    <Image
                      source={{ uri: uploadedImage }}
                      style={{ width: '100%', height: 120, borderRadius: 8, marginTop: Spacing.one }}
                      contentFit="cover"
                    />
                  )}

                  <View style={[styles.pestDivider, { backgroundColor: theme.border }]} />

                  <View style={styles.pestDetailSection}>
                    <ThemedText type="code" style={styles.pestLabel}>
                      {language === 'hi' ? 'विश्लेषण / लक्षण' : 'ANALYSIS / SYMPTOMS'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.pestValue}>
                      {diagnosisResult.symptoms}
                    </ThemedText>
                  </View>

                  <View style={styles.pestDetailSection}>
                    <ThemedText type="code" style={[styles.pestLabel, { color: theme.success }]}>
                      {language === 'hi' ? 'जैविक उपचार' : 'ORGANIC TREATMENT'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.pestValue}>
                      {diagnosisResult.organic}
                    </ThemedText>
                  </View>

                  <View style={styles.pestDetailSection}>
                    <ThemedText type="code" style={[styles.pestLabel, { color: theme.error }]}>
                      {language === 'hi' ? 'रासायनिक उपचार' : 'CHEMICAL TREATMENT'}
                    </ThemedText>
                    <ThemedText type="small" style={styles.pestValue}>
                      {diagnosisResult.chemical}
                    </ThemedText>
                  </View>

                  <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one }}>
                    <Pressable
                      onPress={() => {
                        setDiagnosisSymptoms('');
                        setUploadedImage(null);
                        setDiagnosisResult(null);
                      }}
                      style={({ pressed }) => [
                        styles.clearBtn,
                        { borderColor: theme.border, borderWidth: 1, borderRadius: Spacing.two, flex: 1, paddingVertical: Spacing.two, alignItems: 'center' },
                        pressed && { opacity: 0.8 }
                      ]}
                    >
                      <ThemedText type="code" style={{ color: theme.textSecondary, fontWeight: '700' }}>
                        {language === 'hi' ? 'साफ़ करें' : 'Clear'}
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => askAiAboutDisease(diagnosisCrop, diagnosisResult.disease)}
                      style={({ pressed }) => [
                        styles.askAiBtn,
                        { backgroundColor: theme.primary, borderRadius: Spacing.two, flex: 2, paddingVertical: Spacing.two, alignItems: 'center', marginTop: 0 },
                        pressed && { opacity: 0.8 }
                      ]}
                    >
                      <ThemedText type="code" style={{ color: theme.onPrimary, fontWeight: '700' }}>
                        {language === 'hi' ? 'चैट में सलाह लें' : 'Consult in Chat'}
                      </ThemedText>
                    </Pressable>
                  </View>
                </ThemedView>
              )}

              {/* Diagnosis History */}
              {diagnosisHistory.length > 0 && (
                <View style={{ marginTop: Spacing.two, gap: Spacing.two }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                      {language === 'hi' ? 'पिछली जांचें (इतिहास)' : 'Diagnosis History'}
                    </ThemedText>
                    <Pressable onPress={clearAllHistory}>
                      <ThemedText type="code" style={{ color: theme.error, fontWeight: '700' }}>
                        {language === 'hi' ? 'इतिहास साफ़ करें' : 'Clear History'}
                      </ThemedText>
                    </Pressable>
                  </View>

                  {diagnosisHistory.map((item) => {
                    const isExpanded = expandedHistoryId === item.id;
                    return (
                      <ThemedView key={item.id} type="card" style={[styles.pestCard, { borderColor: theme.border }]}>
                        <Pressable onPress={() => setExpandedHistoryId(isExpanded ? null : item.id)}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                            {item.image ? (
                              <Image
                                source={{ uri: item.image }}
                                style={{ width: 50, height: 50, borderRadius: 8 }}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center' }}>
                                <SymbolView
                                  name={{ ios: 'doc.plaintext', android: 'description', web: 'description' } as any}
                                  size={20}
                                  tintColor={theme.textSecondary}
                                />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                                {item.result.disease}
                              </ThemedText>
                              <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                                {language === 'hi' ? `फसल: ${item.crop}` : `Crop: ${item.crop}`} • {formatDate(item.timestamp)}
                              </ThemedText>
                            </View>
                            <SymbolView
                              name={{ ios: isExpanded ? 'chevron.up' : 'chevron.down', android: isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down', web: isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down' } as any}
                              size={18}
                              tintColor={theme.textSecondary}
                            />
                          </View>
                        </Pressable>

                        {isExpanded && (
                          <View style={{ marginTop: Spacing.two, gap: Spacing.two }}>
                            <View style={[styles.pestDivider, { backgroundColor: theme.border }]} />

                            <View style={styles.pestDetailSection}>
                              <ThemedText type="code" style={styles.pestLabel}>
                                {language === 'hi' ? 'लक्षण' : 'SYMPTOMS'}
                              </ThemedText>
                              <ThemedText type="small" style={styles.pestValue}>
                                {item.symptoms}
                              </ThemedText>
                            </View>

                            <View style={styles.pestDetailSection}>
                              <ThemedText type="code" style={[styles.pestLabel, { color: theme.success }]}>
                                {language === 'hi' ? 'जैविक उपचार' : 'ORGANIC TREATMENT'}
                              </ThemedText>
                              <ThemedText type="small" style={styles.pestValue}>
                                {item.result.organic}
                              </ThemedText>
                            </View>

                            <View style={styles.pestDetailSection}>
                              <ThemedText type="code" style={[styles.pestLabel, { color: theme.error }]}>
                                {language === 'hi' ? 'रासायनिक उपचार' : 'CHEMICAL TREATMENT'}
                              </ThemedText>
                              <ThemedText type="small" style={styles.pestValue}>
                                {item.result.chemical}
                              </ThemedText>
                            </View>

                            <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one }}>
                              <Pressable
                                onPress={() => deleteHistoryItem(item.id)}
                                style={({ pressed }) => [
                                  styles.clearBtn,
                                  { borderColor: theme.error, borderWidth: 1, borderRadius: Spacing.two, flex: 1, paddingVertical: Spacing.two, alignItems: 'center' },
                                  pressed && { opacity: 0.8 }
                                ]}
                              >
                                <ThemedText type="code" style={{ color: theme.error, fontWeight: '700' }}>
                                  {language === 'hi' ? 'हटाएं' : 'Delete'}
                                </ThemedText>
                              </Pressable>

                              <Pressable
                                onPress={() => askAiAboutDisease(item.crop, item.result.disease)}
                                style={({ pressed }) => [
                                  styles.askAiBtn,
                                  { backgroundColor: theme.primary, borderRadius: Spacing.two, flex: 2, paddingVertical: Spacing.two, alignItems: 'center', marginTop: 0 },
                                  pressed && { opacity: 0.8 }
                                ]}
                              >
                                <ThemedText type="code" style={{ color: theme.onPrimary, fontWeight: '700' }}>
                                  {language === 'hi' ? 'चैट में सलाह लें' : 'Consult in Chat'}
                                </ThemedText>
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </ThemedView>
                    );
                  })}
                </View>
              )}

              {/* Standard Directory */}
              <ThemedText type="smallBold" style={styles.sectionHeading}>
                {language === 'hi' ? 'सामान्य कीट और रोग निर्देशिका' : 'Common Pests & Disease Index'}
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
                        tintColor={theme.onPrimary}
                      />
                      <ThemedText type="code" style={{ color: theme.onPrimary, fontWeight: '700', flexShrink: 1 }}>
                        {language === 'hi' ? 'इस बीमारी के बारे में एआई मित्रा से सलाह लें' : 'Consult AI Mitra about this disease'}
                      </ThemedText>
                    </View>
                  </Pressable>
                </ThemedView>
              ))}
            </View>
          )}

          {activeView === 'scheme' && (
            <View style={styles.sectionContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText type="smallBold" style={styles.sectionHeading}>
                  {language === 'hi' ? 'कृषि कल्याणकारी योजनाएं' : 'Agricultural Welfare Schemes'}
                </ThemedText>
                {farmState && (
                  <ThemedText type="code" style={{ fontSize: 10, color: theme.primary, fontWeight: '700', marginTop: Spacing.one }}>
                    {formatLabel(farmState)} • {formatLabel(farmCrop || 'Wheat (गेहूं)')}
                  </ThemedText>
                )}
              </View>

              {isLoadingSchemes ? (
                <View style={{ paddingVertical: Spacing.four, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.two }}>
                    {language === 'hi' ? 'आपके राज्य के लिए योजनाएं लोड हो रही हैं...' : 'Loading schemes for your state...'}
                  </ThemedText>
                </View>
              ) : (
                schemesList.map((scheme, index) => (
                  <ThemedView key={index} type="card" style={[styles.schemeCard, { borderColor: theme.border }]}>
                    <View style={styles.schemeHeader}>
                      <ThemedText type="smallBold" style={{ fontSize: 16, color: theme.primary, flex: 1, marginRight: Spacing.two }}>
                        {scheme.title}
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
                        {scheme.benefit}
                      </ThemedText>
                    </View>

                    <View style={styles.pestDetailSection}>
                      <ThemedText type="code" style={styles.pestLabel}>
                        {language === 'hi' ? 'पात्रता' : 'ELIGIBILITY'}
                      </ThemedText>
                      <ThemedText type="small" style={styles.pestValue}>
                        {scheme.eligibility}
                      </ThemedText>
                    </View>

                    <View style={styles.pestDetailSection}>
                      <ThemedText type="code" style={styles.pestLabel}>
                        {language === 'hi' ? 'आवश्यक दस्तावेज' : 'REQUIRED DOCUMENTS'}
                      </ThemedText>
                      <ThemedText type="small" style={styles.pestValue}>
                        {scheme.documents}
                      </ThemedText>
                    </View>
                  </ThemedView>
                ))
              )}
            </View>
          )}
          </ScrollView>
        )}
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
    paddingBottom: Spacing.two,
    width: '100%'
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
    paddingTop: Spacing.three,
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
  },
  uploadBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {}
    })
  },
  diagnoseBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {}
    })
  },
  clearBtn: {
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
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 5
  },
  subPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
    width: '100%'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionContent: {
    flex: 1,
    gap: 4,
    paddingRight: Spacing.one
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2
  },
  optionDescription: {
    fontSize: 12.5,
    lineHeight: 18
  }
});
