import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';
import ChatSheet from '../components/ChatSheet';
import CerebralAvatar from '../components/CerebralAvatar';
import { C, SHADOW, SHADOW_SOFT } from '../constants/theme';
import { BANKS } from '../constants/banks';
import { timeSince, bankColor, bankInitial } from '../utils/format';
import { openPlaidLink } from '../utils/plaidLink';

const IS_WEB = Platform.OS === 'web';

// Roll up per-account rows into one entry per institution. We intentionally
// don't surface account names or balances here — the institution-level view
// is the privacy-friendly default (Plaid's my.plaid.com follows the same
// pattern). Drill-down with balances can be a separate, opt-in surface
// later if needed.
function groupByInstitution(accounts) {
  const map = new Map();
  for (const a of accounts ?? []) {
    const key = a.institutionName ?? 'Bank';
    const entry = map.get(key) ?? { institutionName: key, count: 0, lastSyncedAt: null };
    entry.count += 1;
    const t = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0;
    const cur = entry.lastSyncedAt ? new Date(entry.lastSyncedAt).getTime() : 0;
    if (t > cur) entry.lastSyncedAt = a.lastSyncedAt;
    map.set(key, entry);
  }
  return Array.from(map.values());
}

// ─── Connected institution row ────────────────────────────────────────────────
// Minimal: logo, institution name, sync state, trailing unlink icon. No
// balances surfaced. Two ways to disconnect:
//   - Swipe the row left → reveals a red "Disconnect" panel
//   - Tap the trailing unlink icon → same confirm + remove
// The icon is kept as a discoverable affordance because some users won't
// think to swipe; both paths route through the same confirmDisconnect.
function InstitutionRow({ institution, onDisconnect }) {
  const initials = bankInitial(institution.institutionName);
  const color = bankColor(institution.institutionName);
  const syncedLabel = timeSince(institution.lastSyncedAt);
  const countLabel =
    institution.count === 1 ? '1 account connected' : `${institution.count} accounts connected`;

  const swipeRef = useRef(null);

  const confirmDisconnect = () => {
    const close = () => swipeRef.current?.close?.();
    const proceed = () => {
      close();
      onDisconnect?.(institution.institutionName);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(
        `Disconnect ${institution.institutionName}?\n\nCerebral will stop syncing these accounts and remove their data.`
      )) proceed();
      else close();
    } else {
      Alert.alert(
        `Disconnect ${institution.institutionName}?`,
        'Cerebral will stop syncing these accounts and remove their data.',
        [
          { text: 'Cancel',     style: 'cancel', onPress: close },
          { text: 'Disconnect', style: 'destructive', onPress: proceed },
        ],
      );
    }
  };

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.swipeDisconnect}
      activeOpacity={0.85}
      onPress={confirmDisconnect}
    >
      <Ionicons name="unlink-outline" size={20} color={C.textInvert} />
      <Text style={styles.swipeDisconnectText}>Disconnect</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <View style={styles.institutionRow}>
        <View style={[styles.institutionLogo, { backgroundColor: color }]}>
          <Text style={styles.institutionLogoText}>{initials}</Text>
        </View>
        <View style={styles.institutionMeta}>
          <Text style={[styles.institutionName, IS_WEB && { fontFamily: 'Geist' }]}>
            {institution.institutionName}
          </Text>
          <Text style={styles.institutionSub}>
            {countLabel}
            {syncedLabel ? ` · synced ${syncedLabel}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={confirmDisconnect}
          style={styles.disconnectBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="unlink-outline" size={18} color={C.red} />
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
}

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

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Accounts({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();

  const [chatOpen, setChatOpen]       = useState(false);
  const [search, setSearch]           = useState('');
  const [accounts, setAccounts]       = useState([]);
  const [loadingAccounts, setLoading] = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const [linkLoading, setLinkLoading] = useState(false);
  const [syncing, setSyncing]         = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data ?? []);
    } catch {
      // keep whatever was already loaded
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Roll the flat account list into one entry per institution. Recomputed
  // whenever the underlying account list changes (sync, disconnect, refresh).
  const institutions = useMemo(() => groupByInstitution(accounts), [accounts]);

  // Disconnect every account under one institution. Backend wipes the
  // accounts + their transactions for this user; we optimistically prune
  // the local list while the request is in flight, then re-fetch to settle.
  const handleDisconnect = useCallback(async (institutionName) => {
    const before = accounts;
    setAccounts((prev) => prev.filter((a) => (a.institutionName ?? 'Bank') !== institutionName));
    try {
      await api.delete(`/accounts/institution/${encodeURIComponent(institutionName)}`);
      await fetchAccounts();
    } catch (err) {
      // Rollback the optimistic prune and surface the error so the user knows
      setAccounts(before);
      const msg = err?.response?.data?.message || err?.message || 'Could not disconnect this institution.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Disconnect failed', msg);
    }
  }, [accounts, fetchAccounts]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAccounts();
  }, [fetchAccounts]);

  // Plaid Link flow:
  // 1) POST /accounts/link-token → server-issued link_token
  // 2) Open Plaid Link (native modal on iOS/Android, hosted modal on web)
  // 3) On success → POST /accounts/sync with the public_token; refresh accounts
  const openConnect = useCallback(async () => {
    setLinkLoading(true);
    try {
      const { data } = await api.post('/accounts/link-token');
      setLinkLoading(false);

      // BankConnectInit shape: { kind: 'link_token' | 'iframe_url', value: string }
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
            await fetchAccounts();
          } catch {
            // swallow — user can retry from the bank tile
          } finally {
            setSyncing(false);
          }
        },
        onExit: () => {
          // user dismissed; nothing to do
        },
      });
    } catch {
      setLinkLoading(false);
    }
  }, [fetchAccounts]);

  const filteredBanks = search.trim()
    ? BANKS.filter(b => b.label.toLowerCase().includes(search.toLowerCase()))
    : BANKS;

  const initial = profile?.displayName?.[0]?.toUpperCase() ?? 'C';

  if (syncing) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={styles.syncingText}>Syncing your accounts…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => setChatOpen(true)} activeOpacity={0.75}>
          <CerebralAvatar />
          <View>
            <Text style={[styles.headerBrand, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral</Text>
            <Text style={styles.headerSub}>Intelligence</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
            <View style={styles.bellWrap}>
              <Ionicons name="notifications-outline" size={20} color={C.teal} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate?.('Settings')}
          >
            <View style={styles.bellWrap}>
              <Ionicons name="settings-outline" size={20} color={C.muted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.teal}
            colors={[C.teal]}
          />
        }
      >
        {/* Page heading */}
        <Text style={[styles.pageTitle, IS_WEB && { fontFamily: 'Geist' }]}>
          Accounts &{'\n'}Connectivity
        </Text>
        <Text style={styles.pageSubtitle}>
          Manage your linked institutions and sync new ones.
        </Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={C.faint} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, IS_WEB && { outlineStyle: 'none' }]}
            placeholder="Search accounts or institutions"
            placeholderTextColor={C.faint}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color={C.faint} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Active Accounts ──────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>Active Accounts</Text>
          {accounts.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{institutions.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          {loadingAccounts ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={C.teal} />
              <Text style={styles.emptyText}>Loading accounts…</Text>
            </View>
          ) : institutions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="wallet-outline" size={28} color={C.teal} />
              </View>
              <Text style={[styles.emptyTitle, IS_WEB && { fontFamily: 'Geist' }]}>No accounts linked</Text>
              <Text style={styles.emptyText}>Connect a bank below to get started.</Text>
            </View>
          ) : (
            institutions
              .filter(inst =>
                !search.trim() ||
                inst.institutionName.toLowerCase().includes(search.toLowerCase())
              )
              .map((inst, i, arr) => (
                <View key={inst.institutionName}>
                  <InstitutionRow institution={inst} onDisconnect={handleDisconnect} />
                  {i < arr.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ))
          )}
        </View>

        {/* ── Link New Institution ─────────────────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>Link New Institution</Text>
        </View>

        <View style={styles.bankGrid}>
          {filteredBanks.map((bank) => (
            <BankTile key={bank.label} bank={bank} onPress={openConnect} />
          ))}
        </View>

        {linkLoading && (
          <ActivityIndicator size="small" color={C.teal} style={{ marginBottom: 16 }} />
        )}

        <TouchableOpacity
          style={styles.findOtherBtn}
          onPress={openConnect}
          activeOpacity={0.85}
          disabled={linkLoading}
        >
          <Ionicons name="add-circle-outline" size={18} color={C.textInvert} style={{ marginRight: 8 }} />
          <Text style={[styles.findOtherText, IS_WEB && { fontFamily: 'Geist' }]}>
            Find Other Institution
          </Text>
        </TouchableOpacity>

        {/* ── Security trust card ──────────────────────────────────────────── */}
        <View style={styles.securityCard}>
          <View style={styles.securityIconWrap}>
            <Ionicons name="shield-checkmark" size={24} color={C.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.securityTitle, IS_WEB && { fontFamily: 'Geist' }]}>
              Institutional Grade Security
            </Text>
            <Text style={styles.securityBody}>
              All connections use 256-bit encryption and read-only access. Cerebral never stores your credentials or initiates transactions.
            </Text>
            <View style={styles.securityBadges}>
              <View style={styles.securityBadge}>
                <Ionicons name="lock-closed" size={10} color={C.teal} />
                <Text style={styles.securityBadgeText}>256-BIT TLS</Text>
              </View>
              <View style={styles.securityBadge}>
                <Ionicons name="eye-off-outline" size={10} color={C.teal} />
                <Text style={styles.securityBadgeText}>READ-ONLY</Text>
              </View>
              <View style={styles.securityBadge}>
                <Ionicons name="checkmark-circle-outline" size={10} color={C.teal} />
                <Text style={styles.securityBadgeText}>PLAID CERTIFIED</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBrand: { fontSize: 16, fontWeight: '800', color: C.text, lineHeight: 19 },
  headerSub:   { fontSize: 10, fontWeight: '600', color: C.green, letterSpacing: 1.2, lineHeight: 14 },
  bellBtn: { padding: 2 },
  bellWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.cardAlt,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Page heading
  pageTitle: {
    fontSize: 30, fontWeight: '900', color: C.text,
    letterSpacing: -0.5, lineHeight: 36, marginTop: 24, marginBottom: 8,
  },
  pageSubtitle: { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 20 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.input,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 28,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  countBadge: {
    backgroundColor: C.tealDim, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 2,
    borderWidth: 1, borderColor: C.tealBorder,
  },
  countText: { fontSize: 11, fontWeight: '800', color: C.teal },

  // Accounts card
  card: {
    backgroundColor: C.card, borderRadius: 20,
    overflow: 'hidden',
    ...SHADOW_SOFT,
  },

  // Institution row (one entry per connected bank — no balances surfaced)
  institutionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 14,
    backgroundColor: C.card,
  },
  rowDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  institutionLogo: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  institutionLogoText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  institutionMeta:     { flex: 1, minWidth: 0 },
  institutionName:     { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
  institutionSub:      { fontSize: 12, color: C.muted },

  // Trailing disconnect icon button
  disconnectBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: C.redDim,
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
  emptyText:  { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },

  // Bank grid
  bankGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
  },
  bankTile: {
    width: '47%',
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 10,
    ...SHADOW_SOFT,
  },
  bankMark: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  bankMarkText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  bankLabel: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' },

  // Find other button — black pill
  findOtherBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surfaceDeep, borderRadius: 999,
    paddingVertical: 15, paddingHorizontal: 28,
    marginBottom: 28,
    ...SHADOW,
  },
  findOtherText: { fontSize: 15, fontWeight: '700', color: C.textInvert, letterSpacing: 0.3 },

  // Security card
  securityCard: {
    flexDirection: 'row', gap: 14,
    backgroundColor: C.card, borderRadius: 20, padding: 18,
    ...SHADOW_SOFT,
  },
  securityIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  securityTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 6 },
  securityBody:  { fontSize: 12, color: C.muted, lineHeight: 18, marginBottom: 12 },
  securityBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  securityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.tealDim, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: C.tealBorder,
  },
  securityBadgeText: { fontSize: 9, fontWeight: '800', color: C.teal, letterSpacing: 0.5 },

  // Syncing
  syncingText: { fontSize: 15, color: C.muted, marginTop: 16 },
});
