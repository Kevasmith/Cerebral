import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { openPlaidLink } from '../utils/plaidLink';

const IS_WEB = Platform.OS === 'web';

const C = {
  bg:         '#080E14',
  card:       '#0D1520',
  cardDeep:   '#0A1018',
  teal:       '#10C896',
  tealDim:    'rgba(16,200,150,0.12)',
  tealBorder: 'rgba(16,200,150,0.25)',
  white:      '#FFFFFF',
  muted:      'rgba(255,255,255,0.55)',
  faint:      'rgba(255,255,255,0.28)',
  border:     'rgba(255,255,255,0.07)',
  input:      'rgba(255,255,255,0.05)',
};

const BANKS = [
  { label: 'TD Bank',       mark: 'TD',  bg: '#1A6137', txt: '#fff' },
  { label: 'RBC',           mark: 'RBC', bg: '#005DAA', txt: '#fff' },
  { label: 'Scotiabank',    mark: 'S',   bg: '#EC1C24', txt: '#fff' },
  { label: 'BMO',           mark: 'BMO', bg: '#0277BD', txt: '#fff' },
  { label: 'CIBC',          mark: 'C',   bg: '#C41230', txt: '#fff' },
  { label: 'National Bank', mark: 'NB',  bg: '#E2001A', txt: '#fff' },
];

const FEATURES = [
  {
    icon: 'flash',
    title: 'Instant Synchronization',
    body: 'Once connected, your transactions and balances update in real-time with Cerebral\'s AI engine.',
  },
  {
    icon: 'eye-off-outline',
    title: 'Privacy Guaranteed',
    body: 'We use read-only access. Cerebral cannot move funds or execute transactions without your explicit consent.',
  },
];

// ─── Bank tile ────────────────────────────────────────────────────────────────
function BankTile({ bank, onPress }) {
  return (
    <TouchableOpacity style={styles.bankTile} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.bankMark, { backgroundColor: bank.bg }]}>
        <Text style={[styles.bankMarkText, { color: bank.txt }]} numberOfLines={1}>
          {bank.mark}
        </Text>
      </View>
      <Text style={styles.bankLabel} numberOfLines={2}>{bank.label}</Text>
    </TouchableOpacity>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, body }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color={C.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureTitle, IS_WEB && { fontFamily: 'Geist' }]}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ConnectBank({ navigation }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const filteredBanks = search.trim()
    ? BANKS.filter(b => b.label.toLowerCase().includes(search.toLowerCase()))
    : BANKS;

  // Plaid Link flow:
  // 1) POST /accounts/link-token → server-issued link_token
  // 2) Open Plaid Link (native modal — Plaid presents its own institution picker)
  // 3) On success → POST /accounts/sync with the public_token; navigate back
  const openConnect = useCallback(async () => {
    setLinkLoading(true);
    try {
      const { data } = await api.post('/accounts/link-token');
      setLinkLoading(false);

      if (data?.kind !== 'link_token' || !data?.value) {
        return;
      }

      await openPlaidLink({
        linkToken: data.value,
        onSuccess: async (publicToken) => {
          if (!publicToken) return;
          setSyncing(true);
          try {
            await api.post('/accounts/sync', { provider: 'plaid', publicToken });
          } catch {
            // swallow — user can retry
          } finally {
            setSyncing(false);
            navigation?.goBack?.();
          }
        },
        onExit: () => {
          // user dismissed; stay on this screen
        },
      });
    } catch {
      setLinkLoading(false);
    }
  }, [navigation]);

  if (syncing) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={[styles.syncText, { marginTop: 16 }]}>Syncing your accounts…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => navigation?.goBack?.()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={C.teal} />
          <View style={styles.avatar}>
            <Ionicons name="person" size={14} color={C.white} />
          </View>
          <Text style={[styles.headerBrand, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color={C.teal} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encryption badge */}
        <View style={styles.encBadge}>
          <Ionicons name="shield-checkmark-outline" size={12} color={C.teal} />
          <Text style={styles.encText}>BANK-LEVEL 256-BIT ENCRYPTION</Text>
        </View>

        {/* Hero */}
        <Text style={[styles.hero, IS_WEB && { fontFamily: 'Geist' }]}>Connect your wealth</Text>
        <Text style={styles.heroSub}>
          Cerebral uses end-to-end encrypted tunnels to analyze your assets securely. We never store your credentials.
        </Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={C.faint} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, IS_WEB && { outlineStyle: 'none' }]}
            placeholder="Search for your bank or brokerage"
            placeholderTextColor={C.faint}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>

        {/* Popular institutions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>Popular Institutions</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAll}>VIEW ALL →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bankGrid}>
          {filteredBanks.map((bank) => (
            <BankTile
              key={bank.label}
              bank={bank}
              onPress={openConnect}
            />
          ))}
        </View>

        {linkLoading && (
          <ActivityIndicator size="small" color={C.teal} style={{ marginVertical: 12 }} />
        )}

        {/* Feature cards */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} body={f.body} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerBrand: { fontSize: 17, fontWeight: '700', color: C.white },
  bellBtn: { padding: 4 },

  // Encryption badge
  encBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: C.tealBorder,
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: C.tealDim, marginTop: 28, marginBottom: 20,
  },
  encText: { fontSize: 10, fontWeight: '800', color: C.teal, letterSpacing: 1.2 },

  // Hero
  hero: {
    fontSize: 34, fontWeight: '900', color: C.white,
    letterSpacing: -0.8, marginBottom: 14, lineHeight: 40,
  },
  heroSub: {
    fontSize: 14, color: C.muted, lineHeight: 22,
    marginBottom: 28, textAlign: 'center',
  },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.input,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    marginBottom: 32,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.white },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: C.white },
  viewAll: { fontSize: 12, fontWeight: '700', color: C.teal, letterSpacing: 0.5 },

  // Bank grid
  bankGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    marginBottom: 32,
  },
  bankTile: {
    width: '47%',
    backgroundColor: C.card,
    borderRadius: 18, padding: 20,
    alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: C.border,
  },
  bankMark: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  bankMarkText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  bankLabel: { fontSize: 14, fontWeight: '600', color: C.white, textAlign: 'center' },

  // Features
  featureList: { gap: 12 },
  featureCard: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: C.card,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.border,
  },
  featureIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.tealDim,
    borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: { fontSize: 15, fontWeight: '700', color: C.white, marginBottom: 5 },
  featureBody: { fontSize: 13, color: C.muted, lineHeight: 19 },

  // Sync
  syncText: { fontSize: 15, color: C.muted },
});
