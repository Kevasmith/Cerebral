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

const CATEGORY_COLORS = {
  food: '#e67e22', transport: '#3498db', entertainment: '#9b59b6',
  shopping: '#27ae60', bills: '#e74c3c', health: '#1abc9c',
  travel: '#2980b9', other: '#95a5a6',
};
const CATEGORY_BUDGETS = {
  food: 400, transport: 200, entertainment: 100,
  shopping: 150, bills: 1500, health: 100, travel: 300, other: 100,
};

const IS_WEB = Platform.OS === 'web';
const { height: SCREEN_H } = Dimensions.get('window');

// Web gradient applied inline (can't put CSS backgroundImage in StyleSheet)
const WEB_GRADIENT = IS_WEB
  ? { backgroundImage: 'linear-gradient(145deg, #0F172A 0%, #0b2018 40%, #085c3a 75%, #0a9165 100%)' }
  : {};

const INSIGHT_CONFIG = {
  overspending: { accent: '#B85C00', chipBg: 'rgba(184,92,0,0.08)',   icon: 'trending-up-outline' },
  idle_cash:    { accent: '#0a9165', chipBg: 'rgba(10,145,101,0.10)', icon: 'bulb-outline'        },
  income_trend: { accent: '#27ae60', chipBg: 'rgba(39,174,96,0.10)',  icon: 'cash-outline'        },
  opportunity:  { accent: '#0F172A', chipBg: 'rgba(15,23,42,0.06)',   icon: 'compass-outline'     },
  savings_tip:  { accent: '#0a9165', chipBg: 'rgba(10,145,101,0.10)', icon: 'wallet-outline'      },
};

const ACCOUNT_COLORS = ['#0a9165', '#27ae60', '#e67e22', '#9b59b6'];

const TX_ICONS = {
  food:          'restaurant-outline',
  transport:     'car-outline',
  entertainment: 'film-outline',
  shopping:      'bag-handle-outline',
  bills:         'home-outline',
  health:        'heart-outline',
  income:        'cash-outline',
  transfer:      'swap-horizontal-outline',
  other:         'ellipse-outline',
};

// ─── Net Worth Card ──────────────────────────────────────────────────────────

