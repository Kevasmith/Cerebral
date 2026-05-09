import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const IS_WEB = Platform.OS === 'web';

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

// ─── Main screen ──────────────────────────────────────────────────────────────
const TYPE_TO_BADGE = {
  overspending: 'Risk Alert',
  idle_cash: 'Optimization Found',
  income_trend: 'Wealth Building',
  opportunity: 'Opportunity',
  savings_tip: 'Tip',
};
const TYPE_TO_ICON = {
  overspending: 'warning-outline',
  idle_cash: 'wallet-outline',
  income_trend: 'trending-up-outline',
  opportunity: 'compass-outline',
  savings_tip: 'bulb-outline',
};

export default function InsightDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const insight = route?.params?.insight;

  if (!insight) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: C.muted }}>No insight selected.</Text>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: C.teal, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badgeLabel = TYPE_TO_BADGE[insight.type] ?? 'Insight';
  const iconName   = TYPE_TO_ICON[insight.type] ?? 'sparkles-outline';

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
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>

        {/* Main insight card */}
        <View style={styles.insightCard}>
          <View style={styles.insightTop}>
            <View style={styles.insightIcon}>
              <Ionicons name={iconName} size={20} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, IS_WEB && { fontFamily: 'Geist' }]}>
                {insight.title}
              </Text>
              <Text style={styles.insightBody}>
                {insight.body ?? insight.description ?? ''}
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7} onPress={() => navigation?.goBack()}>
          <Text style={[styles.secondaryBtnText, IS_WEB && { fontFamily: 'Geist' }]}>
            Got it
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

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
