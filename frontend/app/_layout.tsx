import { useEffect } from 'react';
import { Stack, Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { initializeSampleData } from '../services/storage';

export default function RootLayout() {
  useEffect(() => {
    // Initialize sample data on first launch
    initializeSampleData();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="create-order" options={{ 
            headerShown: true,
            title: 'Create Order',
            presentation: 'card'
          }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

