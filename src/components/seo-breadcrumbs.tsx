import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/context/language-context';

export interface BreadcrumbItem {
  labelHi: string;
  labelEn: string;
  onPress?: () => void;
  active?: boolean;
}

interface SEOBreadcrumbsProps {
  items: BreadcrumbItem[];
  onHomePress?: () => void;
}

export function SEOBreadcrumbs({ items, onHomePress }: SEOBreadcrumbsProps) {
  const theme = useTheme();
  const { isHi } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Home Link */}
      <Pressable
        onPress={onHomePress}
        style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
      >
        <SymbolView
          name={{ ios: 'house.fill', android: 'home', web: 'home' } as any}
          size={13}
          tintColor={theme.primary}
        />
        <ThemedText style={[styles.itemText, { color: theme.primary, fontWeight: '700' }]}>
          {isHi ? 'मुख्य पृष्ठ' : 'Home'}
        </ThemedText>
      </Pressable>

      {/* Breadcrumb Items */}
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
            size={12}
            tintColor={theme.textSecondary}
          />
          <Pressable
            onPress={item.onPress}
            disabled={!item.onPress || item.active}
            style={({ pressed }) => [
              styles.item,
              pressed && item.onPress && { opacity: 0.7 },
            ]}
          >
            <ThemedText
              style={[
                styles.itemText,
                {
                  color: item.active ? theme.text : theme.primary,
                  fontWeight: item.active ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {isHi ? item.labelHi : item.labelEn}
            </ThemedText>
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemText: {
    fontSize: 11,
  },
});
