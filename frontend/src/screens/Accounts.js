import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';
import ChatSheet from '../components/ChatSheet';
import CerebralAvatar from '../components/CerebralAvatar';
import { C } from '../constants/theme';
import { BANKS } from '../constants/banks';
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPE_ICON } from '../constants/account-types';
import { fmtBalance, timeSince, bankColor, bankInitial } from '../utils/format';
import { openPlaidLink } from '../utils/plaidLink';

const IS_WEB = Platform.OS === 'web';

// ─── Active account row ───────────────────────────────────────────────────────
function AccountRow({ account }) {
  const typeKey = account.accountType ?? 'checking';
  const typeLabel = ACCOUNT_TYPE_LABEL[typeKey] ?? typeKey;
  const typeIcon = ACCOUNT_TYPE_ICON[typeKey] ?? 'card-outline';
  const initials = bankInitial(account.institutionName);
  const color = bankColor(account.institutionName);
  const syncedLabel = timeSince(account.lastSyncedAt);

  return (
    <View style={styles.accountRow}>
      <View style={[styles.accountLogo, { backgroundColor: color }]}>
        <Text style={styles.accountLogoText}>{initials}</Text>
      </View>
      <View style={styles.accountMeta}>
        <Text style={[styles.accountName, IS_WEB && { fontFamily: 'Geist' }]}>
          {account.institutionName ?? 'Bank'}
        </Text>
        <View style={styles.accountSubRow}>
          <Ionicons name={typeIcon} size={11} color={C.muted} />
          <Text style={styles.accountSub}>{typeLabel}</Text>
          {account.accountName ? (
            <Text style={styles.accountSub}> · {account.accountName}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.accountRight}>
        <Text style={[styles.accountBalance, IS_WEB && { fontFamily: 'Geist' }]}>
          {fmtBalance(account.balance)} {account.currency ?? 'CAD'}
        </Text>
        <View style={styles.syncBadge}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>{syncedLabel ? `Synced ${syncedLabel}` : 'Active'}</Text>
        </View>
      </View>
    </View>
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
              <Text style={styles.countText}>{accounts.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          {loadingAccounts ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={C.teal} />
              <Text style={styles.emptyText}>Loading accounts…</Text>
            </View>
          ) : accounts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="wallet-outline" size={28} color={C.teal} />
              </View>
              <Text style={[styles.emptyTitle, IS_WEB && { fontFamily: 'Geist' }]}>No accounts linked</Text>
              <Text style={styles.emptyText}>Connect a bank below to get started.</Text>
            </View>
          ) : (
            accounts
              .filter(a =>
                !search.trim() ||
                (a.institutionName ?? '').toLowerCase().includes(search.toLowerCase()) ||
                (a.accountName ?? '').toLowerCase().includes(search.toLowerCase())
              )
              .map((acct, i, arr) => (
                <View key={acct.id ?? i}>
                  <AccountRow account={acct} />
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
          <Ionicons name="add-circle-outline" size={18} color={C.bg} style={{ marginRight: 8 }} />
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
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBrand: { fontSize: 16, fontWeight: '800', color: C.white, lineHeight: 19 },
  headerSub:   { fontSize: 10, fontWeight: '600', color: C.teal, letterSpacing: 1.2, lineHeight: 14 },
  bellBtn: { padding: 2 },
  bellWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.tealDim,
    borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  // Page heading
  pageTitle: {
    fontSize: 30, fontWeight: '900', color: C.white,
    letterSpacing: -0.5, lineHeight: 36, marginTop: 24, marginBottom: 8,
  },
  pageSubtitle: { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 20 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.input, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 28,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.white },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  countBadge: {
    backgroundColor: C.tealDim, borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 2,
    borderWidth: 1, borderColor: C.tealBorder,
  },
  countText: { fontSize: 11, fontWeight: '800', color: C.teal },

  // Accounts card
  card: {
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },

  // Account row
  accountRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  accountLogo: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  accountLogoText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  accountMeta: { flex: 1 },
  accountName: { fontSize: 14, fontWeight: '700', color: C.white, marginBottom: 4 },
  accountSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accountSub: { fontSize: 12, color: C.muted },
  accountRight: { alignItems: 'flex-end', gap: 5 },
  accountBalance: { fontSize: 14, fontWeight: '800', color: C.white },
  syncBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.greenDim, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: C.greenBorder,
  },
  syncDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: C.green },
  syncText: { fontSize: 9, fontWeight: '700', color: C.green, letterSpacing: 0.3 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.white, marginBottom: 6 },
  emptyText:  { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },

  // Bank grid
  bankGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
  },
  bankTile: {
    width: '47%',
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: C.border,
  },
  bankMark: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  bankMarkText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  bankLabel: { fontSize: 13, fontWeight: '600', color: C.white, textAlign: 'center' },

  // Find other button
  findOtherBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.teal, borderRadius: 999,
    paddingVertical: 15, paddingHorizontal: 28,
    marginBottom: 28,
  },
  findOtherText: { fontSize: 15, fontWeight: '800', color: C.bg, letterSpacing: 0.3 },

  // Security card
  securityCard: {
    flexDirection: 'row', gap: 14,
    backgroundColor: C.card, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: C.border,
  },
  securityIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  securityTitle: { fontSize: 15, fontWeight: '800', color: C.white, marginBottom: 6 },
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
