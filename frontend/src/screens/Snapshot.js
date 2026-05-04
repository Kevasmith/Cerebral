import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Dimensions,
} from 'react-native';
import ChatSheet from '../components/ChatSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';
import {
  MOCK_DASHBOARD, MOCK_INSIGHTS, MOCK_TRANSACTIONS,
} from '../data/mockData';

const IS_WEB = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

const C = {
  bg:          '#080E14',
  card:        '#0D1520',
  cardDeep:    '#0A1018',
  teal:        '#10C896',
  tealDim:     'rgba(16,200,150,0.12)',
  tealBorder:  'rgba(16,200,150,0.22)',
  amber:       '#F59E0B',
  amberDim:    'rgba(245,158,11,0.12)',
  amberBorder: 'rgba(245,158,11,0.25)',
  red:         '#EF4444',
  white:       '#FFFFFF',
  muted:       'rgba(255,255,255,0.55)',
  faint:       'rgba(255,255,255,0.28)',
  border:      'rgba(255,255,255,0.07)',
};

// ─── Sparkline chart ──────────────────────────────────────────────────────────
function Sparkline({ points = [], color = C.teal, height = 56 }) {
  const W = Math.min(SW - 80, 600);
  if (!IS_WEB) {
    return (
      <View style={{ height, justifyContent: 'flex-end', paddingHorizontal: 4 }}>
        <View style={{ height: 2, backgroundColor: color, borderRadius: 1, opacity: 0.8 }} />
      </View>
    );
  }
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const normalize = (v) => height - ((v - min) / (max - min + 0.001)) * height;
  const pts = points.map((v, i) => `${(i / (points.length - 1)) * W},${normalize(v)}`).join(' L ');
  const area = `M ${pts} L ${W},${height} L 0,${height} Z`;

  return (
    <View style={{ height }}>
      <svg width={W} height={height} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${pts}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={area} fill="url(#sg)" />
      </svg>
    </View>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────
const INSIGHT_CONFIG = {
  opt:    { label: 'Optimization Found', icon: 'wallet-outline',    color: C.teal,  dim: C.tealDim,  border: C.tealBorder },
  risk:   { label: 'Risk Alert',         icon: 'warning-outline',   color: C.amber, dim: C.amberDim, border: C.amberBorder },
  wealth: { label: 'Wealth Building',    icon: 'trending-up-outline', color: C.teal, dim: C.tealDim,  border: C.tealBorder },
};
const INSIGHT_TONE = {
  overspending: 'risk', idle_cash: 'wealth', income_trend: 'wealth',
  opportunity: 'opt', savings_tip: 'opt',
};

function InsightCard({ insight, onPress }) {
  const type = INSIGHT_TONE[insight.type] ?? 'opt';
  const cfg  = INSIGHT_CONFIG[type];
  return (
    <TouchableOpacity style={styles.insightCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.insightIcon, { backgroundColor: cfg.dim, borderColor: cfg.border }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.insightMeta}>
          <Text style={[styles.insightLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.insightAge}>{insight.age ?? '2h ago'}</Text>
        </View>
        <Text style={[styles.insightTitle, IS_WEB && { fontFamily: 'Geist' }]} numberOfLines={2}>
          {insight.title}
        </Text>
        <Text style={styles.insightBody} numberOfLines={2}>{insight.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.faint} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────
const TX_ICONS = {
  food: 'restaurant-outline', transport: 'car-outline',
  shopping: 'phone-portrait-outline', entertainment: 'film-outline',
  bills: 'home-outline', health: 'heart-outline',
  income: 'card-outline', other: 'receipt-outline',
};
const TX_COLORS = {
  food: '#e67e22', transport: '#3498db', shopping: '#9b59b6',
  entertainment: '#e74c3c', bills: '#2ecc71',
  health: '#1abc9c', income: C.teal, other: C.faint,
};

function TxRow({ tx }) {
  const cat   = (tx.category ?? 'other').toLowerCase();
  const icon  = TX_ICONS[cat]  ?? 'receipt-outline';
  const color = TX_COLORS[cat] ?? C.faint;
  const pos   = tx.amount > 0;
  const amt   = `${pos ? '+' : ''}$${Math.abs(tx.amount).toFixed(2)}`;

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txName} numberOfLines={1}>{tx.description}</Text>
        <Text style={styles.txMeta}>{tx.category} • {tx.dateLabel ?? 'Today'}</Text>
      </View>
      <Text style={[styles.txAmount, { color: pos ? C.teal : C.white }]}>{amt}</Text>
    </View>
  );
}

// ─── Net Worth Card ───────────────────────────────────────────────────────────
function NetWorthCard({ netWorth = 0, change = 2.4, sparkData }) {
  const fmt = (n) => {
    const [whole, dec] = Math.abs(n).toFixed(2).split('.');
    return { whole: '$' + parseInt(whole).toLocaleString(), dec };
  };
  const { whole, dec } = fmt(netWorth);

  return (
    <View style={styles.networthCard}>
      <View style={styles.networthTop}>
        <Text style={styles.networthLabel}>TOTAL NET WORTH</Text>
        <View style={styles.changePill}>
          <Ionicons name="trending-up" size={11} color={C.teal} />
          <Text style={styles.changeText}>+{change}%</Text>
        </View>
      </View>
      <View style={styles.networthAmtRow}>
        <Text style={[styles.networthAmt, IS_WEB && { fontFamily: 'Geist' }]}>{whole}</Text>
        <Text style={[styles.networthDec, IS_WEB && { fontFamily: 'Geist' }]}>.{dec}</Text>
      </View>
      <View style={{ marginTop: 16, marginHorizontal: -4 }}>
        <Sparkline points={sparkData ?? [100, 120, 115, 130, 128, 145, 160, 155, 175, 190]} />
      </View>
    </View>
  );
}

// ─── AI Agent Card ────────────────────────────────────────────────────────────
function AgentCard({ message }) {
  return (
    <View style={styles.agentCard}>
      <View style={styles.agentLabelRow}>
        <Ionicons name="sparkles" size={12} color={C.teal} />
        <Text style={[styles.agentLabel, IS_WEB && { fontFamily: 'Geist' }]}>AI AGENT ACTIVE</Text>
      </View>
      <Text style={[styles.agentTitle, IS_WEB && { fontFamily: 'Geist' }]}>Pulse Check</Text>
      <Text style={styles.agentBody}>
        {message ?? 'Your portfolio is outperforming the benchmark by '}
        {!message && <Text style={{ color: C.teal, fontWeight: '700' }}>1.2%</Text>}
        {!message && ' today. No urgent actions required.'}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Snapshot({ navigation }) {
  const insets   = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [chatOpen,    setChatOpen]    = useState(false);
  const [dashboard,   setDashboard]   = useState(null);
  const [insights,    setInsights]    = useState([]);
  const [transactions, setTx]         = useState([]);
  const [refreshing,  setRefreshing]  = useState(false);

  const load = useCallback(async () => {
    try {
      const [dRes, iRes, tRes] = await Promise.all([
        api.get('/users/dashboard'),
        api.get('/insights'),
        api.get('/transactions?limit=5'),
      ]);
      setDashboard(dRes.data);
      setInsights(iRes.data?.slice(0, 3) ?? []);
      setTx(tRes.data?.transactions?.slice(0, 5) ?? []);
    } catch {
      setDashboard(MOCK_DASHBOARD);
      setInsights(MOCK_INSIGHTS.slice(0, 3));
      setTx(MOCK_TRANSACTIONS.slice(0, 5));
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const netWorth = dashboard?.totalBalance ?? 1_248_392.42;

  const displayInsights = insights.length > 0 ? insights : MOCK_SNAPSHOT_INSIGHTS;
  const displayTx       = transactions.length > 0 ? transactions : MOCK_SNAPSHOT_TX;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => setChatOpen(true)} activeOpacity={0.75}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={14} color={C.white} />
          </View>
          <Text style={[styles.brand, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color={C.teal} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />
        }
      >
        {/* Net Worth */}
        <NetWorthCard netWorth={netWorth} />

        {/* AI Agent */}
        <AgentCard />

        {/* Manage Assets */}
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => navigation?.navigate?.('ConnectBank')}
          activeOpacity={0.85}
        >
          <Ionicons name="business-outline" size={18} color={C.bg} />
          <Text style={[styles.manageBtnText, IS_WEB && { fontFamily: 'Geist' }]}>Manage Assets</Text>
        </TouchableOpacity>

        {/* Insights section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral Insights</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.sectionLink}>View Intelligence Hub</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.insightsList}>
          {displayInsights.map((ins, i) => (
            <InsightCard
              key={ins.id ?? i}
              insight={ins}
              onPress={() => navigation?.navigate?.('InsightDetail', { insight: ins })}
            />
          ))}
        </View>

        {/* Recent Activity */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>Recent Activity</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.sectionLink}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.txList}>
          {displayTx.map((tx, i) => (
            <TxRow key={tx.id ?? i} tx={tx} />
          ))}
        </View>
      </ScrollView>
      <ChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} screenKey="snapshot" />
    </View>
  );
}

// ─── Mock fallback data ───────────────────────────────────────────────────────
const MOCK_SNAPSHOT_INSIGHTS = [
  {
    id: '1', type: 'opportunity', age: '2h ago',
    title: 'You saved $40 on subscriptions this month',
    description: 'AI detected 2 unused services and successfully initiated the cancellation flow.',
  },
  {
    id: '2', type: 'overspending', age: '6h ago',
    title: 'Potential double charge detected',
    description: "Duplicate $82.50 charge at 'Lumina Bistro' flagged. Tap to dispute.",
  },
  {
    id: '3', type: 'idle_cash', age: 'Yesterday',
    title: 'Auto-invest opportunity: $1,200 Surplus',
    description: 'Analysis shows excess cash in your primary account. Recommended: Move to Index Fund.',
  },
];

const MOCK_SNAPSHOT_TX = [
  { id: '1', description: 'Apple Store',           category: 'shopping',      amount: -1299.00, dateLabel: 'Today' },
  { id: '2', description: 'Lumina Bistro',          category: 'food',          amount: -82.50,   dateLabel: 'Today' },
  { id: '3', description: 'Payroll Deposit',        category: 'income',        amount: 8400.00,  dateLabel: 'Aug 24' },
  { id: '4', description: 'Tesla Supercharge',      category: 'transport',     amount: -18.42,   dateLabel: 'Aug 23' },
  { id: '5', description: 'Westside Property Mgmt', category: 'bills',         amount: -3500.00, dateLabel: 'Aug 22' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },

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
  brand:   { fontSize: 17, fontWeight: '700', color: C.white },
  bellBtn: { padding: 4 },

  // Net Worth Card
  networthCard: {
    backgroundColor: C.card,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
    marginTop: 16, marginBottom: 12,
    overflow: 'hidden',
  },
  networthTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  networthLabel: { fontSize: 11, fontWeight: '700', color: C.faint, letterSpacing: 1.2 },
  changePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.tealDim, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.tealBorder,
  },
  changeText:    { fontSize: 12, fontWeight: '700', color: C.teal },
  networthAmtRow:{ flexDirection: 'row', alignItems: 'flex-end' },
  networthAmt:   { fontSize: 40, fontWeight: '900', color: C.white, letterSpacing: -1 },
  networthDec:   { fontSize: 22, fontWeight: '700', color: C.muted, marginBottom: 4, marginLeft: 1 },

  // AI Agent Card
  agentCard: {
    backgroundColor: C.card,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.tealBorder,
    marginBottom: 12,
  },
  agentLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  agentLabel:    { fontSize: 11, fontWeight: '800', color: C.teal, letterSpacing: 1.2 },
  agentTitle:    { fontSize: 16, fontWeight: '800', color: C.white, marginBottom: 6 },
  agentBody:     { fontSize: 14, color: C.muted, lineHeight: 21 },

  // Manage Assets button
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.teal,
    borderRadius: 16, paddingVertical: 16,
    marginBottom: 28,
  },
  manageBtnText: { fontSize: 15, fontWeight: '800', color: C.bg },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.white },
  sectionLink:  { fontSize: 13, fontWeight: '600', color: C.teal },

  // Insights
  insightsList: { gap: 10 },
  insightCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  insightIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1,
  },
  insightMeta:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  insightLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  insightAge:   { fontSize: 11, color: C.faint },
  insightTitle: { fontSize: 14, fontWeight: '700', color: C.white, marginBottom: 3 },
  insightBody:  { fontSize: 12, color: C.muted, lineHeight: 17 },

  // Transactions
  txList: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  txIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  txName:   { fontSize: 14, fontWeight: '600', color: C.white, marginBottom: 2 },
  txMeta:   { fontSize: 12, color: C.faint, textTransform: 'capitalize' },
  txAmount: { fontSize: 14, fontWeight: '700', minWidth: 80, textAlign: 'right' },
});
