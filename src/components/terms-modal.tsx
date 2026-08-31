import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { ThemedText } from './themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SymbolView } from 'expo-symbols';

export interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
  language?: 'hi' | 'en';
}

export function TermsModal({
  visible,
  onClose,
  onAccept,
  language = 'hi',
}: TermsModalProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [lang, setLang] = useState<'hi' | 'en'>(language);

  const isHi = lang === 'hi';

  const handleAgree = () => {
    if (onAccept) onAccept();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            {
              maxHeight: height * 0.88,
              backgroundColor: theme.dark ? '#0D1F12' : '#FFFFFF',
              borderColor: theme.dark ? 'rgba(255,255,255,0.2)' : 'rgba(10,35,18,0.15)',
            },
          ]}
        >
          {/* Header Bar */}
          <View style={[styles.headerBar, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleRow}>
              <SymbolView
                name={{ ios: 'doc.text.fill', android: 'article', web: 'article' } as any}
                size={24}
                tintColor={theme.primary}
              />
              <ThemedText type="subtitle" style={{ fontSize: 18, fontWeight: '700' }}>
                {isHi ? 'शर्तें एवं गोपनीयता नीति' : 'Terms & Privacy Policy'}
              </ThemedText>
            </View>

            {/* Language Switcher */}
            <Pressable
              onPress={() => setLang(isHi ? 'en' : 'hi')}
              style={[styles.langBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
            >
              <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 12 }}>
                {isHi ? 'English' : 'हिंदी'}
              </ThemedText>
            </Pressable>
          </View>

          {/* Segmented Tab Switcher */}
          <View style={[styles.tabBar, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.3)' : '#F1F8E9' }]}>
            <Pressable
              onPress={() => setActiveTab('terms')}
              style={[
                styles.tabItem,
                activeTab === 'terms' && [styles.activeTab, { backgroundColor: theme.primary }],
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{
                  color: activeTab === 'terms' ? theme.onPrimary : theme.textSecondary,
                }}
              >
                {isHi ? 'सेवा की शर्तें (Terms)' : 'Terms of Service'}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('privacy')}
              style={[
                styles.tabItem,
                activeTab === 'privacy' && [styles.activeTab, { backgroundColor: theme.primary }],
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{
                  color: activeTab === 'privacy' ? theme.onPrimary : theme.textSecondary,
                }}
              >
                {isHi ? 'गोपनीयता नीति (Privacy)' : 'Privacy Policy'}
              </ThemedText>
            </Pressable>
          </View>

          {/* Scrollable Content Body */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {activeTab === 'terms' ? (
              <View style={{ gap: Spacing.two }}>
                {/* Section 1 */}
                <View style={styles.section}>
                  <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.primary }]}>
                    {isHi ? '1. प्लेटफॉर्म का उपयोग (Platform Usage)' : '1. Acceptance of Terms'}
                  </ThemedText>
                  <ThemedText type="small" style={[styles.bodyText, { color: theme.text }]}>
                    {isHi
                      ? 'कृषिक मित्र मोबाइल ऐप एवं वेबसाइट का उपयोग करके आप हमारी सभी शर्तों को स्वीकार करते हैं। यह प्लेटफॉर्म भारतीय किसानों को AI कृषि सलाह, मौसम अपडेट एवं मंडी भाव उपलब्ध कराने के उद्देश्य से बनाया गया है।'
                      : 'By registering or accessing Krishik Mitra, you agree to comply with our Terms of Service. Our platform provides AI-driven agronomy insights, weather updates, and mandi market prices for agricultural decision support.'}
                  </ThemedText>
                </View>

                {/* Section 2 */}
                <View style={styles.section}>
                  <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.primary }]}>
                    {isHi ? '2. AI कृषि सलाह डिस्क्लेमर (Agricultural Advice Disclaimer)' : '2. Agronomy Advice Disclaimer'}
                  </ThemedText>
                  <ThemedText type="small" style={[styles.bodyText, { color: theme.text }]}>
                    {isHi
                      ? 'कृषिक मित्र द्वारा दी गई सलाह (कीट नियंत्रण, खाद की मात्रा, फसल स्वास्थ्य) AI एवं डेटा मॉडल्स पर आधारित है। किसान भाई अत्यधिक गंभीर मामलों में स्थानीय कृषि विज्ञान केंद्र (KVK) या सरकारी कृषि विशेषज्ञों का परामर्श भी अवश्य लें।'
                      : 'AI advisories (pest identification, fertilizer recommendations, and weather notifications) are generated by automated intelligence models. Farmers should exercise practical agronomic judgement and consult local KVK experts for critical farm decisions.'}
                  </ThemedText>
                </View>

                {/* Section 3 */}
                <View style={styles.section}>
                  <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.primary }]}>
                    {isHi ? '3. मंडी भाव एवं मौसम डेटा (Mandi & Weather Data)' : '3. Mandi Prices & Weather Updates'}
                  </ThemedText>
                  <ThemedText type="small" style={[styles.bodyText, { color: theme.text }]}>
                    {isHi
                      ? 'मंडी के भाव सरकारी API (data.gov.in) एवं स्थानीय मंडी स्रोतों से रियल-टाइम में लिए जाते हैं। बाजार की मांग एवं समय के अनुसार भाव में मामूली उतार-चढ़ाव संभव है।'
                      : 'Mandi market prices are sourced in real-time from official government open-data portals. Minor price variations may occur based on local market conditions.'}
                  </ThemedText>
                </View>
              </View>
            ) : (
              <View style={{ gap: Spacing.two }}>
                {/* Section 1 */}
                <View style={styles.section}>
                  <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.primary }]}>
                    {isHi ? '1. डेटा सुरक्षा की गारंटी (Data Protection Guarantee)' : '1. Personal Data Privacy'}
                  </ThemedText>
                  <ThemedText type="small" style={[styles.bodyText, { color: theme.text }]}>
                    {isHi
                      ? 'आपकी व्यक्तिगत जानकारी (जैसे फोन नंबर, नाम, राज्य एवं फसल संबंधी जानकारी) सुरक्षित एनक्रिप्टेड सर्वर पर रखी जाती है। हम आपकी जानकारी किसी भी तीसरे पक्ष के साथ साझा नहीं करते।'
                      : 'Your account details (phone number, name, state, and farm profile) are encrypted and strictly protected. We never sell or expose your personal data to unauthorized third parties.'}
                  </ThemedText>
                </View>

                {/* Section 2 */}
                <View style={styles.section}>
                  <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.primary }]}>
                    {isHi ? '2. आवाज एवं लोकेशन उपयोग (Voice & Location Usage)' : '2. Voice Audio & Location Data'}
                  </ThemedText>
                  <ThemedText type="small" style={[styles.bodyText, { color: theme.text }]}>
                    {isHi
                      ? 'आवाज से सवाल पूछने पर ऑडियो केवल ट्रांसक्रिप्शन (Speech-to-Text) हेतु प्रोसेस की जाती है। स्थान (Location) का उपयोग केवल आपकी स्थानीय मंडी के भाव एवं सटीक मौसम का पूर्वानुमान दिखाने हेतु किया जाता है।'
                      : 'Voice input is processed strictly for real-time speech-to-text conversion. Geolocation coordinates are used solely to fetch hyper-local weather alerts and nearest mandi commodity prices.'}
                  </ThemedText>
                </View>

                {/* Section 3 */}
                <View style={styles.section}>
                  <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.primary }]}>
                    {isHi ? '3. यूजर अधिकार (User Control & Account Delete)' : '3. User Rights & Data Erasure'}
                  </ThemedText>
                  <ThemedText type="small" style={[styles.bodyText, { color: theme.text }]}>
                    {isHi
                      ? 'आप कभी भी अपने प्रोफाइल सेक्शन से अपना अकाउंट एवं सेव की गई जानकारी को मिटा (Delete) सकते हैं।'
                      : 'Users maintain full control over their account data and may request data deletion or clear local cache at any time directly within app settings.'}
                  </ThemedText>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Action Bar */}
          <View style={[styles.footerBar, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { borderColor: theme.border }]}
            >
              <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                {isHi ? 'बंद करें (Close)' : 'Close'}
              </ThemedText>
            </Pressable>

            {onAccept && (
              <Pressable
                onPress={handleAgree}
                style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
              >
                <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                  {isHi ? 'स्वीकार करें (I Agree)' : 'I Agree'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.two,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.45)',
      } as any,
      default: {
        elevation: 16,
      },
    }),
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  langBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 6,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      } as any,
      default: {
        elevation: 2,
      },
    }),
  },
  scrollBody: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  scrollContent: {
    paddingBottom: Spacing.two,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  closeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  acceptBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
