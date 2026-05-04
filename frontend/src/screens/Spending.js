import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

const IS_WEB = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

const C = {
  bg:         '#080E14',
  card:       '#0D1520',
  cardDeep:   '#0A1018',
  teal:       '#10C896',
  tealDim:    'rgba(16,200,150,0.12)',
  tealBorder: 'rgba(16,200,150,0.25)',
  purple:     '#8B5CF6',
  purpleDim:  'rgba(139,92,246,0.15)',
  green:      '#22C55E',
  amber:      '#F59E0B',
  white:      '#FFFFFF',
  muted:      'rgba(255,255,255,0.55)',
  faint:      'rgba(255,255,255,0.28)',
  border:     'rgba(255,255,255,0.07)',
  input:      'rgba(255,255,255,0.05)',
};

const SEGMENTS = [
  { key: 'housing',       label: 'Housing',        amount: 4980.00,  pct: 0.40, color: C.purple },
  { key: 'food',          label: 'Food & Dining',   amount: 3112.50,  pct: 0.25, color: C.green  },
  { key: 'entertainment', label: 'Entertainment',   amount: 2490.00,  pct: 0.20, color: C.teal   },
  { key: 'misc',          label: 'Miscellaneous',   amount: 1867.50,  pct: 0.15, color: '#64748B' },
];

const TOTAL = 12450.00;

const MOCK_TXN = [
  { id: 1, name: "L'Artisan Bistro",       amount: -62.40,  category: 'Food',          icon: 'restaurant-outline'   },
  { id: 2, name: 'Apple Store Retail',     amount: -299.00, category: 'Entertainment', icon: 'phone-portrait-outline' },
  { id: 3, name: 'Metropolitan Housing',   amount: -1245.00, category: 'Housing',      icon: 'home-outline'         },
];

