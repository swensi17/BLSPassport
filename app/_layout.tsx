import { AlertProvider } from '@/contexts/AlertContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ChecklistProvider } from '@/contexts/ChecklistContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Colors } from '@/constants/theme';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inTabsGroup = segments[0] === '(tabs)';
    const onAuth = !segments[0] || segments[0] === 'login' || segments[0] === 'onboarding';
    if (!isAuthenticated && inTabsGroup) {
      router.replace('/onboarding');
    } else if (isAuthenticated && onAuth) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <ChecklistProvider>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }} />
            </AuthGate>
          </ChecklistProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
