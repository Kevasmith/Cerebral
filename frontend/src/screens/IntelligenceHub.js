import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, SHADOW, SHADOW_SOFT } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';

// ─── Insight tone mapping (mirrors Snapshot) ──────────────────────────────────
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

// ─── Insight Card ─────────────────────────────────────────────────────────────
function InsightCard({ insight }) {
  const type = INSIGHT_TONE[insight.type] ?? 'opt';
  const cfg  = INSIGHT_CONFIG[type];
  return (
    <View style={styles.insightCard}>
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
        <Text style={styles.insightBody}>
          {insight.body ?? insight.description ?? ''}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function IntelligenceHub({ navigation, route }) {
  const insets  = useSafeAreaInsets();
  const displayInsights = route.params?.insights ?? [];

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
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, IS_WEB && { fontFamily: 'Geist' }]}>Intelligence Hub</Text>
          <Ionicons name="sparkles" size={20} color={C.green} />
        </View>

        {/* Pulse Check card */}
        <View style={styles.pulseCard}>
          <View style={styles.pulseLabelRow}>
            <Ionicons name="sparkles" size={11} color={C.green} />
            <Text style={[styles.pulseLabel, IS_WEB && { fontFamily: 'Geist' }]}>CEREBRAL AI · DAILY BRIEFING</Text>
          </View>
          <Text style={[styles.pulseTitle, IS_WEB && { fontFamily: 'Geist' }]}>Today's Pulse Check</Text>
          <Text style={styles.pulseBody}>
            {displayInsights.length > 0
              ? `${displayInsights.length} new insight${displayInsights.length === 1 ? '' : 's'} ready for review.`
              : 'Connect a bank account to start receiving personalized insights.'}
          </Text>
        </View>

        {/* All Insights section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>All Insights</Text>
          {displayInsights.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{displayInsights.length}</Text>
            </View>
          )}
        </View>

        {displayInsights.length > 0 ? (
          <View style={styles.insightsList}>
            {displayInsights.map((ins, i) => (
              <InsightCard key={ins.id ?? i} insight={ins} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyInsightsBox}>
            <Text style={styles.emptyInsightsText}>
              No insights yet. Connect a bank to get started.
            </Text>
          </View>
        )}
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
    ...SHADOW_SOFT,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3,
  },

  // Pulse Check card
  pulseCard: {
    backgroundColor: C.card,
    borderRadius: 22, padding: 20,
    marginBottom: 22,
    ...SHADOW,
  },
  pulseLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  pulseLabel:    { fontSize: 11, fontWeight: '800', color: C.green, letterSpacing: 1.2 },
  pulseTitle:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.4 },
  pulseBody:     { fontSize: 13.5, color: C.soft, lineHeight: 20 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12, paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  countBadge: {
    backgroundColor: C.greenDim,
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: C.green },

  // Insights
  insightsList: { gap: 10, marginBottom: 24 },
  emptyInsightsBox: {
    backgroundColor: C.card, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 24,
    ...SHADOW_SOFT,
  },
  emptyInsightsText: { fontSize: 13, color: C.muted, textAlign: 'center' },
  insightCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card,
    borderRadius: 16, padding: 14,
    ...SHADOW_SOFT,
  },
  insightIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1,
  },
  insightMeta:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  insightLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  insightAge:   { fontSize: 11, color: C.faint },
  insightTitle: { fontSize: 14.5, fontWeight: '700', color: C.text, marginBottom: 3, letterSpacing: -0.2 },
  insightBody:  { fontSize: 12.5, color: C.soft, lineHeight: 17 },
});
