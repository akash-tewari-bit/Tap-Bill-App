import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { initializeSampleData } from '../services/storage';

export default function RootLayout() {
  useEffect(() => {
    // Initialize sample data on first launch
    initializeSampleData();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-order" options={{ 
          headerShown: true,
          title: 'Create Order',
          presentation: 'card'
        }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
