import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { AuthScreen } from '@/components/auth-screen';
import { ThemeProvider } from '@/context/theme-context';

import { useFonts } from 'expo-font';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();

  const [fontsLoaded, fontError] = useFonts({
    'Pravah-Regular': require('../../assets/fonts/Mukta-Regular.ttf'),
    'Pravah-Bold': require('../../assets/fonts/Mukta-Bold.ttf'),
  });

  // If still loading authentication status or fonts, keep showing splash
  if (isLoading || (!fontsLoaded && !fontError)) {
    return <AnimatedSplashOverlay />;
  }

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {isAuthenticated ? (
        <AppTabs />
      ) : (
        <AuthScreen onLoginSuccess={() => {}} />
      )}
    </NavThemeProvider>
  );
}

