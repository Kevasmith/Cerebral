import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ChatSheet from '../components/ChatSheet';
import CerebralAvatar from '../components/CerebralAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { categoryMeta } from '../constants/categories';
import { C, SHADOW, SHADOW_SOFT } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

// Spending segments + total are derived from /accounts/dashboard at runtime.

// ─── Donut chart ──────────────────────────────────────────────────────────────
// Uses react-native-svg so iOS / Android / web all render the same arcs.
function DonutChart({ segments, total }) {
  const size = Math.min(SW - 80, 240);
  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.38;
  const strokeW = size * 0.13;
  const gap = segments.length > 1 ? 0.02 : 0; // radians between segments
  const totalLabel = `$${Number(total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  let cursor = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const sweep = Math.max(0.001, seg.pct * Math.PI * 2 - gap);
    const startAngle = cursor + gap / 2;
    const endAngle   = startAngle + sweep;
    cursor += seg.pct * Math.PI * 2;

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const large = sweep > Math.PI ? 1 : 0;

    return {
      key: seg.key,
      color: seg.color,
      d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
    };
  });

  return (
    <View style={[styles.donutWrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {arcs.map((arc) => (
          <Path
            key={arc.key}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        ))}
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={[styles.donutLabel, IS_WEB && { fontFamily: 'Geist' }]}>Total Spend</Text>
        <Text style={[styles.donutAmount, IS_WEB && { fontFamily: 'Geist' }]}>{totalLabel}</Text>
      </View>
    </View>
  );
}

// ─── Breakdown row — full-width category with share bar ──────────────────────
function BreakdownRow({ segment }) {
  const pct = Math.round(segment.pct * 100);
  return (
    <View style={styles.breakdownRow}>
      <View style={[styles.breakdownIcon, { backgroundColor: segment.colorDim }]}>
        <Ionicons name={segment.icon} size={16} color={segment.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.breakdownTop}>
          <Text style={styles.breakdownLabel} numberOfLines={1}>{segment.label}</Text>
          <Text style={[styles.breakdownAmount, IS_WEB && { fontFamily: 'Geist' }]}>
            ${segment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.breakdownBarRow}>
          <View style={styles.breakdownTrack}>
            <View style={[styles.breakdownFill, { width: `${pct}%`, backgroundColor: segment.color }]} />
          </View>
          <Text style={styles.breakdownPct}>{pct}%</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────
function CategoryBadge({ category }) {
  const meta = categoryMeta(category);
  return (
    <View style={[styles.catBadge, { backgroundColor: meta.colorDim }]}>
      <Text style={[styles.catBadgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────
function TxRow({ tx }) {
  // Live API: { amount: positive, isDebit: bool }; legacy mock: { amount: signed }
  const neg = tx.isDebit ?? tx.amount < 0;
  const amt = Math.abs(Number(tx.amount));
  const name = tx.name ?? tx.description ?? tx.merchantName ?? 'Transaction';
  const meta = categoryMeta(tx.category);
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: meta.colorDim }]}>
        <Ionicons name={meta.icon} size={16} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txName} numberOfLines={1}>{name}</Text>
        <CategoryBadge category={tx.category} />
      </View>
      <Text style={[styles.txAmount, { color: neg ? C.red : C.green }]}>
        {neg ? '-' : '+'}${amt.toFixed(2)}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Spending({ navigation }) {
  const insets = useSafeAreaInsets();
  const [chatOpen, setChatOpen] = useState(false);
  const [txns, setTxns] = useState([]);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    api.get('/accounts/dashboard')
      .then(r => setSnapshot(r.data ?? null))
      .catch(() => setSnapshot(null));
    api.get('/transactions', { params: { limit: 3 } })
      .then(r => {
        const data = r.data ?? {};
        const items = Array.isArray(data) ? data : (data.transactions ?? []);
        setTxns(items);
      })
      .catch(() => setTxns([]));
  }, []);

  // Build donut segments from snapshot.spendingByCategory
  const byCat = snapshot?.spendingByCategory ?? [];
  const total = byCat.reduce((s, c) => s + Number(c.total ?? 0), 0);
  const segments = total > 0
    ? byCat
        .map((c) => {
          const meta = categoryMeta(c.category);
          return {
            key: c.category,
            label: meta.label,
            amount: Number(c.total ?? 0),
            pct: Number(c.total ?? 0) / total,
            color: meta.color,
            colorDim: meta.colorDim,
            icon: meta.icon,
          };
        })
        .sort((a, b) => b.amount - a.amount)
    : [];

  const trend = snapshot?.spendingTrend;
  const showTrend =
    trend &&
    typeof trend.percentageChange === 'number' &&
    typeof trend.previousMonth === 'number' &&
    typeof trend.currentMonth === 'number';
  const trendDelta = showTrend ? trend.currentMonth - trend.previousMonth : 0;
  const trendUp    = showTrend && trend.direction === 'up';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => setChatOpen(true)} activeOpacity={0.75}>
          <CerebralAvatar />
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
      >
        {/* Page title */}
        <Text style={[styles.pageTitle, IS_WEB && { fontFamily: 'Geist' }]}>Spending Analysis</Text>
        <Text style={styles.pageSub}>Real-time overview of your capital allocation</Text>

        {/* Date range chip — current month */}
        <View style={styles.dateChip}>
          <Ionicons name="calendar-outline" size={13} color={C.teal} />
          <Text style={styles.dateChipText}>
            {new Date().toLocaleString('en-CA', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Donut card — chart only; the per-category breakdown lives below. */}
        {segments.length > 0 ? (
          <View style={styles.chartCard}>
            <View style={styles.donutRow}>
              <DonutChart segments={segments} total={total} />
            </View>
          </View>
        ) : null}

        {/* Spending Breakdown — every category with share bar + amount */}
        {segments.length > 0 && (
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownHeader}>
              <Text style={[styles.breakdownTitle, IS_WEB && { fontFamily: 'Geist' }]}>Spending Breakdown</Text>
              {showTrend && (
                <View style={[styles.deltaPill, { backgroundColor: trendUp ? C.redDim : C.greenDim }]}>
                  <Ionicons
                    name={trendUp ? 'trending-up' : 'trending-down'}
                    size={11}
                    color={trendUp ? C.red : C.green}
                  />
                  <Text style={[styles.deltaPillText, { color: trendUp ? C.red : C.green }]}>
                    {trendUp ? '+' : '−'}{Math.abs(trend.percentageChange).toFixed(1)}% vs last month
                  </Text>
                </View>
              )}
            </View>

            {showTrend && (
              <Text style={styles.breakdownSub}>
                {trendUp ? "You're spending " : "You're saving "}
                <Text style={{ color: C.text, fontWeight: '700' }}>
                  ${Math.abs(trendDelta).toFixed(0)}
                </Text>
                {trendUp ? ' more than last month.' : ' compared with last month.'}
              </Text>
            )}

            <View style={styles.breakdownList}>
              {segments.map((s) => <BreakdownRow key={s.key} segment={s} />)}
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.activityHeader}>
          <Text style={[styles.activityTitle, IS_WEB && { fontFamily: 'Geist' }]}>Recent Activity</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        {txns.length > 0 ? (
          <View style={styles.txList}>
            {txns.map((tx, i) => <TxRow key={tx.id ?? i} tx={tx} />)}
          </View>
        ) : (
          <View style={styles.emptyTxBox}>
            <Text style={styles.emptyTxText}>No transactions yet</Text>
          </View>
        )}
      </ScrollView>
      <ChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} screenKey="spending" />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBrand: { fontSize: 17, fontWeight: '800', color: C.text },
  bellBtn:     { padding: 4 },

  // Page title
  pageTitle: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginTop: 24, marginBottom: 6 },
  pageSub:   { fontSize: 14, color: C.soft, lineHeight: 20, marginBottom: 20 },

  // Date chip — dark pill on cream
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: C.surfaceDeep, marginBottom: 22,
  },
  dateChipText: { fontSize: 13, fontWeight: '700', color: C.textInvert },

  // Chart card
  chartCard: {
    backgroundColor: C.card,
    borderRadius: 22, padding: 22,
    marginBottom: 16,
    ...SHADOW,
  },
  donutRow:  { alignItems: 'center' },
  donutWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
  },
  donutLabel:  { fontSize: 11, color: C.faint, fontWeight: '700', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  donutAmount: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },

  // Spending Breakdown
  breakdownCard: {
    backgroundColor: C.card,
    borderRadius: 22, padding: 20,
    marginBottom: 18,
    ...SHADOW,
  },
  breakdownHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, marginBottom: 6,
  },
  breakdownTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  breakdownSub:   { fontSize: 13, color: C.soft, lineHeight: 19, marginBottom: 16 },
  deltaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  deltaPillText: { fontSize: 11, fontWeight: '800' },

  breakdownList: { gap: 14 },
  breakdownRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakdownIcon: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  breakdownTop:  { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  breakdownLabel:{ fontSize: 14, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  breakdownAmount:{ fontSize: 14, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  breakdownBarRow:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.track, overflow: 'hidden' },
  breakdownFill:  { height: 5, borderRadius: 3 },
  breakdownPct:   { fontSize: 11, fontWeight: '700', color: C.faint, width: 32, textAlign: 'right' },

  // Empty state
  emptyTxBox: {
    backgroundColor: C.card, borderRadius: 18, padding: 22,
    alignItems: 'center', marginBottom: 24,
    ...SHADOW_SOFT,
  },
  emptyTxText: { fontSize: 13, color: C.muted },

  // Recent activity
  activityHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  activityTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  viewAll:       { fontSize: 12, fontWeight: '700', color: C.green },

  txList: { gap: 10 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.card,
    borderRadius: 16, padding: 14,
    ...SHADOW_SOFT,
  },
  txIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  txName:   { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 4 },
  txAmount: { fontSize: 14, fontWeight: '700', marginLeft: 'auto' },

  // Category badge
  catBadge:      { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText:  { fontSize: 11, fontWeight: '700' },
});
