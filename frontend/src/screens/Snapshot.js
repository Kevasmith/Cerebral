import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatSheet from '../components/ChatSheet';
import CerebralAvatar from '../components/CerebralAvatar';
import TrendLine from '../components/TrendLine';
import WelcomeSheet from '../components/WelcomeSheet';
import NotificationsSheet from '../components/NotificationsSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';
import { registerForPushNotifications } from '../utils/notifications';
import { C, SHADOW } from '../constants/theme';

const WELCOME_SHOWN_KEY  = 'cerebral.welcomeSheetShown.v1';
const NOTIF_ASKED_KEY    = 'cerebral.notificationsAskedInApp.v1';

// Returns a time-of-day greeting in the user's local time.
function timeGreeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function firstName(displayName) {
  if (!displayName) return '';
  return String(displayName).trim().split(/\s+/)[0];
}

const IS_WEB = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ points = [], color = C.green, height = 56, width }) {
  const W = width ?? Math.min(SW - 80, 600);
  return (
    <TrendLine points={points} color={color} width={W} height={height} fill showDots={false} />
  );
}

// ─── Insight tone mapping ─────────────────────────────────────────────────────
const INSIGHT_CONFIG = {
  opt:    { label: 'Optimization Found', icon: 'wallet-outline',      color: C.green,  dim: C.greenDim,   border: C.greenBorder },
  risk:   { label: 'Risk Alert',         icon: 'warning-outline',     color: C.amber,  dim: C.amberDim,   border: C.amberBorder },
  wealth: { label: 'Wealth Building',    icon: 'trending-up-outline', color: C.violet, dim: C.violetDim,  border: C.violetBorder },
};
const INSIGHT_TONE = {
  overspending: 'risk', idle_cash: 'wealth', income_trend: 'wealth',
  opportunity: 'opt', savings_tip: 'opt',
};

function relativeTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

// ─── Cerebral Pick tone mapping ───────────────────────────────────────────────
const PICK_CONFIG = {
  cash_optimization:    { label: 'Cash Move',     icon: 'wallet-outline',      color: C.green,  dim: C.greenDim,  border: C.greenBorder  },
  allocation_rebalance: { label: 'Rebalance',     icon: 'swap-horizontal',     color: C.violet, dim: C.violetDim, border: C.violetBorder },
  goal_acceleration:    { label: 'Accelerate',    icon: 'rocket-outline',      color: C.amber,  dim: C.amberDim,  border: C.amberBorder  },
  bill_reduction:       { label: 'Trim Fees',     icon: 'cut-outline',         color: C.red,    dim: C.redDim,    border: C.amberBorder  },
  investment_explainer: { label: 'Learn',         icon: 'trending-up-outline', color: C.teal,   dim: C.tealDim,   border: C.tealBorder   },
};

function fmtMoney(n) {
  if (typeof n !== 'number' || !isFinite(n)) return '';
  return '$' + Math.round(n).toLocaleString();
}

function impactLabel(impact) {
  if (!impact) return '';
  if (impact.kind === 'annual_return') return `+${fmtMoney(impact.value)}/yr`;
  if (impact.kind === 'months_faster') return `${impact.value} mo faster`;
  return '';
}

