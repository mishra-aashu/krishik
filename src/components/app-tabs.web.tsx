import React from 'react';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, useColorScheme, View, StyleSheet, useWindowDimensions, Platform } from 'react-native';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <Tabs style={[styles.tabsContainer, isMobile ? styles.mobileLayout : styles.desktopLayout]}>
      {/* If Desktop: Render header navigation at the top */}
      {!isMobile && (
        <TabList asChild>
          <CustomTabList isMobile={false}>
            <TabTrigger name="home" href="/" asChild>
              <TabButton
                iconName={{ ios: 'house.fill', web: 'home', android: 'home' }}
                label="Home"
                isMobile={false}
              />
            </TabTrigger>
            <TabTrigger name="chat" href="/chat" asChild>
              <TabButton
                iconName={{ ios: 'message.fill', web: 'chat_bubble', android: 'chat_bubble' }}
                label="Chat AI"
                isMobile={false}
              />
            </TabTrigger>
            <TabTrigger name="explore" href="/explore" asChild>
              <TabButton
                iconName={{ ios: 'square.grid.2x2.fill', web: 'widgets', android: 'widgets' }}
                label="Utilities"
                isMobile={false}
              />
            </TabTrigger>
          </CustomTabList>
        </TabList>
      )}

      {/* Main page content slot - fills the remaining space */}
      <TabSlot style={styles.tabSlot} />

      {/* If Mobile: Render navigation tab bar at the bottom */}
      {isMobile && (
        <TabList asChild>
          <CustomTabList isMobile={true}>
            <TabTrigger name="home" href="/" asChild>
              <TabButton
                iconName={{ ios: 'house.fill', web: 'home', android: 'home' }}
                label="Home"
                isMobile={true}
              />
            </TabTrigger>
            <TabTrigger name="chat" href="/chat" asChild>
              <TabButton
                iconName={{ ios: 'message.fill', web: 'chat_bubble', android: 'chat_bubble' }}
                label="Chat AI"
                isMobile={true}
              />
            </TabTrigger>
            <TabTrigger name="explore" href="/explore" asChild>
              <TabButton
                iconName={{ ios: 'square.grid.2x2.fill', web: 'widgets', android: 'widgets' }}
                label="Utilities"
                isMobile={true}
              />
            </TabTrigger>
          </CustomTabList>
        </TabList>
      )}
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  iconName: any;
  label: string;
  isMobile: boolean;
}

export function TabButton({ iconName, label, isFocused, isMobile, ...props }: TabButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        pressed && styles.pressed,
        Platform.select({
          web: {
            outlineStyle: 'none',
          } as any
        })
      ]}
    >
      <View
        style={[
          isMobile ? styles.mobileTabButton : styles.desktopTabButton,
          isFocused
            ? { backgroundColor: theme.primary, borderColor: theme.primary }
            : { backgroundColor: theme.backgroundElement, borderColor: theme.border }
        ]}
      >
        <SymbolView
          name={iconName}
          size={isMobile ? 24 : 18}
          tintColor={isFocused ? '#ffffff' : theme.textSecondary}
        />
        <ThemedText 
          type={isMobile ? "code" : "small"} 
          style={[
            isMobile ? styles.mobileTabButtonText : styles.desktopTabButtonText,
            { color: isFocused ? '#ffffff' : theme.textSecondary }
          ]}
        >
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

interface CustomTabListProps extends TabListProps {
  isMobile: boolean;
}

export function CustomTabList({ children, isMobile, ...props }: CustomTabListProps) {
  const theme = useTheme();

  return (
    <View 
      {...props} 
      style={[
        isMobile ? styles.mobileTabListContainer : styles.desktopTabListContainer,
        { backgroundColor: theme.background, borderColor: theme.border }
      ]}
    >
      <ThemedView 
        type="backgroundElement" 
        style={[
          isMobile ? styles.mobileInnerContainer : styles.desktopInnerContainer,
          { borderColor: theme.border }
        ]}
      >
        {!isMobile && (
          <ThemedText type="smallBold" style={styles.brandText}>
            Krishi Mitra (कृषि मित्र)
          </ThemedText>
        )}

        {children}

        {!isMobile && (
          <ExternalLink href="https://docs.expo.dev" asChild>
            <Pressable style={styles.externalPressable}>
              <ThemedText type="link">Docs</ThemedText>
              <SymbolView
                tintColor={theme.text}
                name={{ ios: 'arrow.up.right.square', web: 'link' }}
                size={12}
              />
            </Pressable>
          </ExternalLink>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  mobileLayout: {
    flexDirection: 'column',
  },
  desktopLayout: {
    flexDirection: 'column',
  },
  tabSlot: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  // Mobile Tab List styling (static bottom bar)
  mobileTabListContainer: {
    width: '100%',
    borderTopWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    ...Platform.select({
      web: {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingBottom: Spacing.two,
      } as any,
      default: {
        paddingBottom: Platform.OS === 'ios' ? Spacing.two : Spacing.four,
      }
    })
  },
  mobileInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: 'transparent',
    gap: 0,
  },
  mobileTabButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    gap: 4,
    minWidth: 90,
    borderWidth: 1,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any
    })
  },
  mobileTabButtonText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  // Desktop Tab List styling (top capsule header)
  desktopTabListContainer: {
    width: '100%',
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexGrow: 1,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
  },
  brandText: {
    marginRight: 'auto',
    fontSize: 16,
  },
  desktopTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any
    })
  },
  desktopTabButtonText: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    // Shared container
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginLeft: Spacing.two,
  },
});
