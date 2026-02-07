import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCNk61lZoDfi8EZDPveiquvRiJMKxW0DV8",
  authDomain: "tap-bill.firebaseapp.com",
  projectId: "tap-bill",
  storageBucket: "tap-bill.firebasestorage.app",
  messagingSenderId: "15261734009",
  appId: "1:15261734009:web:499135cd98060ad692f0a8",
  measurementId: "G-0DW49H7VST"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth with AsyncStorage persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Auth already initialized
  auth = getAuth(app);
}

export { app, auth };
