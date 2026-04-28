import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';

const IS_WEB = Platform.OS === 'web';
const WEB_GRADIENT = IS_WEB
  ? { backgroundImage: 'linear-gradient(145deg, #0F172A 0%, #0b2018 40%, #085c3a 75%, #0a9165 100%)' }
  : {};

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

const BANK_TILES = [
  { label: 'TD Bank',      mark: 'TD', color: '#1A6137', txt: '#fff' },
  { label: 'RBC',          mark: 'RBC', color: '#005DAA', txt: '#fff' },
  { label: 'Scotiabank',   mark: 'S',  color: '#EC1C24', txt: '#fff' },
  { label: 'BMO',          mark: 'B',  color: '#0277BD', txt: '#fff' },
  { label: 'CIBC',         mark: 'C',  color: '#C41230', txt: '#fff' },
  { label: 'National Bank',mark: 'NB', color: '#E2001A', txt: '#fff' },
];

const FILTER_CHIPS = [
  ['flash-outline',    'Recently used'],
  ['business-outline', 'Business'],
  ['trending-up-outline', 'Brokerage'],
  ['card-outline',     'Credit card'],
  ['cash-outline',     'Crypto'],
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
  const insets = useSafeAreaInsets();

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
    const urlObj = new URL(navState.url);
    const loginId = urlObj.searchParams.get('loginId');
    if (!loginId) return;
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
        <ActivityIndicator size="large" color="#0F172A" />
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
            <Ionicons name="close" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>Connect Your Bank</Text>
          <View style={{ width: 40 }} />
        </View>
        {!webViewReady && (
          <View style={styles.webViewLoader}>
            <ActivityIndicator size="large" color="#0F172A" />
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
    <ScrollView
      style={styles.bankContainer}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Dark hero header */}
      <View style={[styles.bankHero, WEB_GRADIENT, { paddingTop: insets.top + 10 }]}>
        <View style={styles.bankHeroNav}>
          <View style={{ width: 34 }} />
          <Text style={styles.bankStep}>Step 1 of 3</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.bankEncryptBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#6ffbbe" />
          <Text style={styles.bankEncryptText}>256-bit encryption</Text>
        </View>
        <Text style={styles.bankHeroTitle}>Connect your wealth</Text>
        <Text style={styles.bankHeroSub}>End-to-end encrypted. We never store your credentials.</Text>
      </View>

      {/* Cream content area */}
      <View style={styles.bankContent}>
        {/* Success / error banners */}
        {connected && (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={24} color="#0a9165" />
            <Text style={styles.successText}>Bank connected successfully!</Text>
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Search bar */}
        <View style={styles.bankSearchBar}>
          <Ionicons name="search-outline" size={18} color="#9aa3b2" />
          <Text style={styles.bankSearchPlaceholder}>Search 12,000+ institutions</Text>
          <View style={styles.bankSearchKbd}>
            <Text style={styles.bankSearchKbdText}>⌘K</Text>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {FILTER_CHIPS.map(([icon, label]) => (
            <View key={label} style={styles.filterChip}>
              <Ionicons name={icon} size={13} color="#0a9165" />
              <Text style={styles.filterChipText}>{label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Popular institutions header */}
        <View style={styles.bankSectionHeader}>
          <Text style={styles.bankSectionTitle}>Popular institutions</Text>
          <Text style={styles.bankSectionLink}>View all →</Text>
        </View>

        {/* Bank tile grid */}
        <View style={styles.bankGrid}>
          {BANK_TILES.map((bank) => (
            <TouchableOpacity
              key={bank.label}
              style={styles.bankTile}
              onPress={openFlinks}
              activeOpacity={0.75}
            >
              <View style={[styles.bankMark, { backgroundColor: bank.color }]}>
                <Text style={[styles.bankMarkText, { color: bank.txt }]}>{bank.mark}</Text>
              </View>
              <Text style={styles.bankTileLabel}>{bank.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trust panel */}
        <View style={styles.trustPanel}>
          <View style={styles.trustPanelRow}>
            <View style={[styles.trustPanelIcon, { backgroundColor: 'rgba(10,145,101,0.1)' }]}>
              <Ionicons name="flash-outline" size={18} color="#0a9165" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trustPanelTitle}>Instant sync</Text>
              <Text style={styles.trustPanelBody}>Balances and transactions update in real time once connected.</Text>
            </View>
          </View>
          <View style={[styles.trustPanelRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.trustPanelIcon, { backgroundColor: 'rgba(124,58,237,0.1)' }]}>
              <Ionicons name="eye-off-outline" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trustPanelTitle}>Read-only access</Text>
              <Text style={styles.trustPanelBody}>Cerebral cannot move funds without your explicit consent.</Text>
            </View>
          </View>
        </View>

        {/* Privacy footer */}
        <View style={styles.privacyFooter}>
          <Ionicons name="lock-closed-outline" size={12} color="#9aa3b2" />
          <Text style={styles.privacyText}>Powered by Flinks · SOC 2 Type II · Canada-first</Text>
        </View>

        {/* CTA */}
        {connected ? (
          <TouchableOpacity style={[styles.btn, styles.bankBtn]} onPress={onConnected}>
            <Text style={styles.btnText}>Continue →</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.btn, styles.bankBtn, urlLoading && styles.btnDisabled]}
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
      </View>
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
            {goal === g.key && <View style={styles.checkChip}><Text style={styles.checkMark}>✓</Text></View>}
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
      const location = profile?.location || '';
      await savePreferences({ goal, interests, ...(location && { location }) });
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
              {active && <View style={styles.checkChip}><Text style={styles.checkMark}>✓</Text></View>}
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
  container: { flexGrow: 1, padding: 24, backgroundColor: '#F4F2EC', justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F2EC', padding: 24 },

  // Bank step — redesigned
  bankContainer: { flex: 1, backgroundColor: '#0F172A' },
  bankHero: {
    paddingHorizontal: 20, paddingBottom: 32, backgroundColor: '#0F172A',
  },
  bankHeroNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  bankStep:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  bankEncryptBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 11, paddingVertical: 5,
    backgroundColor: 'rgba(10,145,101,0.18)', borderWidth: 1, borderColor: 'rgba(10,145,101,0.35)',
    borderRadius: 20, marginBottom: 14,
  },
  bankEncryptText: { fontSize: 10, fontWeight: '800', color: '#6ffbbe', textTransform: 'uppercase', letterSpacing: 1 },
  bankHeroTitle: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.6, lineHeight: 34, marginBottom: 6 },
  bankHeroSub:   { fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },

  bankContent: {
    backgroundColor: '#F4F2EC', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -18, paddingTop: 18, paddingHorizontal: 16,
  },

  // Search bar
  bankSearchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#FBF9F4', borderRadius: 14, borderWidth: 1, borderColor: '#ECE8DC',
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    marginBottom: 12,
  },
  bankSearchPlaceholder: { flex: 1, fontSize: 14, color: '#9aa3b2' },
  bankSearchKbd:         { backgroundColor: '#F7F4EC', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#ECE8DC' },
  bankSearchKbdText:     { fontSize: 10.5, fontWeight: '700', color: '#888' },

  // Filter chips
  filterChips: { gap: 8, paddingBottom: 14 },
  filterChip:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#FBF9F4', borderRadius: 20, borderWidth: 1, borderColor: '#ECE8DC',
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#0F172A' },

  // Institution section
  bankSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bankSectionTitle:  { fontSize: 15, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3 },
  bankSectionLink:   { fontSize: 11.5, fontWeight: '700', color: '#0a9165' },

  // Bank tile grid — 3 columns
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  bankTile: {
    width: '30.5%', backgroundColor: '#FBF9F4', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#ECE8DC', alignItems: 'center', gap: 8,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  bankMark: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
  },
  bankMarkText:  { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  bankTileLabel: { fontSize: 11.5, fontWeight: '600', color: '#0F172A', textAlign: 'center', lineHeight: 15 },

  // Trust panel
  trustPanel: {
    backgroundColor: '#FBF9F4', borderRadius: 18, borderWidth: 1, borderColor: '#ECE8DC',
    overflow: 'hidden', marginBottom: 14,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  trustPanelRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14,
    borderBottomWidth: 1, borderBottomColor: '#ECE8DC',
  },
  trustPanelIcon:  { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  trustPanelTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2, marginBottom: 2 },
  trustPanelBody:  { fontSize: 12, color: '#888', lineHeight: 17 },

  // Privacy footer
  privacyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 20 },
  privacyText:   { fontSize: 11, color: '#9aa3b2' },

  // Old shared styles kept for success/error
  successCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eafaf1', borderRadius: 12, padding: 14, marginBottom: 16 },
  successText: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  skipBtn:     { alignItems: 'center', marginTop: 16 },
  skipText:    { color: '#888', fontSize: 14 },
  syncingText: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginTop: 20 },
  syncingSub:  { fontSize: 14, color: '#888', marginTop: 6 },

  // WebView
  webViewContainer: { flex: 1, backgroundColor: '#fff' },
  webViewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  webViewTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  webView: { flex: 1 },
  webViewLoader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

  // Shared
  heading: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  sub: { fontSize: 15, color: '#666', marginBottom: 28 },
  btn: { backgroundColor: '#0F172A', borderRadius: 12, padding: 16, alignItems: 'center' },
  bankBtn: { marginBottom: 0 },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#EF4444', marginBottom: 12, fontSize: 13 },

  // Goal step
  options: { gap: 12, marginBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#e0e0e0', position: 'relative' },
  cardSelected: { borderColor: '#0a9165', backgroundColor: 'rgba(10,145,101,0.08)' },
  cardEmoji: { fontSize: 28, marginBottom: 6 },
  cardLabel: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  cardLabelSelected: { color: '#07673f' },
  cardDesc: { fontSize: 13, color: '#888', marginTop: 4 },

  // Check chip (absolute top-right on selected cards)
  checkChip: { position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: 10, backgroundColor: '#0a9165', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 14 },

  // Interests step
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  chip: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 2, borderColor: '#e0e0e0', position: 'relative' },
  chipActive: { borderColor: '#0a9165', backgroundColor: 'rgba(10,145,101,0.08)' },
  chipEmoji: { fontSize: 26, marginBottom: 6 },
  chipLabel: { fontSize: 14, fontWeight: '600', color: '#555' },
  chipLabelActive: { color: '#07673f' },
});
