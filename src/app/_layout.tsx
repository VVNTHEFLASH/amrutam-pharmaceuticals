import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { router } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ToastContainer } from '@/components/toast-container';
import { ConnectionBanner } from '@/components/connection-banner';
import { AuthProvider } from '@/context/AuthContext';
import { apiCache } from '@/services/api/apiCache';
import { routerRegistry } from '@/store/toastStore';
import { BiometricGate } from '@/components/biometric-gate';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    routerRegistry.push = (path: string) => {
      try {
        router.push(path as any);
      } catch (err) {
        console.error('routerRegistry push failed:', err);
      }
    };
    apiCache.sweepExpiredEntries().catch((err) => {
      console.warn('Failed to sweep expired cache entries on startup:', err);
    });
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <ConnectionBanner />
        <BiometricGate>
          <AppTabs />
        </BiometricGate>
        <ToastContainer />
      </ThemeProvider>
    </AuthProvider>
  );
}



