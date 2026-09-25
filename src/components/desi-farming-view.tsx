import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/context/language-context';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import {
  DESI_SOLUTIONS_DATABASE,
  askAiDesiJugad,
  type DesiSolution,
} from '@/services/desi-farming-service';
import {
  startListeningSession,
  type ActiveListeningSession,
} from '@/services/speech-recognition-service';

interface DesiFarmingViewProps {
  onBack?: () => void;
  embeddedInTab?: boolean;
}

export function DesiFarmingView({ onBack, embeddedInTab = false }: DesiFarmingViewProps) {
  const theme = useTheme();
  const { isHi, toggleLanguage } = useLanguage();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>('jeevamrut');

  // AI Prompt State
  const [aiInput, setAiInput] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Voice Recognition State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [listeningSession, setListeningSession] = useState<ActiveListeningSession | null>(null);

  const activeGreen = '#059669';

  const categories = [
    { id: 'all', labelEn: 'All Remedies', labelHi: 'सभी नुस्खे' },
    { id: 'fertilizer', labelEn: 'Organic Fertilizers', labelHi: 'जैविक खाद' },
    { id: 'pest', labelEn: 'Pest & Insect Remedies', labelHi: 'कीट नियंत्रण' },
    { id: 'water', labelEn: 'Water Saving Jugad', labelHi: 'जल संरक्षण' },
    { id: 'tools', labelEn: 'DIY Farm Tools', labelHi: 'देसी उपकरण' },
  ];

  const quickPrompts = [
    { hi: 'जीवामृत बनाने का तरीका', en: 'How to make Jeevamrut' },
    { hi: 'फसल में इल्ली मारने का जुगाड़', en: 'Home remedy for caterpillars' },
    { hi: 'बोतल ड्रिप सिंचाई कैसे बनाएं', en: 'DIY bottle drip irrigation' },
    { hi: 'दीमक का देसी इलाज', en: 'Termite organic control' },
  ];

  const filteredSolutions = DESI_SOLUTIONS_DATABASE.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      item.titleHi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.benefitsHi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.benefitsEn.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleAskAi = async (promptText?: string) => {
    const queryToAsk = promptText || aiInput;
    if (!queryToAsk.trim()) return;

    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await askAiDesiJugad(queryToAsk, '', isHi ? 'hi' : 'en');
      setAiResponse(res);
    } catch (e) {
      setAiResponse(isHi ? 'उत्तर प्राप्त नहीं हो सका।' : 'Could not fetch response.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleVoice = async () => {
    if (isListening) {
      if (listeningSession) {
        const text = await listeningSession.stop();
        setListeningSession(null);
        setIsListening(false);
        if (text.trim()) {
          setAiInput(text);
          handleAskAi(text);
        }
      }
    } else {
      setIsListening(true);
      try {
        const session = await startListeningSession(isHi ? 'hi' : 'en', {
          onInterimResult: (transcription) => {
            setAiInput(transcription);
          },
          onFinalResult: (transcription) => {
            setAiInput(transcription);
            setIsListening(false);
            setListeningSession(null);
            if (transcription.trim()) {
              handleAskAi(transcription);
            }
          },
          onError: (err) => {
            console.warn('Voice error:', err);
            setIsListening(false);
            setListeningSession(null);
          },
        });
        setListeningSession(session);
      } catch (e) {
        setIsListening(false);
        setListeningSession(null);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header if standalone */}
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
              {isHi ? 'कम खर्चे वाली देसी तकनीकें' : 'Low-Cost & Desi Farming'}
            </ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              {isHi ? 'शून्य बजट प्राकृतिक खेती व देसी जुगाड़' : 'Zero Budget Organic Hacks'}
            </ThemedText>
          </View>

          <Pressable
            onPress={() => toggleLanguage()}
            style={({ pressed }) => [
              styles.langBtn,
              {
                backgroundColor: isHi ? 'rgba(5, 150, 105, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                borderColor: isHi ? '#059669' : '#2563EB',
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText style={{ fontSize: 11, fontWeight: '700', color: isHi ? '#059669' : '#2563EB' }}>
              {isHi ? 'हिंदी' : 'Eng'}
            </ThemedText>
          </Pressable>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.maxContainer, { maxWidth: MaxContentWidth }]}>
          {/* AI Desi Jugad Advisor Box */}
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={[
              styles.aiCard,
              {
                backgroundColor: theme.dark ? '#064E3B' : '#ECFDF5',
                borderColor: '#10B981',
              },
            ]}
          >
            <View style={styles.aiHeaderRow}>
              <View style={[styles.aiBadge, { backgroundColor: activeGreen }]}>
                <SymbolView
                  name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                  size={13}
                  tintColor="#FFFFFF"
                />
                <ThemedText style={styles.aiBadgeText}>
                  {isHi ? 'AI देसी विशेषज्ञ' : 'AI Desi Jugad Assistant'}
                </ThemedText>
              </View>
              <ThemedText style={[styles.aiSubText, { color: theme.dark ? '#A7F3D0' : '#047857' }]}>
                {isHi ? 'बिना रसायन खेती सलाह' : 'Organic & Low Cost Answers'}
              </ThemedText>
            </View>

            {/* Input Bar */}
            <View
              style={[
                styles.aiInputContainer,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <TextInput
                style={[styles.aiInput, { color: theme.text }]}
                placeholder={
                  isListening
                    ? isHi ? 'बोलिए... (सुन रहे हैं)' : 'Listening now...'
                    : isHi
                    ? 'बोलकर या लिखकर पूछें...'
                    : 'Ask by voice or typing...'
                }
                placeholderTextColor={isListening ? activeGreen : theme.textSecondary}
                value={aiInput}
                onChangeText={setAiInput}
                onSubmitEditing={() => handleAskAi()}
              />

              {/* Voice Mic & Submit Action Group */}
              <View style={styles.inputActionGroup}>
                <Pressable
                  onPress={handleToggleVoice}
                  style={({ pressed }) => [
                    styles.micBtn,
                    {
                      backgroundColor: isListening ? '#EF5350' : 'rgba(5, 150, 105, 0.12)',
                      borderColor: isListening ? '#EF5350' : activeGreen,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'mic.fill', android: 'mic', web: 'mic' } as any}
                    size={16}
                    tintColor={isListening ? '#FFFFFF' : activeGreen}
                  />
                </Pressable>

                <Pressable
                  onPress={() => handleAskAi()}
                  disabled={aiLoading || !aiInput.trim()}
                  style={({ pressed }) => [
                    styles.aiSubmitBtn,
                    { backgroundColor: activeGreen },
                    (aiLoading || !aiInput.trim()) && { opacity: 0.5 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  {aiLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <SymbolView
                      name={{ ios: 'arrow.up.circle.fill', android: 'send', web: 'send' } as any}
                      size={18}
                      tintColor="#FFFFFF"
                    />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Quick Prompts - Full Width Action Bars Touching Sides */}
            <View style={styles.quickPromptsRow}>
              {quickPrompts.map((qp, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    const text = isHi ? qp.hi : qp.en;
                    setAiInput(text);
                    handleAskAi(text);
                  }}
                  style={({ pressed }) => [
                    styles.quickChip,
                    {
                      backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
                      borderColor: theme.border,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={styles.quickChipIconBg}>
                      <SymbolView
                        name={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' } as any}
                        size={13}
                        tintColor="#F59E0B"
                      />
                    </View>
                    <ThemedText style={[styles.quickChipText, { color: theme.text }]}>
                      {isHi ? qp.hi : qp.en}
                    </ThemedText>
                  </View>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                    size={16}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
              ))}
            </View>

            {/* AI Generated Result Box */}
            {aiResponse && (
              <Animated.View
                entering={FadeInUp.duration(300)}
                style={[
                  styles.aiResponseBox,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.aiResponseHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <SymbolView
                      name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                      size={14}
                      tintColor={activeGreen}
                    />
                    <ThemedText style={[styles.aiResponseTitle, { color: activeGreen }]}>
                      {isHi ? 'AI देसी नुस्खा:' : 'AI Solution:'}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => setAiResponse(null)}>
                    <SymbolView
                      name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any}
                      size={16}
                      tintColor={theme.textSecondary}
                    />
                  </Pressable>
                </View>
                <ThemedText style={[styles.aiResponseContent, { color: theme.text }]}>
                  {aiResponse}
                </ThemedText>
              </Animated.View>
            )}
          </Animated.View>

          {/* Search Bar */}
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
              placeholder={isHi ? 'जीवामृत, नीमास्त्र, स्प्रे या ड्रिप खोजें...' : 'Search Jeevamrut, Neemastra, traps...'}
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any}
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            )}
          </View>

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsRow}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active
                        ? activeGreen
                        : theme.dark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)',
                      borderColor: active ? activeGreen : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.catChipText,
                      { color: active ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {isHi ? cat.labelHi : cat.labelEn}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Solution Cards List */}
          {filteredSolutions.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            return (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(idx * 60).duration(250)}
                style={[
                  styles.solutionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isExpanded ? activeGreen : theme.border,
                    borderWidth: isExpanded ? 1.5 : 1,
                  },
                ]}
              >
                {/* Header Pressable */}
                <Pressable
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  style={styles.solutionHeader}
                >
                  <View style={styles.tagsWrapRow}>
                    <View style={[styles.badgePill, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
                      <ThemedText style={[styles.badgePillText, { color: activeGreen }]}>
                        {isHi ? item.categoryHi : item.categoryEn}
                      </ThemedText>
                    </View>

                    <View style={[styles.badgePill, { backgroundColor: 'rgba(245, 158, 11, 0.12)', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <SymbolView
                        name={{ ios: 'banknote.fill', android: 'payments', web: 'payments' } as any}
                        size={11}
                        tintColor="#D97706"
                      />
                      <ThemedText style={[styles.badgePillText, { color: '#D97706' }]}>
                        {item.costEstimate}
                      </ThemedText>
                    </View>

                    <View style={[styles.badgePill, { backgroundColor: 'rgba(59, 130, 246, 0.12)', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <SymbolView
                        name={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' } as any}
                        size={11}
                        tintColor="#2563EB"
                      />
                      <ThemedText style={[styles.badgePillText, { color: '#2563EB' }]}>
                        {isHi ? item.prepTimeHi : item.prepTimeEn}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.titleRow}>
                    <ThemedText style={[styles.solutionTitle, { color: theme.text }]}>
                      {isHi ? item.titleHi : item.titleEn}
                    </ThemedText>
                    <SymbolView
                      name={{
                        ios: isExpanded ? 'chevron.up' : 'chevron.down',
                        android: isExpanded ? 'expand_less' : 'expand_more',
                        web: isExpanded ? 'expand_less' : 'expand_more',
                      } as any}
                      size={18}
                      tintColor={theme.textSecondary}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <SymbolView
                      name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                      size={13}
                      tintColor={activeGreen}
                    />
                    <ThemedText style={[styles.benefitsSnippet, { color: activeGreen, marginTop: 0 }]}>
                      {isHi ? item.benefitsHi : item.benefitsEn}
                    </ThemedText>
                  </View>
                </Pressable>

                {/* Collapsible Details */}
                {isExpanded && (
                  <View style={[styles.detailsContainer, { borderTopColor: theme.border }]}>
                    {/* Ingredients Section */}
                    <View style={styles.sectionBlock}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <SymbolView
                          name={{ ios: 'drop.fill', android: 'water_drop', web: 'water_drop' } as any}
                          size={14}
                          tintColor={activeGreen}
                        />
                        <ThemedText style={[styles.blockTitle, { color: theme.text, marginBottom: 0 }]}>
                          {isHi ? 'आवश्यक सामग्री (कम लागत):' : 'Ingredients Required:'}
                        </ThemedText>
                      </View>
                      {(isHi ? item.ingredientsHi : item.ingredientsEn).map((ing, i) => (
                        <ThemedText key={i} style={[styles.bulletItem, { color: theme.textSecondary }]}>
                          • {ing}
                        </ThemedText>
                      ))}
                    </View>

                    {/* Procedure Section */}
                    <View style={styles.sectionBlock}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <SymbolView
                          name={{ ios: 'gearshape.2.fill', android: 'settings', web: 'settings' } as any}
                          size={14}
                          tintColor={activeGreen}
                        />
                        <ThemedText style={[styles.blockTitle, { color: theme.text, marginBottom: 0 }]}>
                          {isHi ? 'बनाने की चरणबद्ध विधि:' : 'Step-by-Step Preparation:'}
                        </ThemedText>
                      </View>
                      {(isHi ? item.procedureHi : item.procedureEn).map((step, sIdx) => (
                        <ThemedText key={sIdx} style={[styles.stepItem, { color: theme.text }]}>
                          <ThemedText style={{ fontWeight: '700', color: activeGreen }}>
                            {sIdx + 1}.{' '}
                          </ThemedText>
                          {step}
                        </ThemedText>
                      ))}
                    </View>

                    {/* Usage Section */}
                    <View style={[styles.usageBox, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                        <SymbolView
                          name={{ ios: 'leaf.fill', android: 'spa', web: 'spa' } as any}
                          size={14}
                          tintColor={activeGreen}
                        />
                        <ThemedText style={[styles.usageTitle, { color: theme.text, marginBottom: 0 }]}>
                          {isHi ? 'उपयोग करने का तरीका:' : 'How to Apply:'}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.usageText, { color: theme.textSecondary }]}>
                        {isHi ? item.usageHi : item.usageEn}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
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
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginLeft: 6,
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
    paddingBottom: BottomTabInset + 80,
  },
  maxContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  aiCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  aiSubText: {
    fontSize: 11,
    fontWeight: '600',
  },
  aiInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
    paddingLeft: 14,
    paddingRight: 8,
    height: 48,
    overflow: 'hidden',
  },
  aiInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    paddingRight: 6,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      } as any,
    }),
  },
  inputActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiSubmitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickPromptsRow: {
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  quickChip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickChipIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  aiResponseBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiResponseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiResponseTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiResponseContent: {
    fontSize: 12,
    lineHeight: 18,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    padding: 0,
  },
  categoryChipsRow: {
    gap: 8,
    marginBottom: 14,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  solutionCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  solutionHeader: {
    gap: 6,
  },
  tagsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  solutionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  benefitsSnippet: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  sectionBlock: {
    gap: 4,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  bulletItem: {
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 4,
  },
  stepItem: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  usageBox: {
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  usageTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  usageText: {
    fontSize: 12,
    lineHeight: 17,
  },
});
