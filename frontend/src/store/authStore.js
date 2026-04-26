import { create } from 'zustand';
import { authClient } from '../api/authClient';
import { api, setSession, clearSession, restoreSession } from '../api/client';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  preferences: null,
  isLoading: true,
  isOnboarded: false,

  init: async () => {
    try {
      const token = await restoreSession();
      if (!token) { set({ isLoading: false }); return; }

      const { data: session } = await authClient.getSession();
      if (session?.user) {
        set({ user: session.user, isLoading: false });
        get().fetchProfile();
      } else {
        await clearSession();
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await authClient.signIn.email({ email, password });
    if (error) throw new Error(error.message || 'Sign in failed');
    if (data?.token) await setSession(data.token);
    set({ user: data.user });
    // Ensure user record exists in our DB (upsert is idempotent)
    try { await api.post('/users/register', { email, displayName: data.user?.name }); } catch {}
    await get().fetchProfile();
  },

  signUp: async (email, password, displayName) => {
    const { data, error } = await authClient.signUp.email({ email, password, name: displayName });
    if (error) throw new Error(error.message || 'Sign up failed');
    if (data?.token) await setSession(data.token);
    set({ user: data.user });
    // Register is best-effort; backend updatePreferences will upsert if this fails
    try { await api.post('/users/register', { email, displayName }); } catch {}
    await get().fetchProfile();
  },

  signOut: async () => {
    await authClient.signOut();
    await clearSession();
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
      // Profile may not exist yet (new user before register call)
    }
  },

  savePreferences: async (updates) => {
    const res = await api.patch('/users/me/preferences', updates);
    set({ preferences: res.data, isOnboarded: true });
  },
}));

export default useAuthStore;
