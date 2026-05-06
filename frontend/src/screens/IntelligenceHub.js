import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const IS_WEB = Platform.OS === 'web';

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

// ─── Insight config (mirrored from Snapshot) ──────────────────────────────────
const INSIGHT_CONFIG = {
  opt:    { label: 'Optimization Found', icon: 'wallet-outline',      color: C.teal,  dim: C.tealDim,  border: C.tealBorder },
  risk:   { label: 'Risk Alert',         icon: 'warning-outline',     color: C.amber, dim: C.amberDim, border: C.amberBorder },
  wealth: { label: 'Wealth Building',    icon: 'trending-up-outline', color: C.teal,  dim: C.tealDim,  border: C.tealBorder },
};
const INSIGHT_TONE = {
  overspending: 'risk', idle_cash: 'wealth', income_trend: 'wealth',
  opportunity: 'opt', savings_tip: 'opt',
};

// ─── Mock insights fallback ───────────────────────────────────────────────────
const MOCK_INSIGHTS = [
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

// ─── Insight Card ─────────────────────────────────────────────────────────────
function InsightCard({ insight }) {
  const type = INSIGHT_TONE[insight.type] ?? 'opt';
  const cfg  = INSIGHT_CONFIG[type];
  return (
    <View style={styles.insightCard}>
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
        <Text style={styles.insightBody}>{insight.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.faint} style={{ marginLeft: 4 }} />
    </View>
  );
}

// ─── Health Metric Row ────────────────────────────────────────────────────────
function HealthMetric({ label, value, barColor, barPercent }) {
  return (
    <View style={styles.healthRow}>
      <View style={styles.healthRowTop}>
        <Text style={[styles.healthLabel, IS_WEB && { fontFamily: 'Geist' }]}>{label}</Text>
        <Text style={[styles.healthValue, { color: barColor }]}>{value}</Text>
      </View>
      <View style={styles.healthBarTrack}>
        <View style={[styles.healthBarFill, { width: `${barPercent}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function IntelligenceHub({ navigation, route }) {
  const insets  = useSafeAreaInsets();
  const insights = route.params?.insights ?? [];
  const displayInsights = insights.length > 0 ? insights : MOCK_INSIGHTS;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={22} color={C.teal} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, IS_WEB && { fontFamily: 'Geist' }]}>Intelligence Hub</Text>
          <Ionicons name="sparkles" size={20} color={C.teal} />
        </View>

        {/* Pulse Check card */}
        <View style={styles.pulseCard}>
          {/* Label row */}
          <View style={styles.pulseLabelRow}>
            <Text style={[styles.pulseLabel, IS_WEB && { fontFamily: 'Geist' }]}>✦ CEREBRAL AI · DAILY BRIEFING</Text>
          </View>

          {/* Title */}
          <Text style={[styles.pulseTitle, IS_WEB && { fontFamily: 'Geist' }]}>Today's Pulse Check</Text>

          {/* Body */}
          <Text style={styles.pulseBody}>
            Your portfolio is outperforming the benchmark by{' '}
            <Text style={{ color: C.teal, fontWeight: '700' }}>1.2%</Text>
            {' '}today. Food spending is up{' '}
            <Text style={{ color: C.amber, fontWeight: '700' }}>12%</Text>
            {' '}vs last month. You have{' '}
            <Text style={{ color: '#7C3AED', fontWeight: '700' }}>$1,200</Text>
            {' '}in idle cash that could be working harder. No urgent actions required.
          </Text>

          {/* Stat pills */}
          <View style={styles.statPillRow}>
            <View style={[styles.statPill, { backgroundColor: C.tealDim, borderColor: C.tealBorder }]}>
              <Text style={[styles.statPillText, { color: C.teal }]}>↑ 1.2% Portfolio</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: C.amberDim, borderColor: C.amberBorder }]}>
              <Text style={[styles.statPillText, { color: C.amber }]}>↑ 12% Food Spend</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: 'rgba(124,58,237,0.12)', borderColor: 'rgba(124,58,237,0.25)' }]}>
              <Text style={[styles.statPillText, { color: '#7C3AED' }]}>$1.2k Idle Cash</Text>
            </View>
          </View>
        </View>

        {/* All Insights section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>All Insights</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{displayInsights.length}</Text>
          </View>
        </View>

        <View style={styles.insightsList}>
          {displayInsights.map((ins, i) => (
            <InsightCard key={ins.id ?? i} insight={ins} />
          ))}
        </View>

        {/* Financial Health section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>Financial Health</Text>
        </View>

        <View style={styles.healthCard}>
          <HealthMetric
            label="Savings Rate"
            value="18% of income"
            barColor={C.teal}
            barPercent={18}
          />
          <View style={styles.healthDivider} />
          <HealthMetric
            label="Debt-to-Income"
            value="0.24"
            barColor="#22C55E"
            barPercent={24}
          />
          <View style={styles.healthDivider} />
          <HealthMetric
            label="Emergency Fund"
            value="2.3 months"
            barColor={C.amber}
            barPercent={46}
          />
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12 },

  // Header
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20, fontWeight: '800', color: C.white,
  },

  // Pulse Check card
  pulseCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1, borderColor: C.tealBorder,
    marginBottom: 24,
  },
  pulseLabelRow: { marginBottom: 10 },
  pulseLabel: {
    fontSize: 11, fontWeight: '800', color: C.teal, letterSpacing: 1.2,
  },
  pulseTitle: {
    fontSize: 22, fontWeight: '900', color: C.white,
    marginBottom: 10, letterSpacing: -0.4,
  },
  pulseBody: {
    fontSize: 14, color: C.muted, lineHeight: 21, marginBottom: 16,
  },
  statPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statPill: {
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1,
  },
  statPillText: { fontSize: 12, fontWeight: '700' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.white },
  countBadge: {
    backgroundColor: C.tealDim,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: C.tealBorder,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: C.teal },

  // Insights
  insightsList: { gap: 10, marginBottom: 24 },
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

  // Financial Health
  healthCard: {
    backgroundColor: C.card,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 24,
  },
  healthRow: { paddingVertical: 10 },
  healthRowTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  healthLabel: { fontSize: 14, fontWeight: '600', color: C.white },
  healthValue: { fontSize: 14, fontWeight: '700' },
  healthBarTrack: {
    height: 6, borderRadius: 999,
    backgroundColor: C.border,
    overflow: 'hidden',
  },
  healthBarFill: { height: '100%', borderRadius: 999 },
  healthDivider: { height: 1, backgroundColor: C.border },
});
