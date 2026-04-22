import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { initFirebase } from '../api/client';
import useAuthStore from '../store/authStore';

const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export default function SignIn() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuthStore();

  const submit = async () => {
    if (!email || !password) { setError('Email and password required'); return; }
    setError('');
    setLoading(true);
    try {
      initFirebase(FIREBASE_CONFIG);
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        if (!name.trim()) { setError('Name required'); setLoading(false); return; }
        await signUp(email.trim(), password, name.trim());
      }
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>Cerebral</Text>
        <Text style={styles.tagline}>Your financial awareness starts here.</Text>

        {mode === 'signup' && (
          <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" />
        )}
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
          <Text style={styles.toggle}>
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 36, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  tagline: { fontSize: 16, color: '#666', marginBottom: 36 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0' },
  btn: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggle: { color: '#007bff', textAlign: 'center', marginTop: 20, fontSize: 14 },
  error: { color: '#c0392b', marginBottom: 8, fontSize: 13 },
});
