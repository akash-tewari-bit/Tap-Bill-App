import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyCNk61lZoDfi8EZDPveiquvRiJMKxW0DV8",
  authDomain: "tap-bill.firebaseapp.com",
  projectId: "tap-bill",
  storageBucket: "tap-bill.firebasestorage.app",
  messagingSenderId: "15261734009",
  appId: "1:15261734009:web:499135cd98060ad692f0a8",
  measurementId: "G-0DW49H7VST"
};

// Initialize Firebase App
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth with platform-specific persistence
let auth;
try {
  // For native platforms, use AsyncStorage persistence
  if (Platform.OS !== 'web') {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    // For web, use default persistence
    auth = getAuth(app);
  }
} catch (error) {
  // Auth already initialized
  auth = getAuth(app);
}

export { app, auth };
