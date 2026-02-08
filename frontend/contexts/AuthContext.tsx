import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AppState, Alert } from 'react-native';
import axios from 'axios';
import { router } from 'expo-router';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

interface User {
  phoneNumber: string;
  name: string;
  isActive: boolean;
  isSuperAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  checkUserStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Check user status with backend
  const checkUserStatus = async () => {
    try {
      // Get stored token (could be dev token or Firebase token)
      const storedToken = await AsyncStorage.getItem('@authToken');
      
      // Try Firebase first for production mode
      const firebaseUser = auth.currentUser;
      let idToken = storedToken;
      
      if (firebaseUser) {
        idToken = await firebaseUser.getIdToken();
      }
      
      if (!idToken) return;

      const response = await axios.post(
        `${BACKEND_URL}/api/auth/verify-token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (response.data.success) {
        const updatedUser = response.data.user;
        
        // Check if user is still active (skip for super admins)
        if (!updatedUser.isActive && !updatedUser.isSuperAdmin) {
          // User has been deactivated - force logout
          await logout();
          Alert.alert(
            'Account Deactivated',
            'Your account has been deactivated. Please contact support for assistance.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Update user data
        await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      console.error('Status check error:', error);
      
      if (error.response?.status === 403) {
        // User is deactivated
        await logout();
        Alert.alert(
          'Account Deactivated',
          'Your account has been deactivated. Please contact support.',
          [{ text: 'OK' }]
        );
      }
      // Silently log other errors without showing to user
    }
  };

  // Load stored user on mount
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('@user');
        const storedToken = await AsyncStorage.getItem('@authToken');
        
        if (userData && storedToken) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setAuthToken(storedToken);
          setIsAuthenticated(true);
          
          // Check status with backend
          await checkUserStatus();
        }
      } catch (error) {
        console.error('Error loading stored user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();

    // Also listen to Firebase auth state changes for production mode
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in via Firebase
        try {
          const userData = await AsyncStorage.getItem('@user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setIsAuthenticated(true);
            
            // Check status immediately
            await checkUserStatus();
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
      // Don't clear user if Firebase user is null - might be in dev mode
    });

    return () => unsubscribe();
  }, []);

  // Check user status when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated) {
        checkUserStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Periodic status check every 2 minutes while app is active
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      checkUserStatus();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = async (userData: User, token?: string) => {
    try {
      await AsyncStorage.setItem('@user', JSON.stringify(userData));
      if (token) {
        await AsyncStorage.setItem('@authToken', token);
        setAuthToken(token);
      }
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Try Firebase sign out (will fail silently if not logged in via Firebase)
      try {
        await auth.signOut();
      } catch (e) {
        // Ignore Firebase signout errors
      }
      
      await AsyncStorage.removeItem('@user');
      await AsyncStorage.removeItem('@authToken');
      setUser(null);
      setAuthToken(null);
      setIsAuthenticated(false);
      router.replace('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    AsyncStorage.setItem('@user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateUser, checkUserStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
