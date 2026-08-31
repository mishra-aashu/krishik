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
import { Pressable, View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { usePathname } from 'expo-router';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const pathname = usePathname();
  const isChatScreen = pathname === '/chat';

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
            <TabTrigger name="profile" href="/profile" asChild>
              <TabButton
                iconName={{ ios: 'person.crop.circle.fill', web: 'account_circle', android: 'account_circle' }}
                label="Profile"
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
            <TabTrigger name="profile" href="/profile" asChild>
              <TabButton
                iconName={{ ios: 'person.crop.circle.fill', web: 'account_circle', android: 'account_circle' }}
                label="Profile"
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
          isMobile
            ? { backgroundColor: 'transparent', borderColor: 'transparent' }
            : (isFocused
                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                : { backgroundColor: theme.backgroundElement, borderColor: theme.border })
        ]}
      >
        <SymbolView
          name={iconName}
          size={isMobile ? 24 : 18}
          tintColor={isFocused ? (isMobile ? theme.primary : '#ffffff') : theme.textSecondary}
        />
        <ThemedText 
          type={isMobile ? "code" : "small"} 
          style={[
            isMobile ? styles.mobileTabButtonText : styles.desktopTabButtonText,
            { color: isFocused ? (isMobile ? theme.primary : '#ffffff') : theme.textSecondary }
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
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const isChatScreen = pathname === '/chat';

  return (
    <View 
      {...props} 
      style={[
        isMobile ? styles.mobileTabListContainer : styles.desktopTabListContainer,
        isMobile && { paddingBottom: Math.max(Spacing.two, insets.bottom) },
        { backgroundColor: theme.background, borderColor: theme.border },
        isMobile && isChatScreen && { display: 'none' }
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
            Krishik Mitra (कृषिक मित्र)
          </ThemedText>
        )}

        {children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        height: '100dvh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      } as any,
      default: {
        height: '100%',
      }
    })
  },
  mobileLayout: {
    flexDirection: 'column',
  },
  desktopLayout: {
    flexDirection: 'column',
  },
  tabSlot: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      } as any,
      default: {
        height: '100%',
      }
    })
  },
  // Mobile Tab List styling (static bottom bar)
  mobileTabListContainer: {
    width: '100%',
    borderTopWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    ...Platform.select({
      web: {
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
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    gap: 4,
    flex: 1,
    maxWidth: 120,
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
});
