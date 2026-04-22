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
import * as SecureStore from 'expo-secure-store';

// Update to your backend URL. Use ngrok or Railway URL for device testing.
export const API_BASE = 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

let auth;

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
          await SecureStore.setItemAsync('cerebral_id_token', token);
        } catch (e) {
          // ignore secure store errors
        }
      } else {
        delete api.defaults.headers.common.Authorization;
        try {
          await SecureStore.deleteItemAsync('cerebral_id_token');
        } catch (e) {}
      }
    });

    // Try to restore token from secure storage if present
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync('cerebral_id_token');
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
        await SecureStore.setItemAsync('cerebral_id_token', token);
      } catch (e) {}
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
    await SecureStore.deleteItemAsync('cerebral_id_token');
  } catch (e) {}
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
    await SecureStore.setItemAsync('cerebral_id_token', token);
  } catch (e) {}
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
    await SecureStore.setItemAsync('cerebral_id_token', token);
  } catch (e) {}
  return cred;
}

/**
 * Restore token from secure store and set axios header (best-effort).
 */
export async function restoreTokenFromStore() {
  try {
    const token = await SecureStore.getItemAsync('cerebral_id_token');
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

function onRrefreshed(token) {
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
        await SecureStore.setItemAsync('cerebral_id_token', token);
      } catch (e) {}
      return token;
    }

    // If no currentUser, attempt anonymous sign-in
    await ensureAnonymousAuth();
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      try {
        await SecureStore.setItemAsync('cerebral_id_token', token);
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

    if (originalRequest._retry) return Promise.reject(error);
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
      onRrefreshed(newToken);
      if (!newToken) return Promise.reject(error);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (e) {
      isRefreshing = false;
      onRrefreshed(null);
      return Promise.reject(error);
    }
  },
);
