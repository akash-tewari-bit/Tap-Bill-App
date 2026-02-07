import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { 
  PhoneAuthProvider, 
  signInWithCredential,
  RecaptchaVerifier 
} from 'firebase/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const recaptchaVerifier = useRef<any>(null);

  const sendVerification = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    const fullPhoneNumber = `+91${phoneNumber}`;
    setLoading(true);

    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        fullPhoneNumber,
        recaptchaVerifier.current
      );
      
      setVerificationId(verificationId);
      Alert.alert('Success', 'Verification code sent to your phone');
    } catch (error: any) {
      console.error('Error sending verification:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      // Create credential and sign in
      const credential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      const result = await signInWithCredential(auth, credential);

      // Get Firebase ID token
      const idToken = await result.user.getIdToken();

      // Verify with backend and get user data
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
        // Save user data and navigate
        await login(response.data.user);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', response.data.message || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('Error confirming code:', error);
      if (error.response?.status === 403) {
        Alert.alert(
          'Account Deactivated',
          'Your account has been deactivated. Please contact support.'
        );
      } else {
        Alert.alert('Error', error.message || 'Invalid verification code');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
        attemptInvisibleVerification={true}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name=\"restaurant\" size={64} color=\"#007AFF\" />
          <Text style={styles.title}>Food Cart Manager</Text>
          <Text style={styles.subtitle}>Login with your mobile number</Text>
        </View>

        {!verificationId ? (
          <View style={styles.form}>
            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder=\"Mobile Number\"
                keyboardType=\"phone-pad\"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={10}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={sendVerification}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color=\"#FFFFFF\" />
              ) : (
                <>
                  <Ionicons name=\"send\" size={20} color=\"#FFFFFF\" />
                  <Text style={styles.buttonText}>Send OTP</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.sentMessage}>
              OTP sent to +91{phoneNumber}
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder=\"Enter 6-digit OTP\"
              keyboardType=\"number-pad\"
              value={verificationCode}
              onChangeText={setVerificationCode}
              maxLength={6}
              editable={!loading}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={confirmCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color=\"#FFFFFF\" />
              ) : (
                <>
                  <Ionicons name=\"checkmark-circle\" size={20} color=\"#FFFFFF\" />
                  <Text style={styles.buttonText}>Verify OTP</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changeNumberButton}
              onPress={() => {
                setVerificationId('');
                setVerificationCode('');
              }}
              disabled={loading}
            >
              <Text style={styles.changeNumberText}>Change Number</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000000',
  },
  codeInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sentMessage: {
    fontSize: 14,
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 8,
  },
  changeNumberButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  changeNumberText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
