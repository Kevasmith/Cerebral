import { create } from 'zustand';
import { authClient } from '../api/authClient';
import { api, setSession, clearSession } from '../api/client';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  preferences: null,
  isLoading: true,
  isOnboarded: false,
  profileFetched: false, // true once fetchProfile has resolved (success or failure)

  init: async () => {
    try {
      const { data: session } = await authClient.getSession();
      if (session?.user) {
        const token = session.session?.token;
        if (token) await setSession(token);
        // Drop the loading screen as soon as we know the user — profile loads behind the scenes
        set({ user: session.user, isLoading: false });
        try {
          await api.post('/users/register', {
            email: session.user.email,
            displayName: session.user.name,
          });
        } catch {}
        // Background — App.js gates on profileFetched to prevent Onboarding flicker
        get().fetchProfile();
      } else {
        await clearSession();
        set({ isLoading: false, profileFetched: true });
      }
    } catch {
      set({ isLoading: false, profileFetched: true });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await authClient.signIn.email({ email, password });
    if (error) throw new Error(error.message || 'Sign in failed');
    if (data?.token) await setSession(data.token);
    set({ user: data.user });
    try { await api.post('/users/register', { email, displayName: data.user?.name }); } catch {}
    await get().fetchProfile();
  },

  signUp: async (email, password, displayName) => {
    const { data, error } = await authClient.signUp.email({ email, password, name: displayName });
    if (error) throw new Error(error.message || 'Sign up failed');
    if (data?.token) await setSession(data.token);
    set({ user: data.user });
    try { await api.post('/users/register', { email, displayName }); } catch {}
    await get().fetchProfile();
  },

  signOut: async () => {
    await authClient.signOut();
    await clearSession();
    set({ user: null, profile: null, preferences: null, isOnboarded: false, profileFetched: false });
  },

  fetchProfile: async () => {
    try {
      const [profileRes, prefsRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/users/me/preferences'),
      ]);
      const prefs = prefsRes.data;
      const isOnboarded = !!(prefs?.goal);
      set({ profile: profileRes.data, preferences: prefs, isOnboarded, profileFetched: true });
    } catch {
      // Profile may not exist yet for a brand-new user — not an error
      set({ profileFetched: true });
    }
  },

  savePreferences: async (updates) => {
    // Optimistic: navigate immediately so Railway cold-start can't block the user
    set((s) => ({
      preferences: { ...s.preferences, ...updates },
      isOnboarded: true,
    }));
    // Persist to server in the background with a generous timeout
    api.patch('/users/me/preferences', updates, { timeout: 30000 }).catch(() => {
      // Silent — user is already in the app; they'll re-onboard on next cold start if this keeps failing
    });
  },

  updateDisplayName: async (displayName) => {
    const res = await api.patch('/users/me', { displayName });
    set((s) => ({ profile: { ...s.profile, ...res.data } }));
  },

  updateNotifications: async (enabled) => {
    const res = await api.patch('/users/me/preferences', { notificationsEnabled: enabled });
    set((s) => ({ preferences: { ...s.preferences, ...res.data } }));
  },

  signInWithApple: async (identityToken, fullName) => {
    const { data, error } = await authClient.signIn.social({
      provider: 'apple',
      idToken: { token: identityToken },
    });
    if (error) throw new Error(error.message || 'Apple sign in failed');
    if (data?.token) await setSession(data.token);
    set({ user: data?.user });
    const displayName = fullName
      ? `${fullName.givenName ?? ''} ${fullName.familyName ?? ''}`.trim()
      : null;
    try {
      await api.post('/users/register', {
        email: data?.user?.email,
        displayName: displayName || data?.user?.name,
      });
    } catch {}
    await get().fetchProfile();
  },

  deleteAccount: async () => {
    // Backend wipes both our app tables AND Better Auth's user/session/account
    // rows in a single transaction. Once that returns, the session token in
    // our possession is already invalid server-side — `authClient.signOut()`
    // would throw trying to revoke a row that no longer exists, so we swallow
    // that and force-clear local state ourselves.
    await api.delete('/users/me');
    try { await authClient.signOut(); } catch {}
    await clearSession();
    set({ user: null, profile: null, preferences: null, isOnboarded: false, profileFetched: false });
  },

  sendPasswordReset: async (email) => {
    const { error } = await authClient.forgetPassword({
      email,
      redirectTo: (typeof window !== 'undefined' ? window.location.origin : 'cerebral://') + '/reset-password',
    });
    if (error) throw new Error(error.message || 'Could not send reset email');
  },
}));

export default useAuthStore;
