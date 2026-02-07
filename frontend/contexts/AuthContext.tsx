import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, get from AsyncStorage
        try {
          const userData = await AsyncStorage.getItem('@user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        // User is signed out
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (userData: User) => {
    try {
      await AsyncStorage.setItem('@user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem('@user');
      setUser(null);
      setIsAuthenticated(false);
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
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateUser }}>
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
