import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
  SafeAreaView,
  Modal,
} from 'react-native';
import { ThemedText } from './themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useThemeContext } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';
import { AppLogo } from '@/components/app-logo';
import { SymbolView } from 'expo-symbols';
import { AuthScreen } from '@/components/auth-screen';

export interface HomeScreenProps {
  onExploreDemo: () => void;
  onLoginSuccess: () => void;
}

export function HomeScreen({ onExploreDemo, onLoginSuccess }: HomeScreenProps) {
  const { colorScheme, setThemeMode, theme } = useThemeContext();
  const { language, toggleLanguage, isHi } = useLanguage();
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const isDark = colorScheme === 'dark';

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const handleLoginSuccessInternal = () => {
    setAuthModalVisible(false);
    onLoginSuccess();
  };

  // High-Contrast Theme Palette Values
  const textColor = isDark ? '#ffffff' : '#041509';
  const subTextColor = isDark ? '#E8F5E9' : '#143B1B';
  const cardBg = isDark ? 'rgba(10, 32, 18, 0.92)' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(46, 125, 50, 0.35)';
  const iconBadgeBg = isDark ? 'rgba(129, 199, 132, 0.20)' : 'rgba(46, 125, 50, 0.14)';
  const iconBadgeBorder = isDark ? 'rgba(129, 199, 132, 0.45)' : 'rgba(46, 125, 50, 0.40)';
  const iconTint = isDark ? '#81C784' : '#1B5E20';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#05140A' : '#EBF7EE' }]}>
      {/* Background Image Layer */}
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={require('@/assets/images/farm_bg.png')}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <View
          style={[
            styles.bgOverlay,
            { backgroundColor: isDark ? 'rgba(5, 20, 10, 0.85)' : 'rgba(235, 247, 237, 0.94)' }
          ]}
        />
      </View>

      {/* Top Header Navigation Bar */}
      <View
        style={[
          styles.topNavContainer,
          {
            backgroundColor: isDark ? 'rgba(5, 20, 10, 0.88)' : 'rgba(255, 255, 255, 0.96)',
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(46, 125, 50, 0.25)',
          }
        ]}
      >
        <View style={styles.topNavInner}>
          <View style={styles.topNavLogo}>
            <AppLogo size="small" showText={false} />
            <View>
              <ThemedText type="smallBold" style={{ color: textColor, fontSize: 17, fontWeight: '800' }}>
                {isHi ? 'कृषिक मित्र' : 'Krishik Mitra'}
              </ThemedText>
              <ThemedText type="small" style={{ color: iconTint, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>
                AI FOR AGRICULTURE
              </ThemedText>
            </View>
          </View>

          <View style={styles.topNavActions}>
            {/* Light / Dark Mode Toggle */}
            <Pressable
              onPress={toggleTheme}
              style={[
                styles.pillBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(46, 125, 50, 0.12)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(46, 125, 50, 0.40)',
                }
              ]}
            >
              <SymbolView
                name={{ ios: isDark ? 'sun.max.fill' : 'moon.stars.fill', android: isDark ? 'light_mode' : 'dark_mode', web: isDark ? 'light_mode' : 'dark_mode' } as any}
                size={14}
                tintColor={textColor}
              />
              <ThemedText type="smallBold" style={{ color: textColor, fontSize: 12.5 }}>
                {isDark ? (isHi ? 'लाइट' : 'Light') : (isHi ? 'डार्क' : 'Dark')}
              </ThemedText>
            </Pressable>

            {/* Language Switcher */}
            <Pressable
              onPress={toggleLanguage}
              style={[
                styles.pillBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(46, 125, 50, 0.12)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(46, 125, 50, 0.40)',
                }
              ]}
            >
              <SymbolView
                name={{ ios: 'globe', android: 'language', web: 'language' } as any}
                size={14}
                tintColor={textColor}
              />
              <ThemedText type="smallBold" style={{ color: textColor, fontSize: 12.5 }}>
                {isHi ? 'English' : 'हिंदी'}
              </ThemedText>
            </Pressable>

            {/* Login Button */}
            <Pressable
              onPress={() => setAuthModalVisible(true)}
              style={({ pressed }) => [
                styles.loginTopBtn,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.9 }
              ]}
            >
              <SymbolView
                name={{ ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' } as any}
                size={16}
                tintColor={theme.onPrimary}
              />
              <ThemedText type="smallBold" style={{ color: theme.onPrimary, fontSize: 13 }}>
                {isHi ? 'लॉगिन' : 'Login'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Main Landing Page Body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.landingWrapper}>
          
          {/* 1. Hero Showcase Section */}
          <View style={styles.heroSection}>
            <View style={[styles.heroBadge, { backgroundColor: iconBadgeBg, borderColor: iconBadgeBorder }]}>
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                size={14}
                tintColor={iconTint}
              />
              <ThemedText type="smallBold" style={{ color: iconTint, fontSize: 12, letterSpacing: 0.5 }}>
                {isHi ? 'नेक्स्ट-जनरेशन स्मार्ट एग्री-टेक' : 'NEXT-GEN SMART AGRI-TECH'}
              </ThemedText>
            </View>

            <AppLogo
              size="hero"
              language={language}
              showSubtitle={false}
              textColor={textColor}
            />

            <ThemedText type="title" style={[styles.heroHeadline, { color: textColor }]}>
              {isHi
                ? 'भारतीय किसानों के लिए एकीकृत AI कृषि क्रांति'
                : 'Empowering Indian Agriculture with Advanced AI'}
            </ThemedText>

            <ThemedText type="small" style={[styles.heroSubtext, { color: subTextColor }]}>
              {isHi
                ? 'फसल सुरक्षा, रोग निदान, लाइव मंडी भाव, मौसम एडवाइजरी एवं मृदा उर्वरक नियोजन का सम्पूर्ण डिजिटल समाधान।'
                : 'Complete digital ecosystem featuring automated pest diagnosis, real-time APMC mandi commodity rates, hyper-local weather alerts & fertilizer planning.'}
            </ThemedText>

            {/* Action Buttons */}
            <View style={styles.heroCtaRow}>
              <Pressable
                onPress={() => setAuthModalVisible(true)}
                style={({ pressed }) => [
                  styles.primaryCtaBtn,
                  { backgroundColor: theme.primary },
                  pressed && { opacity: 0.9 }
                ]}
              >
                <SymbolView
                  name={{ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' } as any}
                  size={18}
                  tintColor={theme.onPrimary}
                />
                <ThemedText type="smallBold" style={[styles.ctaText, { color: theme.onPrimary }]}>
                  {isHi ? 'लॉगिन / नया खाता बनाएँ' : 'Login / Register Account'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={onExploreDemo}
                style={({ pressed }) => [
                  styles.secondaryCtaBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.18)' : '#ffffff',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.40)' : 'rgba(46, 125, 50, 0.50)',
                  },
                  pressed && { opacity: 0.85 }
                ]}
              >
                <SymbolView
                  name={{ ios: 'play.circle.fill', android: 'play_arrow', web: 'play_arrow' } as any}
                  size={18}
                  tintColor={textColor}
                />
                <ThemedText type="smallBold" style={[styles.ctaText, { color: textColor }]}>
                  {isHi ? 'बिना लॉगिन के देखें (Demo App)' : 'Explore App Demo'}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* 2. Platform Overview Card */}
          <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.cardTitleRow}>
              <SymbolView
                name={{ ios: 'info.circle.fill', android: 'info', web: 'info' } as any}
                size={20}
                tintColor={iconTint}
              />
              <ThemedText type="subtitle" style={[styles.cardHeaderTitle, { color: textColor }]}>
                {isHi ? 'कृषिक मित्र के बारे में' : 'About Krishik Mitra'}
              </ThemedText>
            </View>
            <ThemedText type="small" style={[styles.aboutBodyText, { color: subTextColor }]}>
              {isHi
                ? 'कृषिक मित्र एक अत्याधुनिक AI आधारित एग्री-टेक प्लेटफॉर्म है जो भारतीय किसानों की दैनिक कृषि चुनौतियों का समाधान करता है। अपनी स्थानीय बोली में बोलकर परामर्श प्राप्त करें, पत्तियों की फोटो स्कैन करके 2 सेकंड में बीमारी का इलाज जानें और सीधे अपने मोबाइल पर देश भर की एपीएमसी मंडियों के ताजा भाव देखें।'
                : 'Krishik Mitra is an advanced AI agricultural platform empowering farmers across India. Get voice-enabled agronomy counsel in your regional language, diagnose crop diseases via instant camera scans, and track APMC mandi commodity prices in real time.'}
            </ThemedText>
          </View>

          {/* 3. Core Features Grid */}
          <View style={styles.sectionWrap}>
            <ThemedText type="subtitle" style={[styles.sectionHeadline, { color: textColor }]}>
              {isHi ? 'मुख्य विशेषताएं एवं सेवाएं' : 'Key Platform Capabilities'}
            </ThemedText>

            <View style={styles.featureGrid}>
              {/* Feature 1 */}
              <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.featureIconBadge, { backgroundColor: iconBadgeBg, borderColor: iconBadgeBorder }]}>
                  <SymbolView
                    name={{ ios: 'mic.bubble.fill', android: 'mic', web: 'mic' } as any}
                    size={22}
                    tintColor={iconTint}
                  />
                </View>
                <ThemedText type="smallBold" style={[styles.featureTitle, { color: textColor }]}>
                  {isHi ? 'AI कृषि सलाहकार' : 'AI Agronomy Advisor'}
                </ThemedText>
                <ThemedText type="small" style={[styles.featureDesc, { color: subTextColor }]}>
                  {isHi
                    ? 'अपनी भाषा में बोलकर या लिखकर सवाल पूछें। Groq Whisper AI आपकी आवाज समझकर तुरंत सटीक सलाह देता है।'
                    : 'Ask farming & pest questions natively using Voice Input or text with instant AI answers.'}
                </ThemedText>
              </View>

              {/* Feature 2 */}
              <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.featureIconBadge, { backgroundColor: iconBadgeBg, borderColor: iconBadgeBorder }]}>
                  <SymbolView
                    name={{ ios: 'viewfinder', android: 'crop_free', web: 'crop_free' } as any}
                    size={22}
                    tintColor={iconTint}
                  />
                </View>
                <ThemedText type="smallBold" style={[styles.featureTitle, { color: textColor }]}>
                  {isHi ? 'कीट व बीमारी स्कैन' : 'Pest Scan Diagnosis'}
                </ThemedText>
                <ThemedText type="small" style={[styles.featureDesc, { color: subTextColor }]}>
                  {isHi
                    ? 'फसल की पत्ती की फोटो खींचें और 2 सेकंड में बीमारी का नाम तथा असरदार दवाई जानें।'
                    : 'Capture leaf photos with your camera for instant AI plant disease diagnosis and remedies.'}
                </ThemedText>
              </View>

              {/* Feature 3 */}
              <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.featureIconBadge, { backgroundColor: iconBadgeBg, borderColor: iconBadgeBorder }]}>
                  <SymbolView
                    name={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' } as any}
                    size={22}
                    tintColor={iconTint}
                  />
                </View>
                <ThemedText type="smallBold" style={[styles.featureTitle, { color: textColor }]}>
                  {isHi ? 'लाइव एपीएमसी मंडी भाव' : 'Live Mandi Commodity Rates'}
                </ThemedText>
                <ThemedText type="small" style={[styles.featureDesc, { color: subTextColor }]}>
                  {isHi
                    ? 'देश भर की मंडियों के गेहूं, धान, आलू, प्याज और जिंसों के रियल-टाइम रेट देखें।'
                    : 'Real-time commodity market prices from APMC mandis across all states in India.'}
                </ThemedText>
              </View>

              {/* Feature 4 */}
              <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.featureIconBadge, { backgroundColor: iconBadgeBg, borderColor: iconBadgeBorder }]}>
                  <SymbolView
                    name={{ ios: 'cloud.sun.fill', android: 'wb_sunny', web: 'wb_sunny' } as any}
                    size={22}
                    tintColor={iconTint}
                  />
                </View>
                <ThemedText type="smallBold" style={[styles.featureTitle, { color: textColor }]}>
                  {isHi ? 'मौसम एवं वर्षा एडवाइजरी' : 'Weather & Rain Advisory'}
                </ThemedText>
                <ThemedText type="small" style={[styles.featureDesc, { color: subTextColor }]}>
                  {isHi
                    ? 'अपनी लोकेशन के अनुसार बारिश की चेतावनी, तापमान और साप्ताहिक कृषि सलाह।'
                    : 'Hyper-local rain forecasts, temperature trends, and weekly farming advisories.'}
                </ThemedText>
              </View>

              {/* Feature 5 */}
              <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.featureIconBadge, { backgroundColor: iconBadgeBg, borderColor: iconBadgeBorder }]}>
                  <SymbolView
                    name={{ ios: 'function', android: 'calculate', web: 'calculate' } as any}
                    size={22}
                    tintColor={iconTint}
                  />
                </View>
                <ThemedText type="smallBold" style={[styles.featureTitle, { color: textColor }]}>
                  {isHi ? 'मृदा व खाद कैलकुलेटर' : 'Fertilizer & Soil Calculator'}
                </ThemedText>
                <ThemedText type="small" style={[styles.featureDesc, { color: subTextColor }]}>
                  {isHi
                    ? 'एकड़ या बीघा के हिसाब से यूरिया, डीएपी और एनपीके की सटीक मात्रा निकालें।'
                    : 'Calculate precise NPK fertilizer dosage tailored to your crop and farm acreage.'}
                </ThemedText>
              </View>

              {/* Feature 6 */}
              <View style={[styles.featureCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.featureIconBadge, { backgroundColor: iconBadgeBg, borderColor: iconBadgeBorder }]}>
                  <SymbolView
                    name={{ ios: 'person.3.fill', android: 'groups', web: 'groups' } as any}
                    size={22}
                    tintColor={iconTint}
                  />
                </View>
                <ThemedText type="smallBold" style={[styles.featureTitle, { color: textColor }]}>
                  {isHi ? 'किसान चौपाल (Community)' : 'Farmer Community Feed'}
                </ThemedText>
                <ThemedText type="small" style={[styles.featureDesc, { color: subTextColor }]}>
                  {isHi
                    ? 'अन्य किसान भाइयों के साथ अनुभव साझा करें और फसल उत्पादन के तरीके सीखें।'
                    : 'Share insights, crop photos, and practical advice with fellow farmers nationwide.'}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* 4. Workflow Section */}
          <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.cardTitleRow}>
              <SymbolView
                name={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' } as any}
                size={20}
                tintColor={iconTint}
              />
              <ThemedText type="subtitle" style={[styles.cardHeaderTitle, { color: textColor }]}>
                {isHi ? 'उपयोग करने के 3 आसान चरण' : '3 Simple Steps to Get Started'}
              </ThemedText>
            </View>

            <View style={styles.stepsGrid}>
              <View style={[styles.stepCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F0F8F2', borderColor: cardBorder }]}>
                <View style={[styles.stepNumBadge, { backgroundColor: theme.primary }]}>
                  <ThemedText type="smallBold" style={{ color: theme.onPrimary, fontSize: 13 }}>1</ThemedText>
                </View>
                <ThemedText type="smallBold" style={[styles.stepTitle, { color: textColor }]}>
                  {isHi ? 'लॉगिन / रजिस्ट्रेशन करें' : 'Create Profile or Try Demo'}
                </ThemedText>
                <ThemedText type="small" style={[styles.stepDesc, { color: subTextColor }]}>
                  {isHi
                    ? 'फोन नंबर से 10 सेकंड में लॉगिन करें या सीधे डेमो चुनें।'
                    : 'Sign in with your mobile number or jump in via instant demo mode.'}
                </ThemedText>
              </View>

              <View style={[styles.stepCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F0F8F2', borderColor: cardBorder }]}>
                <View style={[styles.stepNumBadge, { backgroundColor: theme.primary }]}>
                  <ThemedText type="smallBold" style={{ color: theme.onPrimary, fontSize: 13 }}>2</ThemedText>
                </View>
                <ThemedText type="smallBold" style={[styles.stepTitle, { color: textColor }]}>
                  {isHi ? 'बोलकर या फोटो से सवाल पूछें' : 'Speak or Capture Photo'}
                </ThemedText>
                <ThemedText type="small" style={[styles.stepDesc, { color: subTextColor }]}>
                  {isHi
                    ? 'माइक दबाकर बोलें या बीमार पत्ते की फोटो क्लिक करें।'
                    : 'Tap the mic to talk in your language or upload a leaf snapshot.'}
                </ThemedText>
              </View>

              <View style={[styles.stepCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F0F8F2', borderColor: cardBorder }]}>
                <View style={[styles.stepNumBadge, { backgroundColor: theme.primary }]}>
                  <ThemedText type="smallBold" style={{ color: theme.onPrimary, fontSize: 13 }}>3</ThemedText>
                </View>
                <ThemedText type="smallBold" style={[styles.stepTitle, { color: textColor }]}>
                  {isHi ? 'सटीक AI समाधान पाएँ' : 'Get Instant AI Remedies'}
                </ThemedText>
                <ThemedText type="small" style={[styles.stepDesc, { color: subTextColor }]}>
                  {isHi
                    ? 'दवाई की सही खुराक, मंडी रेट और मौसम सलाह तुरंत पाएँ।'
                    : 'Receive tailored fertilizer doses, APMC rates and crop advisories.'}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* 5. Metrics Banner */}
          <View style={[styles.statsContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.statBox}>
              <SymbolView
                name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' } as any}
                size={24}
                tintColor={iconTint}
              />
              <ThemedText type="title" style={[styles.statNum, { color: textColor }]}>100%</ThemedText>
              <ThemedText type="small" style={[styles.statLabel, { color: subTextColor }]}>
                {isHi ? 'नि:शुल्क सेवा' : 'Free Access'}
              </ThemedText>
            </View>

            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(46, 125, 50, 0.25)' }]} />

            <View style={styles.statBox}>
              <SymbolView
                name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' } as any}
                size={24}
                tintColor={iconTint}
              />
              <ThemedText type="title" style={[styles.statNum, { color: textColor }]}>25+</ThemedText>
              <ThemedText type="small" style={[styles.statLabel, { color: subTextColor }]}>
                {isHi ? 'राज्य व मंडियाँ' : 'Indian States'}
              </ThemedText>
            </View>

            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(46, 125, 50, 0.25)' }]} />

            <View style={styles.statBox}>
              <SymbolView
                name={{ ios: 'mic.fill', android: 'mic', web: 'mic' } as any}
                size={24}
                tintColor={iconTint}
              />
              <ThemedText type="title" style={[styles.statNum, { color: textColor }]}>Voice</ThemedText>
              <ThemedText type="small" style={[styles.statLabel, { color: subTextColor }]}>
                {isHi ? 'आवाज इनपुट' : 'Native Speech'}
              </ThemedText>
            </View>
          </View>

          {/* 6. Footer Call to Action Banner */}
          <View style={[styles.bottomCtaCard, { backgroundColor: isDark ? 'rgba(15, 48, 24, 0.94)' : '#1B5E20' }]}>
            <ThemedText type="title" style={{ color: '#ffffff', textAlign: 'center', fontWeight: '800', fontSize: 22 }}>
              {isHi ? 'आज ही अपने खेत को स्मार्ट बनाएँ' : 'Transform Your Farming Today'}
            </ThemedText>
            <ThemedText type="small" style={{ color: '#E8F5E9', textAlign: 'center', maxWidth: 460 }}>
              {isHi
                ? 'कृषिक मित्र के साथ फसल की सेहत सुधारें, खाद की बचत करें और मंडियों से सही दाम पाएँ।'
                : 'Join thousands of modern farmers optimizing crop yields and mandi profitability.'}
            </ThemedText>

            <Pressable
              onPress={() => setAuthModalVisible(true)}
              style={({ pressed }) => [
                styles.bottomCtaBtn,
                { backgroundColor: '#ffffff' },
                pressed && { opacity: 0.9 }
              ]}
            >
              <SymbolView
                name={{ ios: 'arrow.right.circle.fill', android: 'arrow_forward', web: 'arrow_forward' } as any}
                size={18}
                tintColor="#1B5E20"
              />
              <ThemedText type="smallBold" style={{ color: '#1B5E20', fontSize: 16, fontWeight: '800' }}>
                {isHi ? 'अभी शुरू करें (Get Started)' : 'Get Started Now'}
              </ThemedText>
            </Pressable>
          </View>

        </View>
      </ScrollView>

      {/* Auth Screen Modal (Opened on Login/Register trigger) */}
      <Modal
        visible={authModalVisible}
        animationType="slide"
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#EBF7EE' }}>
          {/* Back button header (Top Left Opposite Side) */}
          <Pressable
            onPress={() => setAuthModalVisible(false)}
            style={[
              styles.modalCloseHeaderBtn,
              {
                backgroundColor: isDark ? 'rgba(10, 32, 18, 0.90)' : '#ffffff',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(46, 125, 50, 0.35)',
              }
            ]}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any}
              size={18}
              tintColor={textColor}
            />
            <ThemedText type="smallBold" style={{ color: textColor, fontSize: 13 }}>
              {isHi ? 'वापस (Back)' : 'Back'}
            </ThemedText>
          </Pressable>

          <AuthScreen onLoginSuccess={handleLoginSuccessInternal} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFill,
  },
  topNavContainer: {
    width: '100%',
    borderBottomWidth: 1,
    zIndex: 20,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      } as any,
      default: {},
    }),
  },
  topNavInner: {
    maxWidth: 1140,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  topNavLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topNavActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  loginTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scrollContent: {
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  landingWrapper: {
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    gap: 48,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: Spacing.four,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 8,
  },
  heroHeadline: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 48,
    maxWidth: 750,
  },
  heroSubtext: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 650,
  },
  heroCtaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginTop: Spacing.three,
    width: '100%',
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 26,
    paddingVertical: 16,
    borderRadius: 20,
    minWidth: 220,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 30px rgba(46, 125, 50, 0.45)',
      } as any,
      default: { elevation: 6 },
    }),
  },
  secondaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    minWidth: 200,
    borderWidth: 1.5,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      } as any,
      default: {},
    }),
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
  },
  glassCard: {
    borderRadius: 28,
    padding: Spacing.five,
    borderWidth: 1.2,
    gap: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
      } as any,
      default: { elevation: 6 },
    }),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  aboutBodyText: {
    fontSize: 14.5,
    lineHeight: 24,
    fontWeight: '500',
  },
  sectionWrap: {
    gap: Spacing.three,
  },
  sectionHeadline: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '31%',
    minWidth: 260,
    flexGrow: 1,
    borderRadius: 22,
    padding: Spacing.four,
    borderWidth: 1.2,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.03)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      } as any,
      default: { elevation: 5 },
    }),
  },
  featureIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  featureDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  stepCard: {
    flex: 1,
    minWidth: 240,
    borderRadius: 20,
    padding: Spacing.four,
    borderWidth: 1,
    gap: 10,
  },
  stepNumBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    borderRadius: 28,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    borderWidth: 1.2,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
      } as any,
      default: { elevation: 4 },
    }),
  },
  statBox: {
    alignItems: 'center',
    gap: 8,
  },
  statNum: {
    fontSize: 30,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 56,
  },
  bottomCtaCard: {
    borderRadius: 32,
    paddingVertical: 48,
    paddingHorizontal: Spacing.five,
    borderWidth: 0,
    alignItems: 'center',
    gap: Spacing.three,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 40px rgba(27, 94, 32, 0.25)',
      } as any,
      default: { elevation: 10 },
    }),
  },
  bottomCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 22,
    marginTop: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
      } as any,
      default: { elevation: 6 },
    }),
  },
  modalCloseHeaderBtn: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        outlineStyle: 'none',
      } as any,
      default: {
        elevation: 4,
      },
    }),
  },
});
