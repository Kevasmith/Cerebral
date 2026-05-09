import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Dimensions,
} from 'react-native';
import ChatSheet from '../components/ChatSheet';
import CerebralAvatar from '../components/CerebralAvatar';
import TrendLine from '../components/TrendLine';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';

const IS_WEB = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
// Thin wrapper around TrendLine so existing call sites stay unchanged.
function Sparkline({ points = [], color = C.teal, height = 56, width }) {
  const W = width ?? Math.min(SW - 80, 600);
  return (
    <TrendLine
      points={points}
      color={color}
      width={W}
      height={height}
      fill
      showDots={false}
    />
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

// ─── Net Worth Card ───────────────────────────────────────────────────────────
function NetWorthCard({ netWorth = 0, change, sparkData }) {
  const fmt = (n) => {
    const [whole, dec] = Math.abs(n).toFixed(2).split('.');
    return { whole: '$' + parseInt(whole).toLocaleString(), dec };
  };
  const { whole, dec } = fmt(netWorth);
  const showChange = typeof change === 'number';
  const showSpark  = Array.isArray(sparkData) && sparkData.length > 1;

  return (
    <View style={styles.networthCard}>
      <View style={styles.networthTop}>
        <Text style={styles.networthLabel}>TOTAL NET WORTH</Text>
        {showChange && (
          <View style={styles.changePill}>
            <Ionicons
              name={change >= 0 ? 'trending-up' : 'trending-down'}
              size={11}
              color={C.teal}
            />
            <Text style={styles.changeText}>
              {change >= 0 ? '+' : '−'}{Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <View style={styles.networthAmtRow}>
        <Text style={[styles.networthAmt, IS_WEB && { fontFamily: 'Geist' }]}>{whole}</Text>
        <Text style={[styles.networthDec, IS_WEB && { fontFamily: 'Geist' }]}>.{dec}</Text>
      </View>
      {showSpark && (
        <View style={{ marginTop: 16, marginHorizontal: -4 }}>
          <Sparkline points={sparkData} />
        </View>
      )}
    </View>
  );
}

const METRIC_CARD_W = 150;
const METRIC_CARD_PAD = 14;
const METRIC_SPARKLINE_W = METRIC_CARD_W - METRIC_CARD_PAD * 2;

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, amount, change, positive, points, accent = C.teal }) {
  const hasSpark = Array.isArray(points) && points.length > 1;
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricAmount, IS_WEB && { fontFamily: 'Geist' }]}>{amount}</Text>
      {change ? (
        <View style={[styles.metricPill, {
          backgroundColor: hexAlpha(accent, 0.10),
          borderColor: hexAlpha(accent, 0.27),
        }]}>
          <Ionicons
            name={positive ? 'trending-up' : 'trending-down'}
            size={10}
            color={accent}
          />
          <Text style={[styles.metricPillText, { color: accent }]}>{change}</Text>
        </View>
      ) : null}
      {hasSpark && (
        <View style={{ marginTop: 10 }}>
          <Sparkline points={points} color={accent} height={40} width={METRIC_SPARKLINE_W} />
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Snapshot({ navigation }) {
  const insets   = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [chatOpen,   setChatOpen]   = useState(false);
  const [dashboard,  setDashboard]  = useState(null);
  const [insights,   setInsights]   = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dRes, iRes] = await Promise.all([
        api.get('/accounts/dashboard'),
        api.get('/insights'),
      ]);
      setDashboard(dRes.data);
      setInsights(iRes.data?.slice(0, 3) ?? []);
    } catch {
      setDashboard(null);
      setInsights([]);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const netWorth = dashboard?.totalCashAvailable ?? 0;

  // Derive metric cards from accounts (savings + investment + spending trend)
  const savingsTotal = (dashboard?.accounts ?? [])
    .filter((a) => a.accountType === 'savings')
    .reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const investmentTotal = (dashboard?.accounts ?? [])
    .filter((a) => a.accountType === 'investment')
    .reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const spendingThisMonth = dashboard?.spendingTrend?.currentMonth ?? 0;
  const trendPct = dashboard?.spendingTrend?.percentageChange;
  const trendDir = dashboard?.spendingTrend?.direction;
  const showSpendingChange = typeof trendPct === 'number' && trendDir;

  const fmtAmt = (n) => '$' + Number(n).toLocaleString('en-CA', { maximumFractionDigits: 0 });

  const displayInsights = insights;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => setChatOpen(true)} activeOpacity={0.75}>
          <CerebralAvatar />
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

        {/* Metric Cards Row */}
        {(savingsTotal > 0 || investmentTotal > 0 || spendingThisMonth > 0) && (
          <View style={styles.metricRowWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
              style={{ marginBottom: 16 }}
            >
              {savingsTotal > 0 && (
                <MetricCard
                  label="Savings"
                  amount={fmtAmt(savingsTotal)}
                  accent={C.teal}
                />
              )}
              {investmentTotal > 0 && (
                <MetricCard
                  label="Investments"
                  amount={fmtAmt(investmentTotal)}
                  accent="#7C3AED"
                />
              )}
              {spendingThisMonth > 0 && (
                <MetricCard
                  label="Spending"
                  amount={fmtAmt(spendingThisMonth)}
                  change={showSpendingChange ? `${trendDir === 'up' ? '+' : '−'}${Math.abs(trendPct).toFixed(1)}%` : null}
                  positive={trendDir === 'down'}
                  accent={C.amber}
                />
              )}
            </ScrollView>
          </View>
        )}

        {/* Manage Assets */}
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => navigation?.navigate?.('ConnectBank')}
          activeOpacity={0.85}
        >
          <Ionicons name="business-outline" size={18} color={C.bg} />
          <Text style={[styles.manageBtnText, IS_WEB && { fontFamily: 'Geist' }]}>Manage Assets</Text>
        </TouchableOpacity>

        {/* Cerebral AI + Insights — combined */}
        <View style={styles.aiSection}>
          {/* Pulse Check header */}
          <View style={styles.pulseHeader}>
            <View style={styles.pulseLabelRow}>
              <Ionicons name="sparkles" size={12} color={C.teal} />
              <Text style={[styles.pulseLabel, IS_WEB && { fontFamily: 'Geist' }]}>CEREBRAL AI · PULSE CHECK</Text>
            </View>
            <Text style={[styles.pulseTitle, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral Insights</Text>
            <Text style={styles.pulseBody}>
              {displayInsights.length > 0
                ? `${displayInsights.length} new insight${displayInsights.length === 1 ? '' : 's'} ready for review.`
                : 'Connect a bank account to start receiving personalized insights.'}
            </Text>
          </View>

          {/* Insight cards */}
          <View style={styles.insightsList}>
            {displayInsights.map((ins, i) => (
              <InsightCard
                key={ins.id ?? i}
                insight={ins}
                onPress={() => navigation?.navigate?.('InsightDetail', { insight: ins })}
              />
            ))}
          </View>

          {/* View Intelligence Hub CTA */}
          <TouchableOpacity
            style={styles.hubBtn}
            onPress={() => navigation?.navigate?.('IntelligenceHub', { insights: displayInsights })}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={16} color={C.bg} />
            <Text style={[styles.hubBtnText, IS_WEB && { fontFamily: 'Geist' }]}>View Intelligence Hub</Text>
            <Ionicons name="arrow-forward" size={16} color={C.bg} />
          </TouchableOpacity>
        </View>

      </ScrollView>
      <ChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} screenKey="snapshot" />
    </View>
  );
}

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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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

  // Metric Cards
  metricRowWrapper: { marginHorizontal: -16, marginBottom: 0 },
  metricCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    width: 150,
  },
  metricLabel: {
    fontSize: 10, fontWeight: '700', color: C.faint,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
  },
  metricAmount: {
    fontSize: 20, fontWeight: '800', color: C.white, letterSpacing: -0.5,
  },
  metricPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  metricPillText: { fontSize: 11, fontWeight: '700' },

  // Manage Assets button
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.teal,
    borderRadius: 16, paddingVertical: 16,
    marginBottom: 20,
  },
  manageBtnText: { fontSize: 15, fontWeight: '800', color: C.bg },

  // AI + Insights combined section
  aiSection: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.tealBorder,
    overflow: 'hidden',
    marginBottom: 20,
  },
  pulseHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pulseLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  pulseLabel: { fontSize: 11, fontWeight: '800', color: C.teal, letterSpacing: 1.2 },
  pulseTitle: { fontSize: 18, fontWeight: '800', color: C.white, marginBottom: 6 },
  pulseBody: { fontSize: 13, color: C.muted, lineHeight: 19 },
  insightsList: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  hubBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.teal,
    margin: 14, marginTop: 6,
    borderRadius: 14, paddingVertical: 14,
  },
  hubBtnText: { fontSize: 15, fontWeight: '800', color: C.bg },

  // Insights
  insightCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.bg,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
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
});
