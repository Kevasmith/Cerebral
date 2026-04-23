import { create } from 'zustand';
import { signInWithEmail, signUpWithEmail, signOut, api } from '../api/client';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  preferences: null,
  isLoading: true,
  isOnboarded: false,

  init: () => {
    try {
      const { getAuth, onAuthStateChanged } = require('firebase/auth');
      const auth = getAuth();
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken();
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          set({ user: firebaseUser, isLoading: false });
          get().fetchProfile();
        } else {
          set({ user: null, profile: null, preferences: null, isLoading: false, isOnboarded: false });
        }
      });
    } catch {
      // Firebase not initialized (missing env vars) — unblock loading
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    const cred = await signInWithEmail(email, password);
    set({ user: cred.user });
    await get().fetchProfile();
  },

  signUp: async (email, password, displayName) => {
    const cred = await signUpWithEmail(email, password);
    await api.post('/users/register', { email, displayName });
    set({ user: cred.user });
    await get().fetchProfile();
  },

  signOut: async () => {
    await signOut();
    set({ user: null, profile: null, preferences: null, isOnboarded: false });
  },

  fetchProfile: async () => {
    try {
      const [profileRes, prefsRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/me/preferences'),
      ]);
      const prefs = prefsRes.data;
      const isOnboarded = !!(prefs?.goal && prefs?.interests?.length > 0);
      set({ profile: profileRes.data, preferences: prefs, isOnboarded });
    } catch {
      // Profile may not exist yet
    }
  },

  savePreferences: async (updates) => {
    const res = await api.patch('/users/me/preferences', updates);
    set({ preferences: res.data, isOnboarded: true });
  },
}));

export default useAuthStore;
