import axios from 'axios';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  onIdTokenChanged,
  signInAnonymously,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { Platform } from 'react-native';

// Web uses localStorage; native uses SecureStore
const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    const SS = require('expo-secure-store');
    return SS.getItemAsync(key);
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    const SS = require('expo-secure-store');
    return SS.setItemAsync(key, value);
  },
  async deleteItem(key) {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    const SS = require('expo-secure-store');
    return SS.deleteItemAsync(key);
  },
};

export const API_BASE = 'https://cerebral-production.up.railway.app/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

let auth;
let refreshTimer = null;

function parseJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch (e) {
    return null;
  }
}

function scheduleTokenRefreshForToken(token) {
  // Clear previous timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const payload = parseJwt(token);
  let refreshInMs = 45 * 60 * 1000; // default 45 minutes
  if (payload && payload.exp) {
    const expMs = payload.exp * 1000;
    const now = Date.now();
    // Refresh 2 minutes before expiry if possible
    const msUntilExpiry = expMs - now;
    refreshInMs = Math.max(2 * 60 * 1000, msUntilExpiry - 2 * 60 * 1000);
  }

  // Safety cap: at most 55 minutes
  refreshInMs = Math.min(refreshInMs, 55 * 60 * 1000);

  refreshTimer = setTimeout(async () => {
    try {
      const newToken = await refreshIdTokenSilently();
      if (newToken) scheduleTokenRefreshForToken(newToken);
    } catch (e) {
      // ignore
    }
  }, refreshInMs);
}

function cancelScheduledRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Initialize Firebase (call from App startup). Pass a firebaseConfig object
 * or rely on Expo public env vars (recommended: set EXPO_PUBLIC_FIREBASE_* vars).
 */
export function initFirebase(firebaseConfig) {
  try {
    if (!getApps().length) {
      if (!firebaseConfig) return;
      initializeApp(firebaseConfig);
    }
    auth = getAuth();

    // Listen for token changes and inject Authorization header
    onIdTokenChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        try {
          await storage.setItem('cerebral_id_token', token);
        } catch (e) {
          // ignore secure store errors
        }
        // schedule proactive refresh
        if (token) scheduleTokenRefreshForToken(token);
      } else {
        delete api.defaults.headers.common.Authorization;
        try {
          await storage.deleteItem('cerebral_id_token');
        } catch (e) {}
        cancelScheduledRefresh();
      }
    });

    // Try to restore token from secure storage if present
    (async () => {
      try {
        const stored = await storage.getItem('cerebral_id_token');
        if (stored && !api.defaults.headers.common.Authorization) {
          api.defaults.headers.common.Authorization = `Bearer ${stored}`;
        }
      } catch (e) {
        // ignore
      }
    })();
  } catch (err) {
    // Initialization failed; leave api unmodified
    // eslint-disable-next-line no-console
    console.warn('initFirebase failed', err);
  }
}

export async function ensureAnonymousAuth() {
  if (!auth) throw new Error('Firebase not initialized. Call initFirebase() first.');
  if (!auth.currentUser) {
    await signInAnonymously(auth);
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      try {
        await storage.setItem('cerebral_id_token', token);
      } catch (e) {}
      // schedule proactive refresh
      scheduleTokenRefreshForToken(token);
    }
  } else {
    const token = await auth.currentUser.getIdToken(true);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
}

export async function signOut() {
  if (!auth) return;
  await firebaseSignOut(auth);
  try {
    await storage.deleteItem('cerebral_id_token');
  } catch (e) {}
  cancelScheduledRefresh();
}

/**
 * Sign in with email/password. Returns the Firebase user credential.
 */
export async function signInWithEmail(email, password) {
  const a = auth || getAuth();
  const cred = await signInWithEmailAndPassword(a, email, password);
  const token = await cred.user.getIdToken();
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
  try {
    await storage.setItem('cerebral_id_token', token);
  } catch (e) {}
  // schedule proactive refresh
  scheduleTokenRefreshForToken(token);
  return cred;
}

/**
 * Create account with email/password and sign in.
 */
export async function signUpWithEmail(email, password) {
  const a = auth || getAuth();
  const cred = await createUserWithEmailAndPassword(a, email, password);
  const token = await cred.user.getIdToken();
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
  try {
    await storage.setItem('cerebral_id_token', token);
  } catch (e) {}
  // schedule proactive refresh
  scheduleTokenRefreshForToken(token);
  return cred;
}

/**
 * Restore token from secure store and set axios header (best-effort).
 */
export async function restoreTokenFromStore() {
  try {
    const token = await storage.getItem('cerebral_id_token');
    if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return token;
  } catch (e) {
    return null;
  }
}

// --- Automatic refresh-on-401 (silent reauth) ---
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshIdTokenSilently() {
  if (!auth) return null;
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken(true);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      try {
        await storage.setItem('cerebral_id_token', token);
      } catch (e) {}
      return token;
    }

    // If no currentUser, attempt anonymous sign-in
    await ensureAnonymousAuth();
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      try {
        await storage.setItem('cerebral_id_token', token);
      } catch (e) {}
    }
    return token;
  } catch (e) {
    return null;
  }
}

// Response interceptor to handle 401s and attempt silent token refresh
api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;
    if (status !== 401) return Promise.reject(error);

    if (originalRequest._retry) {
      // Second 401 after refresh — clear credentials so auth state resets
      delete api.defaults.headers.common.Authorization;
      try { await storage.deleteItem('cerebral_id_token'); } catch (_) {}
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token) => {
          if (!token) return reject(error);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await refreshIdTokenSilently();
      isRefreshing = false;
      onRefreshed(newToken);
      if (!newToken) return Promise.reject(error);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (e) {
      isRefreshing = false;
      onRefreshed(null);
      return Promise.reject(error);
    }
  },
);
