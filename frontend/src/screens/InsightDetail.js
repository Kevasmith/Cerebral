import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, SHADOW, SHADOW_SOFT } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';

// ─── Tone mapping (mirrors Snapshot/IntelligenceHub) ──────────────────────────
const TYPE_TO_BADGE = {
  overspending: 'Risk Alert',
  idle_cash:    'Optimization Found',
  income_trend: 'Wealth Building',
  opportunity:  'Opportunity',
  savings_tip:  'Tip',
};
const TYPE_TO_ICON = {
  overspending: 'warning-outline',
  idle_cash:    'wallet-outline',
  income_trend: 'trending-up-outline',
  opportunity:  'compass-outline',
  savings_tip:  'bulb-outline',
};
const TYPE_TO_TONE = {
  overspending: { color: C.amber,  dim: C.amberDim,   border: C.amberBorder },
  idle_cash:    { color: C.green,  dim: C.greenDim,   border: C.greenBorder },
  income_trend: { color: C.violet, dim: C.violetDim,  border: C.violetBorder },
  opportunity:  { color: C.green,  dim: C.greenDim,   border: C.greenBorder },
  savings_tip:  { color: C.green,  dim: C.greenDim,   border: C.greenBorder },
};

const TYPE_TO_REASONING = {
  overspending: 'Detected anomalous spending against your rolling baseline. Threshold exceeded for the current period.',
  idle_cash:    'Cash position above optimal allocation. Yield differential suggests redeploying surplus to higher-yield instruments.',
  income_trend: 'Sustained inflow above multi-month average. Patterns indicate stable upward income trajectory.',
  opportunity:  'Pattern recognition flagged a candidate action with positive expected value relative to your goal.',
  savings_tip:  'Behavioral analysis identified a high-leverage adjustment within your spending profile.',
};

function relativeTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function InsightDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const insight = route?.params?.insight;

  if (!insight) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: C.muted }}>No insight selected.</Text>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: C.green, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badgeLabel = TYPE_TO_BADGE[insight.type] ?? 'Insight';
  const iconName   = TYPE_TO_ICON[insight.type]  ?? 'sparkles-outline';
  const tone       = TYPE_TO_TONE[insight.type]  ?? TYPE_TO_TONE.opportunity;
  const reasoning  = TYPE_TO_REASONING[insight.type] ?? null;
  const when       = relativeTime(insight.createdAt);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, IS_WEB && { fontFamily: 'Geist' }]}>AI Insights</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Eyebrow */}
        <View style={styles.eyebrowRow}>
          <Ionicons name="sparkles" size={11} color={C.green} />
          <Text style={[styles.eyebrow, IS_WEB && { fontFamily: 'Geist' }]}>CEREBRAL INTELLIGENCE</Text>
        </View>

        <Text style={[styles.pageTitle, IS_WEB && { fontFamily: 'Geist' }]}>Insight Detail</Text>

        {/* Tone badge */}
        <View style={[styles.badge, { backgroundColor: tone.dim, borderColor: tone.border }]}>
          <View style={[styles.badgeDot, { backgroundColor: tone.color }]} />
          <Text style={[styles.badgeText, { color: tone.color }]}>{badgeLabel}</Text>
        </View>

        {/* Main insight card */}
        <View style={styles.insightCard}>
          <View style={styles.insightTop}>
            <View style={[styles.insightIcon, { backgroundColor: tone.dim, borderColor: tone.border }]}>
              <Ionicons name={iconName} size={22} color={tone.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, IS_WEB && { fontFamily: 'Geist' }]}>
                {insight.title}
              </Text>
              {when ? <Text style={styles.insightWhen}>{when}</Text> : null}
            </View>
          </View>

          <Text style={styles.insightBody}>
            {insight.body ?? insight.description ?? ''}
          </Text>

          {/* AI Reasoning */}
          {reasoning && (
            <View style={styles.reasoningCard}>
              <View style={styles.sectionLabel}>
                <Ionicons name="hardware-chip-outline" size={11} color={C.green} />
                <Text style={styles.sectionLabelText}>AI REASONING</Text>
              </View>
              <Text style={styles.reasoningText}>{reasoning}</Text>
            </View>
          )}
        </View>

        {/* Primary action — black pill */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={C.textInvert} />
          <Text style={[styles.primaryBtnText, IS_WEB && { fontFamily: 'Geist' }]}>Got it</Text>
        </TouchableOpacity>

        {/* Secondary action */}
        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7} onPress={() => navigation?.goBack()}>
          <Text style={[styles.secondaryBtnText, IS_WEB && { fontFamily: 'Geist' }]}>
            Back to insights
          </Text>
        </TouchableOpacity>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  backBtn:     { padding: 6, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text },

  // Eyebrow
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, marginBottom: 6 },
  eyebrow:    { fontSize: 11, fontWeight: '800', color: C.green, letterSpacing: 1.2 },
  pageTitle:  { fontSize: 32, fontWeight: '900', color: C.text, marginBottom: 16, letterSpacing: -0.5 },

  // Badge
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14,
    marginBottom: 20,
  },
  badgeDot:  { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Insight card
  insightCard: {
    backgroundColor: C.card,
    borderRadius: 22, padding: 20,
    marginBottom: 22,
    ...SHADOW,
  },
  insightTop: { flexDirection: 'row', gap: 14, marginBottom: 14, alignItems: 'center' },
  insightIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
  },
  insightTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 4, letterSpacing: -0.3 },
  insightWhen:  { fontSize: 12, color: C.faint },
  insightBody:  { fontSize: 14, color: C.soft, lineHeight: 22, marginBottom: 18 },

  // Reasoning sub-card
  reasoningCard: {
    backgroundColor: C.cardAlt,
    borderRadius: 14, padding: 14,
  },
  sectionLabel:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionLabelText:{ fontSize: 10, fontWeight: '800', color: C.green, letterSpacing: 1.2 },
  reasoningText:   { fontSize: 13, color: C.soft, lineHeight: 19 },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.surfaceDeep,
    borderRadius: 999, paddingVertical: 16,
    marginBottom: 12,
    ...SHADOW,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: C.textInvert },
  secondaryBtn: {
    borderRadius: 999, paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: C.card,
    marginBottom: 8,
    ...SHADOW_SOFT,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: C.soft },
});
