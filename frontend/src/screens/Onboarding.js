import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';

// WebView is native-only — lazy load so the web bundle doesn't crash
const WebView = Platform.OS !== 'web' ? require('react-native-webview').WebView : null;

// The redirect URL Flinks will navigate to on success — intercepted in the WebView
const FLINKS_REDIRECT = 'https://cerebral.app/bank-connected';

const GOALS = [
  { key: 'save_more', label: 'Save More', emoji: '🏦', desc: 'Build a savings habit' },
  { key: 'make_more', label: 'Make More', emoji: '💰', desc: 'Find income opportunities' },
  { key: 'learn_investing', label: 'Learn Investing', emoji: '📈', desc: 'Understand how to grow money' },
];

const INTERESTS = [
  { key: 'investing', label: 'Investing', emoji: '📊' },
  { key: 'side_income', label: 'Side Income', emoji: '🚀' },
  { key: 'networking', label: 'Networking', emoji: '🤝' },
  { key: 'saving', label: 'Saving', emoji: '💡' },
];

// ─── Step 0: Connect Bank ─────────────────────────────────────────────────────

function ConnectBankStep({ onConnected, onSkip }) {
  const [showWebView, setShowWebView] = useState(false);
  const [connectUrl, setConnectUrl] = useState(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const webViewRef = useRef(null);

  const openFlinks = useCallback(async () => {
    setError('');
    setUrlLoading(true);
    try {
      const res = await api.get('/accounts/connect-url');
      setConnectUrl(res.data.url);
      setShowWebView(true);
    } catch {
      setError('Could not load bank connection. Check your connection and try again.');
    } finally {
      setUrlLoading(false);
    }
  }, []);

  const handleNavigationChange = useCallback(async (navState) => {
    if (!navState.url.startsWith(FLINKS_REDIRECT)) return;

    // Intercept the redirect — extract loginId from query params
    const urlObj = new URL(navState.url);
    const loginId = urlObj.searchParams.get('loginId');
    if (!loginId) return;

    // Set syncing BEFORE closing WebView so there's no blank-screen gap
    setSyncing(true);
    setShowWebView(false);
    setError('');
    try {
      await api.post('/accounts/sync', { loginId });
      setConnected(true);
    } catch {
      setError("Bank connected but sync failed. You can continue — we'll retry in the background.");
      setConnected(true);
    } finally {
      setSyncing(false);
    }
  }, []);

  if (syncing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a1a2e" />
        <Text style={styles.syncingText}>Importing your accounts...</Text>
        <Text style={styles.syncingSub}>This takes a few seconds</Text>
      </View>
    );
  }

  if (showWebView && connectUrl) {
    return (
      <SafeAreaView style={styles.webViewContainer}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity onPress={() => setShowWebView(false)} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#1a1a2e" />
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>Connect Your Bank</Text>
          <View style={{ width: 40 }} />
        </View>
        {!webViewReady && (
          <View style={styles.webViewLoader}>
            <ActivityIndicator size="large" color="#1a1a2e" />
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: connectUrl }}
          style={[styles.webView, !webViewReady && { opacity: 0 }]}
          onLoadEnd={() => setWebViewReady(true)}
          onShouldStartLoadWithRequest={(req) => {
            if (req.url.startsWith(FLINKS_REDIRECT)) {
              handleNavigationChange(req);
              return false;
            }
            return true;
          }}
          javaScriptEnabled
          domStorageEnabled
        />
      </SafeAreaView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.bankIllustration}>
        <Ionicons name="shield-checkmark" size={56} color="#1a1a2e" />
      </View>

      <Text style={styles.heading}>Connect your bank</Text>
      <Text style={styles.sub}>
        Link your account to unlock spending insights, personalized opportunities, and your AI financial assistant.
      </Text>

      {connected ? (
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={24} color="#2ecc71" />
          <Text style={styles.successText}>Bank connected successfully!</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.trustRow}>
        {['256-bit encryption', 'Read-only access', 'Canada-first'].map((t) => (
          <View key={t} style={styles.trustChip}>
            <Ionicons name="lock-closed" size={11} color="#555" />
            <Text style={styles.trustText}>{t}</Text>
          </View>
        ))}
      </View>

      {connected ? (
        <TouchableOpacity style={styles.btn} onPress={onConnected}>
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.btn, urlLoading && styles.btnDisabled]}
            onPress={openFlinks}
            disabled={urlLoading}
          >
            {urlLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Connect Bank</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ─── Step 1: Goal ─────────────────────────────────────────────────────────────

function GoalStep({ onNext }) {
  const [goal, setGoal] = useState(null);
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>What's your main goal?</Text>
      <Text style={styles.sub}>We'll personalise your experience around this.</Text>
      <View style={styles.options}>
        {GOALS.map((g) => (
          <TouchableOpacity
            key={g.key}
            style={[styles.card, goal === g.key && styles.cardSelected]}
            onPress={() => setGoal(g.key)}
          >
            <Text style={styles.cardEmoji}>{g.emoji}</Text>
            <Text style={[styles.cardLabel, goal === g.key && styles.cardLabelSelected]}>{g.label}</Text>
            <Text style={styles.cardDesc}>{g.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.btn, !goal && styles.btnDisabled]}
        onPress={() => goal && onNext(goal)}
        disabled={!goal}
      >
        <Text style={styles.btnText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 2: Interests ────────────────────────────────────────────────────────

function InterestsStep({ goal, onFinish }) {
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { savePreferences } = useAuthStore();

  const toggleInterest = (key) =>
    setInterests((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const finish = async () => {
    if (!interests.length) { setError('Pick at least one interest'); return; }
    setError('');
    setLoading(true);
    try {
      const { profile } = useAuthStore.getState();
      const location = profile?.location || 'Edmonton, AB';
      await savePreferences({ goal, interests, location });
    } catch {
      setError('Could not save preferences. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>What interests you?</Text>
      <Text style={styles.sub}>Pick everything that applies — we'll find opportunities that match.</Text>
      <View style={styles.grid}>
        {INTERESTS.map((i) => {
          const active = interests.includes(i.key);
          return (
            <TouchableOpacity
              key={i.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleInterest(i.key)}
            >
              <Text style={styles.chipEmoji}>{i.emoji}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{i.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={finish} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Get Started</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Root Onboarding ──────────────────────────────────────────────────────────

export default function Onboarding() {
  // Bank connection (step 0) requires a native WebView — skip on web
  const [step, setStep] = useState(Platform.OS === 'web' ? 1 : 0);
  const [goal, setGoal] = useState(null);

  if (step === 0) {
    return (
      <ConnectBankStep
        onConnected={() => setStep(1)}
        onSkip={() => setStep(1)}
      />
    );
  }

  if (step === 1) {
    return <GoalStep onNext={(g) => { setGoal(g); setStep(2); }} />;
  }

  return <InterestsStep goal={goal} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#f8f9fa', justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 24 },

  // Bank step
  bankIllustration: { alignItems: 'center', marginBottom: 24 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  trustChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e8e8e8', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  trustText: { fontSize: 11, color: '#555', fontWeight: '500' },
  successCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eafaf1', borderRadius: 12, padding: 14, marginBottom: 16 },
  successText: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  skipBtn: { alignItems: 'center', marginTop: 16 },
  skipText: { color: '#888', fontSize: 14 },
  syncingText: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginTop: 20 },
  syncingSub: { fontSize: 14, color: '#888', marginTop: 6 },

  // WebView
  webViewContainer: { flex: 1, backgroundColor: '#fff' },
  webViewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  webViewTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  webView: { flex: 1 },
  webViewLoader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

  // Shared
  heading: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  sub: { fontSize: 15, color: '#666', marginBottom: 28 },
  btn: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#c0392b', marginBottom: 12, fontSize: 13 },

  // Goal step
  options: { gap: 12, marginBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#e0e0e0' },
  cardSelected: { borderColor: '#1a1a2e', backgroundColor: '#f0f0ff' },
  cardEmoji: { fontSize: 28, marginBottom: 6 },
  cardLabel: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  cardLabelSelected: { color: '#1a1a2e' },
  cardDesc: { fontSize: 13, color: '#888', marginTop: 4 },

  // Interests step
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  chip: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 2, borderColor: '#e0e0e0' },
  chipActive: { borderColor: '#1a1a2e', backgroundColor: '#f0f0ff' },
  chipEmoji: { fontSize: 26, marginBottom: 6 },
  chipLabel: { fontSize: 14, fontWeight: '600', color: '#555' },
  chipLabelActive: { color: '#1a1a2e' },
});
