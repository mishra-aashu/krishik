import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { AuthScreen } from '@/components/auth-screen';

import { useFonts } from 'expo-font';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();

  const [fontsLoaded, fontError] = useFonts({
    'Pravah-Regular': require('../../assets/fonts/Pravah-Regular.ttf'),
    'Pravah-Bold': require('../../assets/fonts/Pravah-Bold.ttf'),
  });

  // If still loading authentication status or fonts, keep showing splash
  if (isLoading || (!fontsLoaded && !fontError)) {
    return <AnimatedSplashOverlay />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {isAuthenticated ? (
        <AppTabs />
      ) : (
        <AuthScreen onLoginSuccess={() => {}} />
      )}
    </ThemeProvider>
  );
}

