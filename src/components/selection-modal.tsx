import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  Platform,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from './themed-text';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ThemedView } from './themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface SelectionModalProps {
  visible: boolean;
  title: string;
  placeholder: string;
  list: string[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function SelectionModal({
  visible,
  title,
  placeholder,
  list,
  selectedValue,
  onSelect,
  onClose,
}: SelectionModalProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  const filteredList = list.filter((item) =>
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <Animated.View
          entering={FadeInUp.springify().damping(15)}
          style={[styles.modalCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <ThemedText type="smallBold" style={styles.titleText}>{title}</ThemedText>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: theme.backgroundSelected },
                pressed && { opacity: 0.8 },
              ]}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' } as any}
                size={14}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          {/* Search Container */}
          <View style={[styles.searchContainer, { borderColor: theme.border, backgroundColor: theme.background }]}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' } as any}
              size={16}
              tintColor={theme.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              clearButtonMode="while-editing"
            />
          </View>

          {/* List */}
          <FlatList
            data={filteredList}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedValue === item;
              return (
                <Pressable
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [
                    styles.modalItem,
                    { borderBottomColor: theme.border },
                    isSelected && { backgroundColor: theme.backgroundSelected },
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={[
                      styles.itemText,
                      isSelected ? { color: theme.primary, fontWeight: '700' } : { color: theme.text },
                    ]}
                  >
                    {item}
                  </ThemedText>

                  {isSelected && (
                    <SymbolView
                      name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check' } as any}
                      size={18}
                      tintColor={theme.primary}
                    />
                  )}
                </Pressable>
              );
            }}
            style={styles.modalList}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalCard: {
    width: '95%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {},
    }),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    padding: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {},
    }),
  },
  modalList: {
    marginTop: Spacing.one,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
      default: {},
    }),
  },
  itemText: {
    fontSize: 14,
  },
});
