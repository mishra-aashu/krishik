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
            <TabTrigger name="community" href="/community" asChild>
              <TabButton
                iconName={{ ios: 'person.2.fill', web: 'groups', android: 'groups' }}
                label="Chowpal"
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
            <TabTrigger name="community" href="/community" asChild>
              <TabButton
                iconName={{ ios: 'person.2.fill', web: 'groups', android: 'groups' }}
                label="Chowpal"
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

  const textColor = isFocused
    ? (isMobile ? theme.primary : theme.onPrimary)
    : theme.textSecondary;

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        pressed && styles.pressed,
        Platform.select({
          web: {
            outlineStyle: 'none',
            cursor: 'pointer',
          } as any
        })
      ]}
    >
      <View
        style={[
          isMobile ? styles.mobileTabButton : styles.desktopTabButton,
          isMobile
            ? (isFocused
                ? [styles.mobileTabButtonActive, { backgroundColor: theme.backgroundSelected, borderColor: theme.borderAccent }]
                : { backgroundColor: 'transparent', borderColor: 'transparent' })
            : (isFocused
                ? [
                    styles.desktopTabButtonActive,
                    {
                      backgroundColor: theme.primary,
                      borderColor: theme.primaryDark,
                      ...Platform.select({
                        web: {
                          boxShadow: `0 4px 16px ${theme.tabGlow}`,
                        } as any,
                        default: {
                          shadowColor: theme.primary,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.35,
                          shadowRadius: 8,
                          elevation: 5,
                        },
                      }),
                    },
                  ]
                : [
                    styles.desktopTabButtonInactive,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ])
        ]}
      >
        <SymbolView
          name={iconName}
          size={isMobile ? 22 : 17}
          tintColor={textColor}
          style={!isFocused ? { opacity: 0.75 } : undefined}
        />
        <ThemedText 
          type={isMobile ? "code" : "small"} 
          style={[
            isMobile ? styles.mobileTabButtonText : styles.desktopTabButtonText,
            { color: textColor, fontWeight: isFocused ? '700' : '500' },
            !isFocused && { opacity: 0.85 }
          ]}
        >
          {label}
        </ThemedText>
        {isMobile && isFocused && (
          <View style={[styles.activeIndicatorDot, { backgroundColor: theme.accent }]} />
        )}
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
        {
          backgroundColor: theme.glassBackground,
          borderColor: theme.border,
          ...Platform.select({
            web: {
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            } as any,
          }),
        },
        isMobile && isChatScreen && { display: 'none' }
      ]}
    >
      <ThemedView 
        style={[
          isMobile ? styles.mobileInnerContainer : styles.desktopInnerContainer,
          {
            backgroundColor: theme.glassBackground,
            borderColor: theme.borderAccent,
            ...Platform.select({
              web: {
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: `0 8px 32px ${theme.cardShadow}`,
              } as any,
              default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 4,
              },
            }),
          }
        ]}
      >
        {!isMobile && (
          <View style={styles.brandContainer}>
            <View style={[styles.brandIconBadge, { backgroundColor: theme.backgroundSelected, borderColor: theme.borderAccent }]}>
              <SymbolView
                name={{ ios: 'laurel.leading', android: 'spa', web: 'spa' } as any}
                size={18}
                tintColor={theme.primary}
              />
            </View>
            <ThemedText type="smallBold" style={styles.brandText}>
              Krishik Mitra
            </ThemedText>
            <View style={[styles.harvestBadge, { backgroundColor: theme.accentLight }]}>
              <ThemedText style={[styles.harvestBadgeText, { color: theme.accent }]}>
                AI
              </ThemedText>
            </View>
          </View>
        )}

        <View style={isMobile ? styles.mobileButtonsRow : styles.desktopButtonsRow}>
          {children}
        </View>
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
  // Mobile Tab List styling (glass bottom bar)
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
  mobileButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  mobileTabButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    gap: 2,
    flex: 1,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        transition: 'all 0.2s ease',
      } as any
    })
  },
  mobileTabButtonActive: {
    borderWidth: 1,
  },
  activeIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  mobileTabButtonText: {
    fontSize: 10,
    marginTop: 1,
  },
  // Desktop Tab List styling (top glass capsule header)
  desktopTabListContainer: {
    width: '100%',
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  brandText: {
    fontSize: 16,
    letterSpacing: -0.3,
  },
  harvestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  harvestBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  desktopButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  desktopTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two - 2,
    paddingHorizontal: Spacing.three + 2,
    borderRadius: 20,
    gap: Spacing.one + 2,
    borderWidth: 1,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      } as any
    })
  },
  desktopTabButtonActive: {
    // Dynamic styles applied in component
  },
  desktopTabButtonInactive: {
    // Dynamic styles applied in component
  },
  desktopTabButtonText: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
