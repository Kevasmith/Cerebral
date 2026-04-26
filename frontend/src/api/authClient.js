import { createAuthClient } from 'better-auth/client';
import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://cerebral-production.up.railway.app';

// Token storage — SecureStore on native, localStorage on web
export const tokenStorage = {
  async get() {
    if (Platform.OS === 'web') return localStorage.getItem('cerebral_session_token');
    const SS = require('expo-secure-store');
    return SS.getItemAsync('cerebral_session_token');
  },
  async set(token) {
    if (Platform.OS === 'web') { localStorage.setItem('cerebral_session_token', token); return; }
    const SS = require('expo-secure-store');
    return SS.setItemAsync('cerebral_session_token', token);
  },
  async remove() {
    if (Platform.OS === 'web') { localStorage.removeItem('cerebral_session_token'); return; }
    const SS = require('expo-secure-store');
    return SS.deleteItemAsync('cerebral_session_token');
  },
};

export const authClient = createAuthClient({
  baseURL: API_BASE,
  fetchOptions: {
    // Attach stored bearer token to every auth client request (React Native has no cookies)
    onRequest: async (ctx) => {
      const token = await tokenStorage.get();
      if (token) ctx.headers.set('Authorization', `Bearer ${token}`);
    },
  },
});
