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
      } else {
        delete api.defaults.headers.common.Authorization;
      }
    });
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
  } else {
    const token = await auth.currentUser.getIdToken(true);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
}

export async function signOut() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

/**
 * Sign in with email/password. Returns the Firebase user credential.
 */
export async function signInWithEmail(email, password) {
  const a = auth || getAuth();
  const cred = await signInWithEmailAndPassword(a, email, password);
  const token = await cred.user.getIdToken();
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
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
  return cred;
}
