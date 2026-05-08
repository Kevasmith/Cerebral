import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';
import Skeleton from '../components/Skeleton';
import {
  MOCK_DASHBOARD, MOCK_INSIGHTS, MOCK_SPENDING_BREAKDOWN,
  MOCK_TRANSACTIONS, MOCK_MONTHLY_SPENDING,
} from '../data/mockData';
import { categoryMeta } from '../constants/categories';

const IS_WEB = Platform.OS === 'web';
const { height: SCREEN_H } = Dimensions.get('window');

const WEB_GRADIENT = IS_WEB
  ? { backgroundImage: 'linear-gradient(145deg, #0F172A 0%, #0b2018 40%, #085c3a 75%, #0a9165 100%)' }
  : {};

const C = {
  navy: '#0F172A', green: '#0a9165', greenLite: '#27ae60',
  violet: '#7C3AED', red: '#EF4444', amber: '#F59E0B',
  card: '#FBF9F4', cardNested: '#F7F4EC', bg: '#F4F2EC',
  faint: '#9aa3b2', soft: '#888', border: '#ECE8DC', track: '#ECE9DF',
};

const SHADOW = {
  shadowColor: '#0F172A', shadowOpacity: 0.08,
  shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
};

// Maps API insight types to visual tones
const INSIGHT_TONE = {
  overspending: 'risk', idle_cash: 'opt', income_trend: 'wealth',
  opportunity: 'opt', savings_tip: 'opt',
};
const INSIGHT_EYEBROW = {
  overspending: 'Risk Alert', idle_cash: 'Optimization', income_trend: 'Wealth Building',
  opportunity: 'Opportunity', savings_tip: 'Tip',
};
const INSIGHT_ICON = {
  overspending: 'warning-outline', idle_cash: 'bulb-outline', income_trend: 'trending-up-outline',
  opportunity: 'compass-outline', savings_tip: 'wallet-outline',
};
const TONES = {
  opt:    { dot: C.green,  tint: 'rgba(10,145,101,0.08)', txt: C.green  },
  risk:   { dot: C.red,    tint: 'rgba(239,68,68,0.08)',  txt: C.red    },
  wealth: { dot: '#2980b9', tint: 'rgba(41,128,185,0.08)', txt: '#2980b9' },
};

// ─── Sparkline ────────────────────────────────────────────────────────────────

function SparklineWeb() {
  return (
    <svg viewBox="0 0 320 70" style={{ width: '100%', height: 54, display: 'block' }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0a9165" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0a9165" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,55 Q40,52 70,42 T140,28 T210,18 T280,8 L320,5 L320,70 L0,70 Z" fill="url(#sparkFill)" />
      <path d="M0,55 Q40,52 70,42 T140,28 T210,18 T280,8 L320,5" fill="none" stroke="#0a9165" strokeWidth="2.4" strokeLinecap="round" />
      {[[70,42],[140,28],[210,18],[280,8]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="#fff" stroke="#0a9165" strokeWidth="1.6" />
      ))}
    </svg>
  );
}

function SparklineNative() {
  const heights = [8, 14, 20, 28, 38, 46];
  return (
    <View style={{ height: 54, flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingVertical: 4 }}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{ flex: 1, height: h, backgroundColor: C.green, borderRadius: 3, opacity: 0.5 + i * 0.1 }}
        />
      ))}
    </View>
  );
}

const MONTH_LABELS = ['JAN', 'MAR', 'JUN', 'SEP', 'NOW'];

// ─── Net Worth Block ─────────────────────────────────────────────────────────

