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
import { C, SHADOW } from '../constants/theme';

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
function NetWorthCard({ netWorth = 0, change, sparkData }) {
  const fmt = (n) => {
    const [whole, dec] = Math.abs(n).toFixed(2).split('.');
    return { whole: '$' + parseInt(whole).toLocaleString(), dec };
  };
  const { whole, dec } = fmt(netWorth);
  const showChange = typeof change === 'number';
  const showSpark  = Array.isArray(sparkData) && sparkData.length > 1;
  const positive   = (change ?? 0) >= 0;

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
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Snapshot({ navigation }) {
  const insets = useSafeAreaInsets();

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

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => setChatOpen(true)} activeOpacity={0.75}>
          <CerebralAvatar />
          <Text style={[styles.brand, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color={C.text} />
        </TouchableOpacity>
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
        <NetWorthCard netWorth={netWorth} change={changeValue} />

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
    backgroundColor: C.bg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand:   { fontSize: 17, fontWeight: '800', color: C.text },
  bellBtn: { padding: 4 },

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
});
