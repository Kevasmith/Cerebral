import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Dimensions, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const IS_WEB = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

const C = {
  bg:        '#080E14',
  card:      '#0D1520',
  cardDeep:  '#0A1018',
  teal:      '#10C896',
  tealDim:   'rgba(16,200,150,0.15)',
  tealBorder:'rgba(16,200,150,0.25)',
  white:     '#FFFFFF',
  muted:     'rgba(255,255,255,0.55)',
  faint:     'rgba(255,255,255,0.28)',
  red:       '#EF4444',
  border:    'rgba(255,255,255,0.07)',
};

// ─── Savings chart (SVG on web, view-based on native) ─────────────────────────
function SavingsChart() {
  const points = [0, 0, 0, 19, 57, 114, 171, 190, 210, 228];
  const maxVal = 228;
  const W = Math.min(SW - 48, 640);
  const H = 110;
  const labels = ['JAN', 'MAR', 'JUN', 'SEP', 'DEC'];

  if (IS_WEB) {
    const pts = points.map((v, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - (v / maxVal) * H;
      return `${x},${y}`;
    }).join(' ');
    const areaPath = `M ${pts.replace(/ /g, ' L ')} L ${W},${H} L 0,${H} Z`;
    const linePath = `M ${pts.replace(/ /g, ' L ')}`;

    return (
      <View style={styles.chartWrap}>
        <View style={{ width: W, height: H }}>
          <svg
            width={W} height={H}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={C.teal} stopOpacity="0.18" />
                <stop offset="100%" stopColor={C.teal} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#chartGrad)" />
            <path d={linePath} fill="none" stroke={C.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={W} cy={0} r="4" fill={C.teal} />
          </svg>
        </View>
        <View style={styles.chartLabels}>
          {labels.map(l => (
            <Text key={l} style={styles.chartLabel}>{l}</Text>
          ))}
        </View>
      </View>
    );
  }

  // Native: simplified line using absolute views
  return (
    <View style={styles.chartWrap}>
      <View style={{ height: H, justifyContent: 'flex-end' }}>
        <View style={{
          height: 2, backgroundColor: C.teal,
          borderRadius: 1,
          marginHorizontal: 4,
          transform: [{ rotate: '-4deg' }],
          alignSelf: 'stretch',
        }} />
      </View>
      <View style={styles.chartLabels}>
        {labels.map(l => (
          <Text key={l} style={styles.chartLabel}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Billing row ──────────────────────────────────────────────────────────────
function BillRow({ date, amount }) {
  return (
    <View style={styles.billRow}>
      <Text style={styles.billDate}>{date}</Text>
      <Text style={styles.billAmount}>{amount}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function InsightDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const insight = route?.params?.insight ?? MOCK_INSIGHT;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, IS_WEB && { fontFamily: 'Geist' }]}>AI Insights</Text>
        <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.8}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={14} color={C.white} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Eyebrow */}
        <View style={styles.eyebrowRow}>
          <Ionicons name="git-compare-outline" size={12} color={C.teal} />
          <Text style={[styles.eyebrow, IS_WEB && { fontFamily: 'Geist' }]}>CEREBRAL INTELLIGENCE</Text>
        </View>

        <Text style={[styles.pageTitle, IS_WEB && { fontFamily: 'Geist' }]}>Insight Detail</Text>

        {/* Badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Optimization Found</Text>
        </View>

        {/* Main insight card */}
        <View style={styles.insightCard}>
          <View style={styles.insightTop}>
            <View style={styles.insightIcon}>
              <Ionicons name="tv-outline" size={20} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, IS_WEB && { fontFamily: 'Geist' }]}>
                {insight.title}
              </Text>
              <Text style={styles.insightBody}>
                {insight.descriptionPrefix}
                <Text style={styles.insightHighlight}>{insight.highlight}</Text>
                {insight.descriptionSuffix}
                <Text style={styles.insightAmount}> {insight.savingsLabel}</Text>
              </Text>
            </View>
          </View>

          {/* AI Reasoning */}
          <View style={styles.reasoningCard}>
            <View style={styles.sectionLabel}>
              <Ionicons name="hardware-chip-outline" size={11} color={C.teal} />
              <Text style={styles.sectionLabelText}>AI REASONING</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statKey}>Usage Stats</Text>
              <Text style={styles.statVal}>{insight.usageStat}</Text>
            </View>
            <View style={styles.statDotRow}>
              <View style={styles.redDot} />
              <Text style={styles.statNote}>{insight.reasoning}</Text>
            </View>

            <View style={[styles.sectionLabel, { marginTop: 18 }]}>
              <Ionicons name="time-outline" size={11} color={C.teal} />
              <Text style={styles.sectionLabelText}>BILLING HISTORY</Text>
            </View>
            {insight.billingHistory.map((b, i) => (
              <BillRow key={i} date={b.date} amount={b.amount} />
            ))}
          </View>
        </View>

        {/* Projected Impact */}
        <View style={styles.impactRow}>
          <View>
            <Text style={[styles.impactLabel, IS_WEB && { fontFamily: 'Geist' }]}>Projected{'\n'}Impact</Text>
            <Text style={styles.impactSub}>Cumulative 12-month{'\n'}trajectory</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.impactAmount, IS_WEB && { fontFamily: 'Geist' }]}>
              {insight.projectedSavings}
            </Text>
            <Text style={styles.impactCaption}>TOTAL POTENTIAL{'\n'}SAVINGS</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <SavingsChart />
        </View>

        {/* CTAs */}
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}>
          <Ionicons name="close-circle" size={18} color={C.bg} />
          <Text style={[styles.primaryBtnText, IS_WEB && { fontFamily: 'Geist' }]}>
            Cancel Subscription via Cerebral
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7}>
          <Text style={[styles.secondaryBtnText, IS_WEB && { fontFamily: 'Geist' }]}>
            Keep Subscription
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_INSIGHT = {
  title: 'Unused Subscription',
  descriptionPrefix: 'We detected you\'ve paid for ',
  highlight: '"StreamMax"',
  descriptionSuffix: ' for 3 months without any usage. Canceling this will save you',
  savingsLabel: '$18.99/month.',
  usageStat: '0 minutes',
  reasoning: 'Activity threshold is below the 5th percentile\nfor active accounts in your profile group.',
  billingHistory: [
    { date: 'Oct 12', amount: '$18.99' },
    { date: 'Nov 12', amount: '$18.99' },
    { date: 'Dec 12', amount: '$18.99' },
  ],
  projectedSavings: '$227.88',
  monthlySaving: 18.99,
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { padding: 6, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: C.white },
  avatarBtn: { padding: 4 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  // Eyebrow
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, marginBottom: 6 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: C.teal, letterSpacing: 1.2 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: C.white, marginBottom: 14, letterSpacing: -0.5 },

  // Badge
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: C.tealBorder,
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: C.tealDim, marginBottom: 24,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.teal },
  badgeText: { fontSize: 13, fontWeight: '600', color: C.teal },

  // Insight card
  insightCard: {
    backgroundColor: C.card,
    borderRadius: 20, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: C.border,
  },
  insightTop: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  insightIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.tealDim,
    borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  insightTitle: { fontSize: 18, fontWeight: '800', color: C.white, marginBottom: 6 },
  insightBody: { fontSize: 14, color: C.muted, lineHeight: 21 },
  insightHighlight: { color: C.white, fontWeight: '600' },
  insightAmount: { color: C.teal, fontWeight: '700' },

  // Reasoning card
  reasoningCard: {
    backgroundColor: C.cardDeep,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionLabelText: { fontSize: 10, fontWeight: '800', color: C.teal, letterSpacing: 1.2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statKey: { fontSize: 13, color: C.muted },
  statVal: { fontSize: 13, fontWeight: '700', color: C.teal },
  statDotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 2 },
  redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.red, marginTop: 4, flexShrink: 0 },
  statNote: { fontSize: 12, color: C.muted, lineHeight: 18, flex: 1 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  billDate: { fontSize: 13, color: C.faint },
  billAmount: { fontSize: 13, color: C.muted },

  // Impact
  impactRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14,
  },
  impactLabel: { fontSize: 22, fontWeight: '800', color: C.white, lineHeight: 28 },
  impactSub: { fontSize: 12, color: C.faint, marginTop: 4, lineHeight: 17 },
  impactAmount: { fontSize: 36, fontWeight: '900', color: C.teal, lineHeight: 40 },
  impactCaption: { fontSize: 10, fontWeight: '700', color: C.teal, letterSpacing: 0.8, textAlign: 'right', marginTop: 2 },

  // Chart
  chartCard: {
    backgroundColor: C.card,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 28,
  },
  chartWrap: { gap: 12 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { fontSize: 10, color: C.faint, fontWeight: '600', letterSpacing: 0.5 },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.teal,
    borderRadius: 16, paddingVertical: 17,
    marginBottom: 12,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: C.bg },
  secondaryBtn: {
    borderWidth: 1, borderColor: C.border,
    borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    backgroundColor: C.card,
    marginBottom: 8,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: C.muted },
});
