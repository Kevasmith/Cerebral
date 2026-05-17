// Mock the API modules before any imports so the store's module-level
// `create(...)` call sees the fakes rather than real network clients.
jest.mock('../api/authClient', () => ({
  authClient: {
    getSession:    jest.fn(),
    signIn:        { email: jest.fn(), social: jest.fn() },
    signUp:        { email: jest.fn() },
    signOut:       jest.fn(),
    forgetPassword: jest.fn(),
  },
}));

jest.mock('../api/client', () => ({
  api:          { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  setSession:   jest.fn(),
  clearSession: jest.fn(),
}));

const { authClient }             = require('../api/authClient');
const { api, setSession, clearSession } = require('../api/client');

const useAuthStore = require('./authStore').default;

// ── helpers ───────────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  user: null, profile: null, preferences: null,
  isLoading: true, isOnboarded: false, profileFetched: false,
};

function store() { return useAuthStore.getState(); }

function stubProfile() {
  api.get.mockImplementation((url) => {
    if (url === '/users/me')             return Promise.resolve({ data: { id: 'u1', displayName: 'Alice' } });
    if (url === '/users/me/preferences') return Promise.resolve({ data: { goal: 'save_more' } });
    return Promise.reject(new Error('unknown url'));
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('authStore', () => {
  beforeEach(() => {
    // Merge mode (no replace flag) so action functions in the store are preserved.
    useAuthStore.setState(INITIAL_STATE);
    jest.clearAllMocks();
  });

  // ── init ───────────────────────────────────────────────────────────────────

  describe('init', () => {
    it('sets user and triggers fetchProfile when a session exists', async () => {
      authClient.getSession.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.com' }, session: { token: 'tok-1' } },
      });
      stubProfile();
      api.post.mockResolvedValue({});

      await store().init();

      expect(store().user).toEqual({ id: 'u1', email: 'a@b.com' });
      expect(setSession).toHaveBeenCalledWith('tok-1');
      expect(store().isLoading).toBe(false);
    });

    it('calls clearSession and sets isLoading false when no session exists', async () => {
      authClient.getSession.mockResolvedValue({ data: null });

      await store().init();

      expect(clearSession).toHaveBeenCalled();
      expect(store().isLoading).toBe(false);
      expect(store().profileFetched).toBe(true);
    });

    it('sets isLoading false and profileFetched true on any error', async () => {
      authClient.getSession.mockRejectedValue(new Error('network'));

      await store().init();

      expect(store().isLoading).toBe(false);
      expect(store().profileFetched).toBe(true);
    });
  });

  // ── signIn ─────────────────────────────────────────────────────────────────

  describe('signIn', () => {
    it('sets user state and calls fetchProfile on success', async () => {
      authClient.signIn.email.mockResolvedValue({
        data: { user: { id: 'u1' }, token: 'tok-2' }, error: null,
      });
      stubProfile();
      api.post.mockResolvedValue({});

      await store().signIn('a@b.com', 'pass');

      expect(store().user).toEqual({ id: 'u1' });
      expect(setSession).toHaveBeenCalledWith('tok-2');
      expect(store().profileFetched).toBe(true);
    });

    it('throws when the auth client returns an error', async () => {
      authClient.signIn.email.mockResolvedValue({
        data: null, error: { message: 'Invalid credentials' },
      });

      await expect(store().signIn('a@b.com', 'bad-pass')).rejects.toThrow('Invalid credentials');
    });
  });

  // ── signUp ─────────────────────────────────────────────────────────────────

  describe('signUp', () => {
    it('sets user and fetches profile on success', async () => {
      authClient.signUp.email.mockResolvedValue({
        data: { user: { id: 'u2' }, token: 'tok-3' }, error: null,
      });
      stubProfile();
      api.post.mockResolvedValue({});

      await store().signUp('b@c.com', 'pass', 'Bob');

      expect(store().user).toEqual({ id: 'u2' });
      expect(setSession).toHaveBeenCalledWith('tok-3');
    });

    it('throws on error', async () => {
      authClient.signUp.email.mockResolvedValue({
        data: null, error: { message: 'Email taken' },
      });

      await expect(store().signUp('b@c.com', 'pass', 'Bob')).rejects.toThrow('Email taken');
    });
  });

  // ── signOut ────────────────────────────────────────────────────────────────

  describe('signOut', () => {
    it('clears all user state after sign out', async () => {
      useAuthStore.setState({ user: { id: 'u1' }, profile: { id: 'p1' }, isOnboarded: true });
      authClient.signOut.mockResolvedValue(undefined);
      clearSession.mockResolvedValue(undefined);

      await store().signOut();

      expect(store().user).toBeNull();
      expect(store().profile).toBeNull();
      expect(store().isOnboarded).toBe(false);
      expect(store().profileFetched).toBe(false);
    });
  });

  // ── fetchProfile ───────────────────────────────────────────────────────────

  describe('fetchProfile', () => {
    it('sets profile, preferences, isOnboarded when goal exists', async () => {
      stubProfile();

      await store().fetchProfile();

      expect(store().profile).toEqual({ id: 'u1', displayName: 'Alice' });
      expect(store().preferences).toEqual({ goal: 'save_more' });
      expect(store().isOnboarded).toBe(true);
      expect(store().profileFetched).toBe(true);
    });

    it('isOnboarded is false when goal is absent', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/users/me')             return Promise.resolve({ data: {} });
        if (url === '/users/me/preferences') return Promise.resolve({ data: {} }); // no goal
        return Promise.reject();
      });

      await store().fetchProfile();

      expect(store().isOnboarded).toBe(false);
    });

    it('sets profileFetched true even when the API fails', async () => {
      api.get.mockRejectedValue(new Error('500'));

      await store().fetchProfile();

      expect(store().profileFetched).toBe(true);
      expect(store().profile).toBeNull();
    });
  });

  // ── savePreferences ────────────────────────────────────────────────────────

  describe('savePreferences', () => {
    it('applies an optimistic update immediately', async () => {
      useAuthStore.setState({ preferences: { goal: null } });
      api.patch.mockResolvedValue({ data: {} });

      await store().savePreferences({ goal: 'save_more' });

      expect(store().preferences).toEqual({ goal: 'save_more' });
      expect(store().isOnboarded).toBe(true);
    });

    it('does not throw even when the server call fails (fire-and-forget)', async () => {
      api.patch.mockRejectedValue(new Error('timeout'));

      await expect(store().savePreferences({ goal: 'retire_early' })).resolves.toBeUndefined();
    });
  });

  // ── updateDisplayName ──────────────────────────────────────────────────────

  describe('updateDisplayName', () => {
    it('merges updated profile into state', async () => {
      useAuthStore.setState({ profile: { id: 'u1', displayName: 'Old' } });
      api.patch.mockResolvedValue({ data: { displayName: 'New Name' } });

      await store().updateDisplayName('New Name');

      expect(store().profile.displayName).toBe('New Name');
      expect(store().profile.id).toBe('u1'); // existing fields preserved
    });
  });

  // ── updateNotifications ────────────────────────────────────────────────────

  describe('updateNotifications', () => {
    it('merges the API response into preferences', async () => {
      useAuthStore.setState({ preferences: { goal: 'save_more', notificationsEnabled: false } });
      api.patch.mockResolvedValue({ data: { notificationsEnabled: true } });

      await store().updateNotifications(true);

      expect(store().preferences.notificationsEnabled).toBe(true);
      expect(store().preferences.goal).toBe('save_more'); // unchanged
    });
  });

  // ── signInWithApple ────────────────────────────────────────────────────────

  describe('signInWithApple', () => {
    it('sets user and fetches profile on success', async () => {
      authClient.signIn.social.mockResolvedValue({
        data: { user: { id: 'u-apple', email: 'x@apple.com' }, token: 'apple-tok' },
        error: null,
      });
      stubProfile();
      api.post.mockResolvedValue({});

      await store().signInWithApple('id-token', { givenName: 'Tim', familyName: 'Cook' });

      expect(store().user).toEqual({ id: 'u-apple', email: 'x@apple.com' });
      expect(setSession).toHaveBeenCalledWith('apple-tok');
    });

    it('throws on auth error', async () => {
      authClient.signIn.social.mockResolvedValue({
        data: null, error: { message: 'Apple sign in failed' },
      });

      await expect(store().signInWithApple('bad-token', null)).rejects.toThrow('Apple sign in failed');
    });

    it('builds displayName from givenName + familyName', async () => {
      authClient.signIn.social.mockResolvedValue({
        data: { user: { id: 'u3', email: 'a@b.com' }, token: 't' }, error: null,
      });
      stubProfile();
      api.post.mockResolvedValue({});

      await store().signInWithApple('tok', { givenName: 'Jane', familyName: 'Doe' });

      expect(api.post).toHaveBeenCalledWith(
        '/users/register',
        expect.objectContaining({ displayName: 'Jane Doe' }),
      );
    });
  });

  // ── deleteAccount ──────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('calls DELETE /users/me, swallows signOut errors, and clears state', async () => {
      useAuthStore.setState({ user: { id: 'u1' }, isOnboarded: true });
      api.delete.mockResolvedValue({});
      authClient.signOut.mockRejectedValue(new Error('token invalid')); // swallowed
      clearSession.mockResolvedValue(undefined);

      await store().deleteAccount();

      expect(api.delete).toHaveBeenCalledWith('/users/me');
      expect(store().user).toBeNull();
      expect(store().isOnboarded).toBe(false);
    });
  });

  // ── sendPasswordReset ──────────────────────────────────────────────────────

  describe('sendPasswordReset', () => {
    it('calls authClient.forgetPassword with the email', async () => {
      authClient.forgetPassword.mockResolvedValue({ error: null });

      await store().sendPasswordReset('a@b.com');

      expect(authClient.forgetPassword).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@b.com' }),
      );
    });

    it('throws when forgetPassword returns an error', async () => {
      authClient.forgetPassword.mockResolvedValue({ error: { message: 'Not found' } });

      await expect(store().sendPasswordReset('ghost@x.com')).rejects.toThrow('Not found');
    });
  });
});