function NetWorthCard({ data }) {
  const trend  = data.spendingTrend;
  const isUp   = trend.direction === 'up';
  const change = Math.abs(trend.currentMonth - trend.previousMonth);
  const fmt    = (n) =>
    Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <View style={styles.networthCard}>
      <Text style={styles.networthLabel}>Net Worth</Text>
      <Text style={[styles.networthAmount, IS_WEB && styles.networthAmountWeb]}>
        ${fmt(data.totalCashAvailable)}
      </Text>

      <View style={[styles.trendBadge, { backgroundColor: isUp ? 'rgba(231,76,60,0.12)' : 'rgba(46,204,113,0.12)' }]}>
        <Ionicons
          name={isUp ? 'trending-up-outline' : 'trending-down-outline'}
          size={13}
          color={isUp ? '#EF4444' : '#0a9165'}
        />
        <Text style={[styles.trendText, { color: isUp ? '#EF4444' : '#0a9165' }]}>
          {isUp ? '+' : '-'}${change.toFixed(0)} spending vs last month
        </Text>
      </View>

      <View style={styles.accountsRow}>
        {(data.accounts ?? []).map((acc, idx) => (
          <View key={acc.name} style={styles.accountChip}>
            <View style={[styles.accountDot, { backgroundColor: ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length] }]} />
            <View>
              <Text style={styles.accountChipName}>{acc.name}</Text>
              <Text style={styles.accountChipBalance}>${fmt(acc.balance)}</Text>
            </View>
          </View>
        ))}
      </View>
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
        <Text style={styles.cardTitle}>Monthly Spending</Text>
        <Text style={styles.chartAmount}>${current.amount.toLocaleString()}</Text>
      </View>
      <View style={styles.barsContainer}>
        {data.map((d, i) => {
          const isCurrent = i === data.length - 1;
          const barH      = Math.max(Math.round((d.amount / max) * 72), 6);
          return (
            <View key={d.month} style={styles.barCol}>
              <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                <View style={[styles.barShape, {
                  height:          barH,
                  backgroundColor: isCurrent ? '#0a9165' : '#E5E2D8',
                  borderRadius:    isCurrent ? 7 : 5,
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

// ─── Recent Transactions ─────────────────────────────────────────────────────

function RecentTransactions({ transactions, onSeeAll }) {
  const recent = transactions.slice(0, 4);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Transactions</Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      {recent.map((tx, idx) => (
        <View key={tx.id} style={[styles.txRow, idx === recent.length - 1 && { borderBottomWidth: 0 }]}>
          <View style={[styles.txIconWrap, { backgroundColor: tx.isDebit ? '#fef0ee' : '#edfaf3' }]}>
            <Ionicons
              name={TX_ICONS[tx.category] ?? 'ellipse-outline'}
              size={17}
              color={tx.isDebit ? '#EF4444' : '#0a9165'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
            <Text style={styles.txDate}>
              {new Date(tx.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <Text style={[styles.txAmount, { color: tx.isDebit ? '#EF4444' : '#0a9165' }]}>
            {tx.isDebit ? '-' : '+'}${Number(tx.amount).toFixed(2)}
          </Text>
        </View>
      ))}
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
        <Text style={styles.cardTitle}>Budget Tracker</Text>
        <Text style={styles.budgetSub}>${totalSpent.toFixed(0)} / ${totalBudget.toFixed(0)}</Text>
      </View>
      {overCount > 0 && (
        <View style={styles.overBudgetBanner}>
          <Ionicons name="warning-outline" size={13} color="#EF4444" />
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
              <View style={[styles.catDot, { backgroundColor: over ? '#EF4444' : cat.color }]} />
              <Text style={styles.catName}>{cat.category}</Text>
              <Text style={[styles.catAmt, over && { color: '#EF4444' }]}>
                ${cat.amount.toFixed(0)}{over ? ` / $${cat.budget}` : ''}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barProgress, {
                width: `${pct}%`,
                backgroundColor: over ? '#EF4444' : cat.color,
              }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────────

function InsightCard({ insight, onRead }) {
  const cfg = INSIGHT_CONFIG[insight.type] ?? {
    accent: '#0a9165', chipBg: 'rgba(10,145,101,0.10)', icon: 'information-circle-outline',
  };
  return (
    <TouchableOpacity
      style={styles.insightCard}
      onPress={() => !insight.isRead && onRead(insight.id)}
      activeOpacity={0.8}
    >
      {/* Left accent stripe */}
      <View style={[styles.insightStripe, { backgroundColor: cfg.accent }]} />

      {/* Unread dot — accent-colored */}
      {!insight.isRead && (
        <View style={[styles.unreadDot, { backgroundColor: cfg.accent }]} />
      )}

      <View style={styles.insightRow}>
        {/* Icon chip */}
        <View style={[styles.insightChip, { backgroundColor: cfg.chipBg }]}>
          <Ionicons name={cfg.icon} size={16} color={cfg.accent} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightBody}>{insight.body}</Text>
          {insight.receipt && (
            <View style={styles.insightReceipt}>
              <View style={styles.receiptDot} />
              <Text style={styles.receiptText}>{insight.receipt}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
      // Load existing insights first; only trigger the AI refresh engine if none exist
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
      const r     = await api.get('/transactions', { params: { limit: 4 } });
      const data  = r.data ?? {};
      const items = Array.isArray(data) ? data : (data.transactions ?? []);
      if (items.length > 0) setTransactions(items);
    } catch { /* keep mock transactions */ }
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
        <Skeleton height={210} borderRadius={24} style={{ marginHorizontal: 16, marginBottom: 16 }} />
        <View style={styles.contentArea}>
          <Skeleton height={130} borderRadius={20} style={{ marginHorizontal: 16, marginBottom: 12 }} />
          <Skeleton height={220} borderRadius={20} style={{ marginHorizontal: 16, marginBottom: 12 }} />
        </View>
      </ScrollView>
    );
  }

  const spending = snapshot?.spendingByCategory?.length > 0
    ? snapshot.spendingByCategory.map((s) => ({
        category: s.category.charAt(0).toUpperCase() + s.category.slice(1),
        amount:   s.total,
        color:    CATEGORY_COLORS[s.category] ?? '#95a5a6',
        budget:   CATEGORY_BUDGETS[s.category] ?? Math.ceil(s.total * 1.25),
      }))
    : MOCK_SPENDING_BREAKDOWN;

  const insightsSection = insights.length > 0 ? (
    <View style={styles.insightsSection}>
      <Text style={styles.sectionHeading}>AI Insights</Text>
      {insights.map((ins) => (
        <InsightCard key={ins.id} insight={ins} onRead={markRead} />
      ))}
    </View>
  ) : null;

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
      {/* ── Dark hero: greeting ── */}
      <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
        <Text style={styles.greeting}>
          Hey{profile?.displayName ? ` ${profile.displayName.split(' ')[0]}` : ''} 👋
        </Text>
        <Text style={styles.headerSub}>Here's your financial overview</Text>
      </View>

      {/* ── Net Worth Card floats on dark gradient ── */}
      {snapshot && <NetWorthCard data={snapshot} />}

      {/* ── White rounded content area ── */}
      <View style={styles.contentArea}>
        {IS_WEB ? (
          <>
            <View style={styles.webRow}>
              <View style={styles.webCol}><SpendingChart data={MOCK_MONTHLY_SPENDING} /></View>
              <View style={styles.webCol}><BudgetTracker data={spending} /></View>
            </View>
            <RecentTransactions
              transactions={transactions}
              onSeeAll={() => navigation.navigate('Transactions')}
            />
            {insightsSection}
          </>
        ) : (
          <>
            <SpendingChart data={MOCK_MONTHLY_SPENDING} />
            <RecentTransactions
              transactions={transactions}
              onSeeAll={() => navigation.navigate('Transactions')}
            />
            <BudgetTracker data={spending} />
            {insightsSection}
          </>
        )}
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SHADOW = {
  shadowColor:   '#0F172A',
  shadowOpacity: 0.08,
  shadowRadius:  14,
  shadowOffset:  { width: 0, height: 4 },
  elevation:     3,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  // Dark hero section
  hero: {
    paddingHorizontal: 20,
    paddingTop:        20,
    paddingBottom:     24,
  },
  greeting:  { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4, letterSpacing: -0.6 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Net Worth Card — warm off-white card on dark gradient
  networthCard: {
    backgroundColor:  '#FBF9F4',
    marginHorizontal: 16,
    marginBottom:     16,
    borderRadius:     24,
    padding:          24,
    ...SHADOW,
  },
  networthLabel:     { fontSize: 13, color: '#9aa3b2', fontWeight: '600', marginBottom: 4 },
  networthAmount:    { fontSize: 38, fontWeight: '700', color: '#0F172A', marginBottom: 14, letterSpacing: -1.4 },
  networthAmountWeb: { fontSize: 32 },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, marginBottom: 20,
  },
  trendText:          { fontSize: 12, fontWeight: '600' },
  accountsRow:        { flexDirection: 'row', gap: 10 },
  accountChip: {
    flex: 1, backgroundColor: '#F7F4EC', borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  accountDot:         { width: 10, height: 10, borderRadius: 5 },
  accountChipName:    { fontSize: 11, color: '#9aa3b2', fontWeight: '600' },
  accountChipBalance: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 },

  // White rounded content area
  contentArea: {
    backgroundColor:       '#F4F2EC',
    borderTopLeftRadius:   28,
    borderTopRightRadius:  28,
    paddingTop:            8,
    minHeight:             SCREEN_H * 0.65,
  },

  // Web 2-column grid
  webRow: { flexDirection: 'row' },
  webCol: { flex: 1 },

  // Shared card
  card: {
    backgroundColor:  '#FBF9F4',
    marginHorizontal: 16,
    marginBottom:     12,
    borderRadius:     20,
    padding:          20,
    marginTop:        12,
    ...SHADOW,
  },
  cardHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  // Chart
  chartAmount: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  barsContainer: { flexDirection: 'row', height: 96, alignItems: 'stretch', gap: 6 },
  barCol:        { flex: 1, flexDirection: 'column' },
  barShape:      { width: '80%' },
  barLabel:      { textAlign: 'center', fontSize: 11, color: '#bbb', fontWeight: '500', paddingTop: 6 },
  barLabelActive:{ color: '#0a9165', fontWeight: '700' },

  // Transactions
  seeAll: { fontSize: 13, fontWeight: '700', color: '#0a9165' },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#ECE8DC',
  },
  txIconWrap: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  txDesc:     { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  txDate:     { fontSize: 12, color: '#b0b8c8', marginTop: 2 },
  txAmount:   { fontSize: 14, fontWeight: '700' },

  // Budget
  budgetSub: { fontSize: 13, fontWeight: '700', color: '#9aa3b2' },
  overBudgetBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef0ee', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 12,
  },
  overBudgetText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  catRow:      { marginBottom: 11 },
  catLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 },
  catDot:      { width: 8, height: 8, borderRadius: 4 },
  catName:     { flex: 1, fontSize: 13, color: '#555', fontWeight: '500' },
  catAmt:      { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  barTrack:    { height: 7, backgroundColor: '#ECE9DF', borderRadius: 4, overflow: 'hidden' },
  barProgress: { height: 7, borderRadius: 4 },

  // Insights
  insightsSection: { paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  sectionHeading:  { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  insightCard: {
    backgroundColor: '#FBF9F4',
    borderRadius: 18,
    paddingTop: 16, paddingBottom: 16,
    paddingLeft: 20, paddingRight: 18,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOW,
  },
  insightStripe: {
    position: 'absolute', left: 0, top: 14, bottom: 14,
    width: 3, borderRadius: 2,
  },
  insightRow:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  insightChip: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  unreadDot: {
    position: 'absolute', top: 16, right: 16,
    width: 7, height: 7, borderRadius: 4,
  },
  insightTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4, letterSpacing: -0.3 },
  insightBody:  { fontSize: 13, color: '#555555', lineHeight: 19 },
  insightReceipt: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(124,58,237,0.2)',
  },
  receiptDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7C3AED' },
  receiptText: { fontStyle: 'italic', fontSize: 11, fontWeight: '500', color: '#7C3AED' },
});
