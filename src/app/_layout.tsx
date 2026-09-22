import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { HomeScreen } from '@/components/home-screen';
import { ThemeProvider } from '@/context/theme-context';
import { LanguageProvider } from '@/context/language-context';

import { useFonts } from 'expo-font';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

import { useState, useRef, useEffect } from 'react';
import { IntroPillOverlay } from '@/components/intro-pill-overlay';

function AppContent() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, register } = useAuth();
  const [showLoginIntro, setShowLoginIntro] = useState(false);
  const prevAuth = useRef(isAuthenticated);

  useEffect(() => {
    if (!prevAuth.current && isAuthenticated) {
      setShowLoginIntro(true);
    }
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated]);

  const [fontsLoaded, fontError] = useFonts({
    'Pravah-Regular': require('../../assets/fonts/Mukta-Regular.ttf'),
    'Pravah-Bold': require('../../assets/fonts/Mukta-Bold.ttf'),
  });

  // Handle Demo mode login
  const handleExploreDemo = async () => {
    await register(
      'Kisan Guest',
      '9999999999',
      'Punjab',
      'Alluvial Soil (जलोढ़)',
      'Wheat (गेहूं)',
      '1234'
    );
  };

  // If still loading authentication status or fonts, keep showing splash
  if (isLoading || (!fontsLoaded && !fontError)) {
    return <AnimatedSplashOverlay />;
  }

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {showLoginIntro && (
        <IntroPillOverlay onFinish={() => setShowLoginIntro(false)} />
      )}
      {isAuthenticated ? (
        <AppTabs />
      ) : (
        <HomeScreen
          onExploreDemo={handleExploreDemo}
          onLoginSuccess={() => setShowLoginIntro(true)}
        />
      )}
    </NavThemeProvider>
  );
}