// ─── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, total }) {
  const size = Math.min(SW - 80, 220);
  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.38;
  const strokeW = size * 0.12;
  const gap = 0.02; // radians between segments

  if (IS_WEB) {
    let cursor = -Math.PI / 2;
    const arcs = segments.map((seg) => {
      const sweep = seg.pct * Math.PI * 2 - gap;
      const startAngle = cursor + gap / 2;
      const endAngle   = startAngle + sweep;
      cursor += seg.pct * Math.PI * 2;

      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);
      const large = sweep > Math.PI ? 1 : 0;

      return {
        ...seg,
        d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
      };
    });

    return (
      <View style={[styles.donutWrap, { width: size, height: size }]}>
        <svg width={size} height={size} style={{ display: 'block' }}>
          {arcs.map((arc) => (
            <path
              key={arc.key}
              d={arc.d}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <View style={styles.donutCenter}>
          <Text style={[styles.donutLabel, IS_WEB && { fontFamily: 'Geist' }]}>Total Spend</Text>
          <Text style={[styles.donutAmount, IS_WEB && { fontFamily: 'Geist' }]}>
            ${TOTAL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    );
  }

  // Native fallback: simple ring placeholder
  return (
    <View style={[styles.donutWrap, { width: size, height: size }]}>
      <View style={[styles.donutRingNative, { width: size, height: size, borderRadius: size / 2, borderColor: C.teal }]} />
      <View style={styles.donutCenter}>
        <Text style={styles.donutLabel}>Total Spend</Text>
        <Text style={[styles.donutAmount, IS_WEB && { fontFamily: 'Geist' }]}>
          ${TOTAL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
      </View>
    </View>
  );
}

// ─── Legend row ───────────────────────────────────────────────────────────────
function LegendRow({ segment }) {
  const pctStr = `${Math.round(segment.pct * 100)}%`;
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
      <Text style={styles.legendLabel}>{segment.label}</Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.legendPct}>{pctStr}</Text>
      <Text style={styles.legendAmount}>
        ${segment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────
function CategoryBadge({ label }) {
  const map = {
    Food:          { bg: 'rgba(34,197,94,0.15)',   color: C.green  },
    Entertainment: { bg: C.tealDim,                color: C.teal   },
    Housing:       { bg: C.purpleDim,              color: C.purple },
  };
  const s = map[label] ?? { bg: 'rgba(100,116,139,0.15)', color: '#64748B' };
  return (
    <View style={[styles.catBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.catBadgeText, { color: s.color }]}>{label}</Text>
    </View>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────
function TxRow({ tx }) {
  const neg = tx.amount < 0;
  return (
    <View style={styles.txRow}>
      <View style={styles.txIcon}>
        <Ionicons name={tx.icon} size={16} color={C.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txName} numberOfLines={1}>{tx.name}</Text>
        <CategoryBadge label={tx.category} />
      </View>
      <Text style={[styles.txAmount, { color: neg ? '#EF4444' : C.teal }]}>
        {neg ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Spending({ navigation }) {
  const insets = useSafeAreaInsets();
  const [patternExpanded, setPatternExpanded] = useState(false);
  const [txns, setTxns] = useState(MOCK_TXN);

  useEffect(() => {
    api.get('/transactions?limit=3')
      .then(r => { if (r.data?.length) setTxns(r.data); })
      .catch(() => {});
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={14} color={C.white} />
          </View>
          <Text style={[styles.headerBrand, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral</Text>
        </View>
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

        {/* Date range chip */}
        <View style={styles.dateChip}>
          <Ionicons name="calendar-outline" size={13} color={C.teal} />
          <Text style={styles.dateChipText}>Aug 2023 – Sep 2023</Text>
          <Ionicons name="options-outline" size={13} color={C.faint} style={{ marginLeft: 4 }} />
        </View>

        {/* Donut + legend card */}
        <View style={styles.chartCard}>
          <View style={styles.donutRow}>
            <DonutChart segments={SEGMENTS} total={TOTAL} />
          </View>
          <View style={styles.legendList}>
            {SEGMENTS.map(s => <LegendRow key={s.key} segment={s} />)}
          </View>
        </View>

        {/* VS Last Month */}
        <View style={styles.vsCard}>
          <View style={styles.vsLeft}>
            <Text style={styles.vsEyebrow}>VS LAST MONTH</Text>
            <View style={styles.vsAmountRow}>
              <Text style={[styles.vsAmount, IS_WEB && { fontFamily: 'Geist' }]}>-$1,240</Text>
              <View style={styles.vsPill}>
                <Ionicons name="trending-up" size={11} color={C.teal} />
                <Text style={styles.vsPillText}>+9.1%</Text>
              </View>
            </View>
            <Text style={styles.vsDesc}>
              Spending decreased compared to last period. Housing remains your largest expense category.
            </Text>
          </View>
          <View style={styles.vsBar}>
            {[0.75, 1.0, 0.6, 0.85, 0.5, 0.7, 0.9].map((h, i) => (
              <View key={i} style={[styles.vsBarSegment, { height: 36 * h, opacity: i === 3 ? 1 : 0.35 }]} />
            ))}
          </View>
        </View>

        {/* Next Forecasted Payment */}
        <View style={styles.forecastCard}>
          <View style={styles.forecastLeft}>
            <View style={styles.forecastIcon}>
              <Ionicons name="cloud-outline" size={18} color={C.teal} />
            </View>
            <View>
              <Text style={styles.forecastLabel}>Next Forecasted Payment</Text>
              <Text style={[styles.forecastName, IS_WEB && { fontFamily: 'Geist' }]}>Cloud Services</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.forecastAmount, IS_WEB && { fontFamily: 'Geist' }]}>$899.00</Text>
            <View style={styles.forecastDuePill}>
              <View style={styles.dueDot} />
              <Text style={styles.forecastDue}>Due in 2 days</Text>
            </View>
          </View>
        </View>

        {/* Behavioral Insight */}
        <View style={styles.insightCard}>
          <View style={styles.insightEyebrow}>
            <Ionicons name="hardware-chip-outline" size={11} color={C.teal} />
            <Text style={styles.insightEyebrowText}>CEREBRAL INTELLIGENCE</Text>
          </View>
          <Text style={[styles.insightTitle, IS_WEB && { fontFamily: 'Geist' }]}>Behavioral Insight</Text>
          <Text style={styles.insightBody}>
            Your dining spend is{' '}
            <Text style={{ color: C.white, fontWeight: '700' }}>15% above</Text>
            {' '}your 3-month average. Friday and Saturday evenings account for 68% of restaurant charges.
          </Text>

          {/* Action card */}
          <View style={styles.actionCard}>
            <View style={styles.actionTop}>
              <View style={styles.actionDot} />
              <Text style={styles.actionLabel}>Action Recommended</Text>
            </View>
            <Text style={styles.actionDesc}>
              Setting a weekly dining budget of $120 could save you an estimated $85/month.
            </Text>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={16} color={C.bg} />
              <Text style={[styles.actionBtnText, IS_WEB && { fontFamily: 'Geist' }]}>
                Add to Monthly Budget Plan
              </Text>
            </TouchableOpacity>
          </View>

          {/* Expandable */}
          <TouchableOpacity
            style={styles.expandRow}
            onPress={() => setPatternExpanded(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandText}>See detailed behavioral patterns</Text>
            <Ionicons
              name={patternExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={C.teal}
            />
          </TouchableOpacity>

          {patternExpanded && (
            <View style={styles.expandContent}>
              {[
                { day: 'Mon – Thu', avg: '$18', note: 'Mostly lunch takeout' },
                { day: 'Fri – Sat', avg: '$74', note: 'Dinner + drinks, high variance' },
                { day: 'Sunday',    avg: '$12', note: 'Grocery runs, low spend' },
              ].map(r => (
                <View key={r.day} style={styles.patternRow}>
                  <Text style={styles.patternDay}>{r.day}</Text>
                  <Text style={styles.patternAvg}>{r.avg} avg</Text>
                  <Text style={styles.patternNote}>{r.note}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.activityHeader}>
          <Text style={[styles.activityTitle, IS_WEB && { fontFamily: 'Geist' }]}>Recent Activity</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.txList}>
          {txns.map((tx, i) => <TxRow key={tx.id ?? i} tx={tx} />)}
        </View>
      </ScrollView>
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
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerBrand: { fontSize: 17, fontWeight: '700', color: C.white },
  bellBtn:     { padding: 4 },

  // Page title
  pageTitle: { fontSize: 30, fontWeight: '900', color: C.white, letterSpacing: -0.5, marginTop: 24, marginBottom: 6 },
  pageSub:   { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 20 },

  // Date chip
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: C.tealBorder,
    borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14,
    backgroundColor: C.tealDim, marginBottom: 24,
  },
  dateChipText: { fontSize: 13, fontWeight: '600', color: C.teal },

  // Chart card
  chartCard: {
    backgroundColor: C.card,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 16,
  },
  donutRow: { alignItems: 'center', marginBottom: 20 },
  donutWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
  },
  donutLabel:  { fontSize: 11, color: C.muted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  donutAmount: { fontSize: 17, fontWeight: '800', color: C.white },
  donutRingNative: {
    position: 'absolute',
    borderWidth: 14, borderColor: C.teal,
    backgroundColor: 'transparent',
  },

  // Legend
  legendList: { gap: 10 },
  legendRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendLabel:{ fontSize: 14, color: C.muted, flex: 1 },
  legendPct:  { fontSize: 13, color: C.faint, marginRight: 10, width: 36, textAlign: 'right' },
  legendAmount: { fontSize: 14, fontWeight: '700', color: C.white, width: 90, textAlign: 'right' },

  // VS Last Month
  vsCard: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: C.card,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 14, gap: 16,
  },
  vsLeft:        { flex: 1 },
  vsEyebrow:     { fontSize: 10, fontWeight: '800', color: C.teal, letterSpacing: 1.2, marginBottom: 6 },
  vsAmountRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  vsAmount:      { fontSize: 26, fontWeight: '900', color: C.white },
  vsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.tealDim,
    borderWidth: 1, borderColor: C.tealBorder,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  vsPillText:    { fontSize: 11, fontWeight: '700', color: C.teal },
  vsDesc:        { fontSize: 12, color: C.muted, lineHeight: 17 },
  vsBar:         { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  vsBarSegment:  { width: 6, backgroundColor: C.teal, borderRadius: 3 },

  // Forecast card
  forecastCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 16,
  },
  forecastLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  forecastIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.tealDim,
    borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  forecastLabel:  { fontSize: 11, color: C.faint, marginBottom: 3 },
  forecastName:   { fontSize: 15, fontWeight: '700', color: C.white },
  forecastAmount: { fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 4 },
  forecastDuePill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end' },
  dueDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
  forecastDue:    { fontSize: 11, fontWeight: '700', color: C.teal },

  // Insight card
  insightCard: {
    backgroundColor: C.card,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 24,
  },
  insightEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  insightEyebrowText: { fontSize: 10, fontWeight: '800', color: C.teal, letterSpacing: 1.2 },
  insightTitle:   { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 10 },
  insightBody:    { fontSize: 14, color: C.muted, lineHeight: 21, marginBottom: 16 },

  // Action card
  actionCard: {
    backgroundColor: C.cardDeep,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 14,
  },
  actionTop:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  actionDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: C.teal },
  actionLabel:{ fontSize: 12, fontWeight: '700', color: C.teal },
  actionDesc: { fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: 14 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.teal,
    borderRadius: 12, paddingVertical: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '800', color: C.bg },

  // Expandable
  expandRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  expandText:   { fontSize: 13, color: C.teal, fontWeight: '600' },
  expandContent:{ marginTop: 14, gap: 10 },
  patternRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patternDay:   { fontSize: 12, color: C.muted, width: 90 },
  patternAvg:   { fontSize: 12, fontWeight: '700', color: C.white, width: 60 },
  patternNote:  { fontSize: 12, color: C.faint, flex: 1 },

  // Recent activity
  activityHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  activityTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  viewAll:       { fontSize: 12, fontWeight: '700', color: C.teal },

  txList: { gap: 10 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.card,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  txIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.tealDim,
    borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  txName:   { fontSize: 14, fontWeight: '600', color: C.white, marginBottom: 4 },
  txAmount: { fontSize: 14, fontWeight: '700', marginLeft: 'auto' },

  // Category badge
  catBadge:      { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText:  { fontSize: 11, fontWeight: '700' },
});