function NetWorthBlock({ data }) {
  const fmt = (n) =>
    Number(n).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <View style={styles.networthCard}>
      <View style={styles.networthTopRow}>
        <Text style={styles.networthLabel}>TOTAL NET WORTH</Text>
        <View style={styles.changeBadge}>
          <Ionicons name="trending-up" size={12} color={C.green} />
          <Text style={styles.changeBadgeText}>+2.4%</Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={[styles.networthAmount, IS_WEB && { fontFamily: 'Geist' }]}>
          ${fmt(data?.totalCashAvailable ?? 1248392)}
        </Text>
        <Text style={styles.amountCents}>.42</Text>
      </View>

      {IS_WEB ? <SparklineWeb /> : <SparklineNative />}

      <View style={styles.monthLabels}>
        {MONTH_LABELS.map((m) => (
          <Text key={m} style={styles.monthLabel}>{m}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Pulse Card ───────────────────────────────────────────────────────────────

function PulseCard() {
  return (
    <View style={styles.pulseCard}>
      <View style={styles.pulseHeader}>
        <View style={styles.pulseIconWrap}>
          <Ionicons name="sparkles" size={10} color="#fff" />
        </View>
        <Text style={styles.pulseLabel}>AI Agent · Pulse Check</Text>
        <View style={styles.pulseLiveDot} />
      </View>
      <Text style={[styles.pulseTitle, IS_WEB && { fontFamily: 'Geist' }]}>
        Outperforming the benchmark by{' '}
        <Text style={{ color: C.green }}>+1.2%</Text> today.
      </Text>
      <Text style={styles.pulseBody}>
        No urgent actions required. I'll keep watch and ping you if anything moves.
      </Text>
    </View>
  );
}

// ─── Insight Row ──────────────────────────────────────────────────────────────

function InsightRow({ insight, onRead }) {
  const toneKey = INSIGHT_TONE[insight.type] ?? 'opt';
  const t = TONES[toneKey];
  const eyebrow = INSIGHT_EYEBROW[insight.type] ?? 'Insight';
  const icon = INSIGHT_ICON[insight.type] ?? 'information-circle-outline';
  const when = insight.createdAt
    ? new Date(insight.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    : 'Today';

  return (
    <TouchableOpacity
      style={styles.insightRow}
      onPress={() => !insight.isRead && onRead(insight.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.insightIcon, { backgroundColor: t.tint }]}>
        <Ionicons name={icon} size={18} color={t.txt} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.insightMeta}>
          <Text style={[styles.insightEyebrow, { color: t.txt }]}>{eyebrow}</Text>
          <Text style={styles.insightWhen}>{when}</Text>
        </View>
        <Text style={[styles.insightTitle, IS_WEB && { fontFamily: 'Geist' }]} numberOfLines={2}>
          {insight.title}
        </Text>
        <Text style={styles.insightBody} numberOfLines={2}>{insight.body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.faint} style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  );
}

// ─── Recent Activity Row ──────────────────────────────────────────────────────

function TxRow({ tx, isLast }) {
  return (
    <View style={[styles.txRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.txIconWrap, { backgroundColor: tx.isDebit ? '#fbeae6' : '#e6f3ec' }]}>
        <Ionicons
          name={categoryMeta(tx.category).icon}
          size={16}
          color={tx.isDebit ? C.red : C.green}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
        <Text style={styles.txMeta}>
          {categoryMeta(tx.category).label} ·{' '}
          {new Date(tx.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: tx.isDebit ? C.navy : C.green }, IS_WEB && { fontFamily: 'Geist' }]}>
        {tx.isDebit ? '−' : '+'}${Number(tx.amount).toFixed(2)}
      </Text>
    </View>
  );
}

// ─── Spending Chart ───────────────────────────────────────────────────────────

function SpendingChart({ data }) {
  const max     = Math.max(...data.map((d) => d.amount));
  const current = data[data.length - 1];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, IS_WEB && { fontFamily: 'Geist' }]}>Monthly Spending</Text>
        <Text style={[styles.chartAmount, IS_WEB && { fontFamily: 'Geist' }]}>${current.amount.toLocaleString()}</Text>
      </View>
      <View style={styles.barsContainer}>
        {data.map((d, i) => {
          const isCurrent = i === data.length - 1;
          const barH      = Math.max(Math.round((d.amount / max) * 72), 6);
          return (
            <View key={d.month} style={styles.barCol}>
              <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                <View style={[styles.barShape, {
                  height: barH,
                  backgroundColor: isCurrent ? C.green : C.track,
                  borderRadius: isCurrent ? 7 : 5,
                }]} />
              </View>
              <Text style={[styles.barLabel, isCurrent && styles.barLabelActive]}>
                {d.month}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Budget Tracker ───────────────────────────────────────────────────────────

function BudgetTracker({ data }) {
  const totalBudget = data.reduce((s, c) => s + c.budget, 0);
  const totalSpent  = data.reduce((s, c) => s + c.amount, 0);
  const overCount   = data.filter((c) => c.amount > c.budget).length;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, IS_WEB && { fontFamily: 'Geist' }]}>Budget Tracker</Text>
        <Text style={styles.budgetSub}>${totalSpent.toFixed(0)} / ${totalBudget.toFixed(0)}</Text>
      </View>
      {overCount > 0 && (
        <View style={styles.overBudgetBanner}>
          <Ionicons name="warning-outline" size={13} color={C.red} />
          <Text style={styles.overBudgetText}>
            {overCount} categor{overCount > 1 ? 'ies' : 'y'} over budget
          </Text>
        </View>
      )}
      {data.map((cat) => {
        const pct  = Math.min((cat.amount / cat.budget) * 100, 100);
        const over = cat.amount > cat.budget;
        return (
          <View key={cat.category} style={styles.catRow}>
            <View style={styles.catLabelRow}>
              <View style={[styles.catDot, { backgroundColor: over ? C.red : cat.color }]} />
              <Text style={styles.catName}>{cat.category}</Text>
              <Text style={[styles.catAmt, over && { color: C.red }, IS_WEB && { fontFamily: 'Geist' }]}>
                ${cat.amount.toFixed(0)}{over ? ` / $${cat.budget}` : ''}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barProgress, { width: `${pct}%`, backgroundColor: over ? C.red : cat.color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [snapshot, setSnapshot]         = useState(null);
  const [insights, setInsights]         = useState([]);
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const { profile } = useAuthStore();
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const r = await api.get('/accounts/dashboard');
      setSnapshot(r.data);
    } catch { setSnapshot(MOCK_DASHBOARD); }
    try {
      let data = [];
      const r = await api.get('/insights');
      data = r.data ?? [];
      if (data.length === 0) {
        const r2 = await api.post('/insights/refresh');
        data = r2.data ?? [];
      }
      setInsights(data.length > 0 ? data : MOCK_INSIGHTS);
    } catch { setInsights(MOCK_INSIGHTS); }
    try {
      const r    = await api.get('/transactions', { params: { limit: 4 } });
      const data = r.data ?? {};
      const items = Array.isArray(data) ? data : (data.transactions ?? []);
      if (items.length > 0) setTransactions(items);
    } catch { /* keep mock */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await api.patch(`/insights/${id}/read`);
      setInsights((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
    } catch {}
  };

  if (loading) {
    return (
      <ScrollView style={[styles.container, WEB_GRADIENT]} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
          <Skeleton height={24} width={170} borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton height={14} width={130} borderRadius={4} />
        </View>
        <Skeleton height={200} borderRadius={24} style={{ marginHorizontal: 16, marginBottom: 12 }} />
        <Skeleton height={80} borderRadius={18} style={{ marginHorizontal: 16, marginBottom: 16 }} />
        <View style={styles.contentArea}>
          <Skeleton height={130} borderRadius={20} style={{ marginHorizontal: 16, marginBottom: 12 }} />
          <Skeleton height={220} borderRadius={20} style={{ marginHorizontal: 16, marginBottom: 12 }} />
        </View>
      </ScrollView>
    );
  }

  const spending = snapshot?.spendingByCategory?.length > 0
    ? snapshot.spendingByCategory.map((s) => {
        const meta = categoryMeta(s.category);
        return {
          category: meta.label,
          amount:   s.total,
          color:    meta.color,
          budget:   meta.budget > 0 ? meta.budget : Math.ceil(s.total * 1.25),
        };
      })
    : MOCK_SPENDING_BREAKDOWN;

  const firstName = profile?.displayName ? profile.displayName.split(' ')[0] : null;

  return (
    <ScrollView
      style={[styles.container, WEB_GRADIENT]}
      contentContainerStyle={{ paddingBottom: 0 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
        />
      }
    >
      {/* ── Hero: greeting ── */}
      <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.greeting, IS_WEB && { fontFamily: 'Geist' }]}>
          Hey{firstName ? ` ${firstName}` : ''} 👋
        </Text>
        <Text style={styles.headerSub}>Here's your financial snapshot</Text>
      </View>

      {/* ── Net Worth Block ── */}
      <NetWorthBlock data={snapshot} />

      {/* ── AI Pulse Card ── */}
      <PulseCard />

      {/* ── Manage Assets button ── */}
      <TouchableOpacity
        style={[styles.manageBtn, IS_WEB && { backgroundImage: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLite} 100%)` }]}
        onPress={() => navigation.navigate('Opportunities')}
        activeOpacity={0.85}
      >
        <Ionicons name="wallet-outline" size={17} color="#fff" />
        <Text style={styles.manageBtnText}>Manage Assets</Text>
      </TouchableOpacity>

      {/* ── Cream content area ── */}
      <View style={styles.contentArea}>
        {IS_WEB ? (
          <>
            <View style={styles.webRow}>
              <View style={styles.webCol}><SpendingChart data={MOCK_MONTHLY_SPENDING} /></View>
              <View style={styles.webCol}><BudgetTracker data={spending} /></View>
            </View>

            {/* Cerebral Insights */}
            {insights.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionHeading, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral Insights</Text>
                  <Text style={styles.sectionLink}>Hub →</Text>
                </View>
                <View style={styles.insightsList}>
                  {insights.map((ins) => (
                    <InsightRow key={ins.id} insight={ins} onRead={markRead} />
                  ))}
                </View>
              </View>
            )}

            {/* Recent Activity */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionHeading, IS_WEB && { fontFamily: 'Geist' }]}>Recent Activity</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                  <Text style={styles.sectionLink}>See All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.txCard}>
                {transactions.slice(0, 5).map((tx, i) => (
                  <TxRow key={tx.id} tx={tx} isLast={i === Math.min(transactions.length, 5) - 1} />
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <SpendingChart data={MOCK_MONTHLY_SPENDING} />

            {/* Cerebral Insights */}
            {insights.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeading}>Cerebral Insights</Text>
                  <Text style={styles.sectionLink}>Hub →</Text>
                </View>
                <View style={styles.insightsList}>
                  {insights.map((ins) => (
                    <InsightRow key={ins.id} insight={ins} onRead={markRead} />
                  ))}
                </View>
              </View>
            )}

            {/* Recent Activity */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeading}>Recent Activity</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                  <Text style={styles.sectionLink}>See All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.txCard}>
                {transactions.slice(0, 5).map((tx, i) => (
                  <TxRow key={tx.id} tx={tx} isLast={i === Math.min(transactions.length, 5) - 1} />
                ))}
              </View>
            </View>

            <BudgetTracker data={spending} />
          </>
        )}
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  hero: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24,
  },
  greeting:  { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4, letterSpacing: -0.6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Net Worth Block
  networthCard: {
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 0,
    borderRadius: 24, padding: 20, ...SHADOW,
  },
  networthTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  networthLabel:   { fontSize: 10.5, fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.8 },
  changeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(10,145,101,0.1)', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  changeBadgeText: { fontSize: 11.5, fontWeight: '700', color: C.green },
  amountRow:       { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginBottom: 12 },
  networthAmount:  { fontSize: 38, fontWeight: '700', color: C.navy, letterSpacing: -1.4 },
  amountCents:     { fontSize: 16, fontWeight: '600', color: C.faint },
  monthLabels:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  monthLabel:      { fontSize: 10.5, color: C.faint, fontWeight: '600' },

  // Pulse Card
  pulseCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.18)',
    borderRadius: 18, padding: 16,
    shadowColor: C.violet, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  pulseHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  pulseIconWrap: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.violet, justifyContent: 'center', alignItems: 'center',
  },
  pulseLabel:   { fontSize: 10.5, fontWeight: '800', color: C.violet, textTransform: 'uppercase', letterSpacing: 1 },
  pulseLiveDot: { marginLeft: 'auto', width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  pulseTitle:   { fontSize: 16, fontWeight: '700', color: C.navy, letterSpacing: -0.3, lineHeight: 22, marginBottom: 4 },
  pulseBody:    { fontSize: 12.5, color: C.soft, lineHeight: 18 },

  // Manage Assets button
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 22,
    padding: 14, backgroundColor: C.green, borderRadius: 14,
    shadowColor: C.green, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  manageBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Content area
  contentArea: {
    backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 8, minHeight: SCREEN_H * 0.65,
  },
  webRow: { flexDirection: 'row' },
  webCol: { flex: 1 },

  // Shared card
  card: {
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, padding: 20, marginTop: 12, ...SHADOW,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle:  { fontSize: 16, fontWeight: '700', color: C.navy },
  chartAmount:{ fontSize: 16, fontWeight: '800', color: C.navy },

  // Spending bar chart
  barsContainer: { flexDirection: 'row', height: 96, alignItems: 'stretch', gap: 6 },
  barCol:         { flex: 1, flexDirection: 'column' },
  barShape:       { width: '80%' },
  barLabel:       { textAlign: 'center', fontSize: 11, color: '#bbb', fontWeight: '500', paddingTop: 6 },
  barLabelActive: { color: C.green, fontWeight: '700' },

  // Section headers
  section:       { paddingHorizontal: 16, marginTop: 16, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionHeading:{ fontSize: 18, fontWeight: '700', color: C.navy, letterSpacing: -0.3 },
  sectionLink:   { fontSize: 12, fontWeight: '700', color: C.green },

  // Insight rows
  insightsList: {},
  insightRow: {
    backgroundColor: C.card, borderRadius: 16, padding: 14,
    flexDirection: 'row', gap: 12, marginBottom: 8,
    borderWidth: 1, borderColor: C.border, ...SHADOW,
    shadowOpacity: 0.04, shadowRadius: 6,
  },
  insightIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  insightMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  insightEyebrow: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  insightWhen:  { fontSize: 11, color: C.faint },
  insightTitle: { fontSize: 14.5, fontWeight: '700', color: C.navy, letterSpacing: -0.2, lineHeight: 20, marginBottom: 3 },
  insightBody:  { fontSize: 12, color: C.soft, lineHeight: 17 },

  // Recent activity tx card
  txCard: {
    backgroundColor: C.card, borderRadius: 18, padding: 4,
    paddingHorizontal: 16, borderWidth: 1, borderColor: C.border,
    shadowColor: C.navy, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  txIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txDesc:     { fontSize: 13.5, fontWeight: '600', color: C.navy },
  txMeta:     { fontSize: 11.5, color: C.faint, marginTop: 1 },
  txAmount:   { fontSize: 13.5, fontWeight: '700' },

  // Budget
  budgetSub: { fontSize: 13, fontWeight: '700', color: C.faint },
  overBudgetBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef0ee', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 12,
  },
  overBudgetText: { fontSize: 12, color: C.red, fontWeight: '600' },
  catRow:      { marginBottom: 11 },
  catLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 },
  catDot:      { width: 8, height: 8, borderRadius: 4 },
  catName:     { flex: 1, fontSize: 13, color: '#555', fontWeight: '500' },
  catAmt:      { fontSize: 13, fontWeight: '700', color: C.navy },
  barTrack:    { height: 7, backgroundColor: C.track, borderRadius: 4, overflow: 'hidden' },
  barProgress: { height: 7, borderRadius: 4 },
});