function PickCard({ pick }) {
  const cfg = PICK_CONFIG[pick.type] ?? PICK_CONFIG.investment_explainer;
  const impact = impactLabel(pick.expectedImpact);
  return (
    <View style={styles.insightCard}>
      <View style={[styles.insightIcon, { backgroundColor: cfg.dim, borderColor: cfg.border }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.insightMeta}>
          <Text style={[styles.insightLabel, { color: cfg.color }]}>{cfg.label}</Text>
          {impact ? <Text style={[styles.insightAge, { color: cfg.color, fontWeight: '700' }]}>{impact}</Text> : null}
        </View>
        <Text style={[styles.insightTitle, IS_WEB && { fontFamily: 'Geist' }]} numberOfLines={2}>
          {pick.title}
        </Text>
        <Text style={styles.insightBody} numberOfLines={3}>
          {pick.matchReason ?? pick.description ?? ''}
        </Text>
      </View>
    </View>
  );
}

function InsightCard({ insight, onPress }) {
  const type = INSIGHT_TONE[insight.type] ?? 'opt';
  const cfg  = INSIGHT_CONFIG[type];
  return (
    <TouchableOpacity style={styles.insightCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.insightIcon, { backgroundColor: cfg.dim, borderColor: cfg.border }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.insightMeta}>
          <Text style={[styles.insightLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.insightAge}>{insight.age ?? relativeTime(insight.createdAt)}</Text>
        </View>
        <Text style={[styles.insightTitle, IS_WEB && { fontFamily: 'Geist' }]} numberOfLines={2}>
          {insight.title}
        </Text>
        <Text style={styles.insightBody} numberOfLines={2}>
          {insight.body ?? insight.description ?? ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Net Worth Card ───────────────────────────────────────────────────────────
function NetWorthCard({ netWorth = 0, change, sparkData, forecast }) {
  const fmt = (n) => {
    const [whole, dec] = Math.abs(n).toFixed(2).split('.');
    return { whole: '$' + parseInt(whole).toLocaleString(), dec };
  };
  const { whole, dec } = fmt(netWorth);
  const showChange = typeof change === 'number';
  const showSpark  = Array.isArray(sparkData) && sparkData.length > 1;
  const positive   = (change ?? 0) >= 0;

  const cf = forecast?.cashFlow;
  const showForecast = cf && typeof cf.projectedLow === 'number' && (cf.confidence ?? 0) >= 0.5;
  const forecastDate = showForecast ? new Date(cf.projectedLowDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : null;

  return (
    <View style={styles.networthCard}>
      <View style={styles.networthTop}>
        <Text style={styles.networthLabel}>TOTAL NET WORTH</Text>
        {showChange && (
          <View style={styles.changePill}>
            <Ionicons
              name={positive ? 'trending-up' : 'trending-down'}
              size={11}
              color={C.green}
            />
            <Text style={styles.changeText}>
              {positive ? '+' : '−'}{Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <View style={styles.networthAmtRow}>
        <Text style={[styles.networthAmt, IS_WEB && { fontFamily: 'Geist' }]}>{whole}</Text>
        <Text style={[styles.networthDec, IS_WEB && { fontFamily: 'Geist' }]}>.{dec}</Text>
      </View>
      {showSpark && (
        <View style={{ marginTop: 18, marginHorizontal: -4 }}>
          <Sparkline points={sparkData} />
        </View>
      )}
      {showForecast && (
        <View style={styles.forecastRow}>
          <Ionicons name="git-branch-outline" size={12} color={C.faint} />
          <Text style={styles.forecastText}>
            Likely month-end: <Text style={{ color: C.text, fontWeight: '700' }}>${cf.projectedLow.toLocaleString()}</Text>
            {forecastDate ? ` · ${forecastDate}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Snapshot({ navigation }) {
  const insets  = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);

  const [chatOpen,   setChatOpen]   = useState(false);
  const [dashboard,  setDashboard]  = useState(null);
  const [insights,   setInsights]   = useState([]);
  const [picks,      setPicks]      = useState([]);
  const [forecast,   setForecast]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [welcomeOpen,      setWelcomeOpen]      = useState(false);
  const [notifSheetOpen,   setNotifSheetOpen]   = useState(false);

  // First-visit flow: show celebration sheet, then on dismiss surface the
  // notifications opt-in sheet (only on native; only if not already asked).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const shown = await AsyncStorage.getItem(WELCOME_SHOWN_KEY);
        if (!shown) setWelcomeOpen(true);
      } catch {}
    })();
  }, []);

  const dismissWelcome = useCallback(async () => {
    setWelcomeOpen(false);
    try { await AsyncStorage.setItem(WELCOME_SHOWN_KEY, '1'); } catch {}
    if (Platform.OS === 'web') return;
    try {
      const asked = await AsyncStorage.getItem(NOTIF_ASKED_KEY);
      if (asked) return;
      const Notifications = require('expo-notifications');
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') return; // already opted in elsewhere — nothing to do
      setNotifSheetOpen(true);
    } catch {}
  }, []);

  const enableNotifs = useCallback(async () => {
    setNotifSheetOpen(false);
    try { await AsyncStorage.setItem(NOTIF_ASKED_KEY, '1'); } catch {}
    try {
      const token = await registerForPushNotifications();
      if (token) await api.patch('/users/me/push-token', { expoPushToken: token });
    } catch {}
  }, []);

  const skipNotifs = useCallback(async () => {
    setNotifSheetOpen(false);
    try { await AsyncStorage.setItem(NOTIF_ASKED_KEY, '1'); } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const [dRes, iRes, pRes, fRes] = await Promise.all([
        api.get('/accounts/dashboard'),
        api.get('/insights'),
        api.get('/opportunities').catch(() => ({ data: [] })),
        api.get('/forecast').catch(() => ({ data: null })),
      ]);
      setDashboard(dRes.data);
      setInsights(iRes.data?.slice(0, 3) ?? []);
      setPicks(pRes.data?.slice(0, 3) ?? []);
      setForecast(fRes.data ?? null);
    } catch {
      setDashboard(null);
      setInsights([]);
      setPicks([]);
      setForecast(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pull-to-refresh also kicks the insights engine so any newly-eligible alerts
  // (low-balance forecast, high-impact pick) fire and send a push.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await api.post('/insights/refresh').catch(() => null);
    await load();
    setRefreshing(false);
  }, [load]);

  const netWorth = dashboard?.totalCashAvailable ?? 0;
  const trendPct = dashboard?.spendingTrend?.percentageChange;
  const trendDir = dashboard?.spendingTrend?.direction;
  const showChange = typeof trendPct === 'number' && trendDir;
  const changeValue = showChange
    ? (trendDir === 'up' ? Math.abs(trendPct) : -Math.abs(trendPct))
    : undefined;

  const greeting = timeGreeting();
  const name     = firstName(profile?.displayName);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Green hero — header row + time-aware greeting */}
      <View style={styles.hero}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerLeft} onPress={() => setChatOpen(true)} activeOpacity={0.75}>
            <CerebralAvatar />
            <Text style={[styles.brand, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate?.('IntelligenceHub', { insights })}
          >
            <Ionicons name="notifications-outline" size={22} color={C.textInvert} />
            {insights.length > 0 && (
              <View style={styles.bellDot} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.heroBody}>
          <Text style={[styles.heroGreeting, IS_WEB && { fontFamily: 'Geist' }]}>{greeting},</Text>
          <Text style={[styles.heroName, IS_WEB && { fontFamily: 'Geist' }]} numberOfLines={1}>
            {name || 'welcome back'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />
        }
      >
        {/* Net Worth */}
        <NetWorthCard netWorth={netWorth} change={changeValue} forecast={forecast} />

        {/* Manage Assets — black pill */}
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => navigation?.navigate?.('ConnectBank')}
          activeOpacity={0.85}
        >
          <Ionicons name="wallet-outline" size={17} color={C.textInvert} />
          <Text style={[styles.manageBtnText, IS_WEB && { fontFamily: 'Geist' }]}>Manage Assets</Text>
        </TouchableOpacity>

        {/* Pulse Check + Cerebral Insights — combined card */}
        <View style={styles.aiSection}>
          {/* Pulse header */}
          <View style={styles.pulseHeader}>
            <View style={styles.pulseLabelRow}>
              <Ionicons name="sparkles" size={11} color={C.green} />
              <Text style={[styles.pulseLabel, IS_WEB && { fontFamily: 'Geist' }]}>AI AGENT ACTIVE</Text>
            </View>
            <Text style={[styles.pulseTitle, IS_WEB && { fontFamily: 'Geist' }]}>Pulse Check</Text>
            <Text style={styles.pulseBody}>
              {insights.length > 0
                ? `${insights.length} new insight${insights.length === 1 ? '' : 's'} ready for review. No urgent actions required.`
                : 'Connect a bank account to start receiving personalized insights.'}
            </Text>
          </View>

          {/* Insight cards */}
          {insights.length > 0 ? (
            <View style={styles.insightsList}>
              {insights.map((ins, i) => (
                <InsightCard
                  key={ins.id ?? i}
                  insight={ins}
                  onPress={() => navigation?.navigate?.('InsightDetail', { insight: ins })}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyInner}>
              <Text style={styles.emptyText}>No insights yet — connect a bank to get started.</Text>
            </View>
          )}

          {/* View Intelligence Hub button — inside card */}
          <TouchableOpacity
            style={styles.hubBtn}
            onPress={() => navigation?.navigate?.('IntelligenceHub', { insights })}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={15} color={C.textInvert} />
            <Text style={[styles.hubBtnText, IS_WEB && { fontFamily: 'Geist' }]}>View Intelligence Hub</Text>
            <Ionicons name="arrow-forward" size={15} color={C.textInvert} />
          </TouchableOpacity>
        </View>

        {/* Cerebral Picks — money-optimization moves derived from accounts + plan split */}
        <View style={styles.oppSection}>
          <View style={styles.oppHeader}>
            <View style={styles.oppLabelRow}>
              <Ionicons name="sparkles" size={11} color={C.green} />
              <Text style={[styles.oppEyebrow, IS_WEB && { fontFamily: 'Geist' }]}>CEREBRAL PICKS</Text>
            </View>
            <Text style={[styles.oppTitle, IS_WEB && { fontFamily: 'Geist' }]}>Smart money moves</Text>
            <Text style={styles.oppBody}>
              {picks.length > 0
                ? 'Tailored to your balances and the split you agreed for your goal.'
                : 'Connect a bank to see personalized money moves.'}
            </Text>
          </View>

          {picks.length > 0 && (
            <View style={styles.insightsList}>
              {picks.map((p, i) => (
                <PickCard key={p.id ?? i} pick={p} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <ChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} screenKey="snapshot" />
      <WelcomeSheet visible={welcomeOpen} name={profile?.displayName} onDismiss={dismissWelcome} />
      <NotificationsSheet visible={notifSheetOpen} onEnable={enableNotifs} onSkip={skipNotifs} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Root carries the green so the status-bar safe area renders green too.
  root:    { flex: 1, backgroundColor: C.green },
  // Scroll body sits on cream. The hero above scrolls away as the user pulls.
  scroll:  { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingTop: 20 },

  // ── Green hero ──
  hero: {
    backgroundColor: C.green,
    paddingHorizontal: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand:      { fontSize: 17, fontWeight: '800', color: C.textInvert, letterSpacing: -0.2 },
  bellBtn:    { padding: 4, position: 'relative' },
  bellDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FFE066',
    borderWidth: 1.5, borderColor: C.green,
  },

  heroBody:     { paddingTop: 18, paddingBottom: 6 },
  heroGreeting: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.80)', letterSpacing: -0.1 },
  heroName:     { fontSize: 30, fontWeight: '900', color: C.textInvert, letterSpacing: -0.6, marginTop: 4 },

  // Net Worth Card
  networthCard: {
    backgroundColor: C.card,
    borderRadius: 22, padding: 22,
    marginTop: 18, marginBottom: 14,
    overflow: 'hidden',
    ...SHADOW,
  },
  networthTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  networthLabel: { fontSize: 11, fontWeight: '700', color: C.faint, letterSpacing: 1.2 },
  changePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.greenDim, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  changeText:    { fontSize: 12, fontWeight: '700', color: C.green },
  networthAmtRow:{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  networthAmt:   { fontSize: 38, fontWeight: '800', color: C.text, letterSpacing: -1.4 },
  networthDec:   { fontSize: 18, fontWeight: '600', color: C.faint, marginBottom: 4, marginLeft: 1 },

  // Forecast subtitle — calm, low-emphasis "likely month-end" line.
  forecastRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  forecastText: { fontSize: 12, color: C.soft, flexShrink: 1 },

  // Manage Assets — black pill
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.surfaceDeep,
    borderRadius: 999, paddingVertical: 16,
    marginBottom: 18,
    ...SHADOW,
  },
  manageBtnText: { fontSize: 15, fontWeight: '700', color: C.textInvert },

  // Combined AI section (Pulse + Insights + Hub button)
  aiSection: {
    backgroundColor: C.card,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 18,
    ...SHADOW,
  },
  pulseHeader: {
    padding: 20,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  pulseLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  pulseLabel:    { fontSize: 11, fontWeight: '800', color: C.green, letterSpacing: 1.2 },
  pulseTitle:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.4 },
  pulseBody:     { fontSize: 13.5, color: C.soft, lineHeight: 20 },

  // Insights
  insightsList: { padding: 12, gap: 8 },
  insightCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.bg,
    borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: C.border,
  },
  insightIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1,
  },
  insightMeta:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  insightLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  insightAge:   { fontSize: 11, color: C.faint },
  insightTitle: { fontSize: 14.5, fontWeight: '700', color: C.text, marginBottom: 3, letterSpacing: -0.2 },
  insightBody:  { fontSize: 12.5, color: C.soft, lineHeight: 17 },

  // Empty state (inside aiSection)
  emptyInner: {
    paddingVertical: 24, paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center' },

  // View Intelligence Hub — black pill (sits inside aiSection)
  hubBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.surfaceDeep,
    borderRadius: 14, paddingVertical: 14,
    margin: 14, marginTop: 6,
  },
  hubBtnText: { fontSize: 14, fontWeight: '700', color: C.textInvert },

  // Opportunities Nearby — mirrors aiSection
  oppSection: {
    backgroundColor: C.card,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 18,
    ...SHADOW,
  },
  oppHeader:   { padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  oppLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  oppEyebrow:  { fontSize: 11, fontWeight: '800', color: C.green, letterSpacing: 1.2 },
  oppTitle:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.4 },
  oppBody:     { fontSize: 13.5, color: C.soft, lineHeight: 20 },
});
