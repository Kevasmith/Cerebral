import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

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
  white:       '#FFFFFF',
  muted:       'rgba(255,255,255,0.55)',
  faint:       'rgba(255,255,255,0.28)',
  border:      'rgba(255,255,255,0.07)',
};

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = C.teal, height = 6 }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(pct, 100)}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

// ─── Primary AI card ──────────────────────────────────────────────────────────
function PrimaryCard() {
  return (
    <View style={styles.primaryCard}>
      <View style={styles.aiBadgeRow}>
        <View style={styles.aiDot} />
        <Text style={[styles.aiBadgeText, IS_WEB && { fontFamily: 'Geist' }]}>AI ANALYSIS</Text>
        <View style={styles.sparkleIcon}>
          <Ionicons name="sparkles" size={12} color={C.teal} />
        </View>
      </View>
      <Text style={[styles.primaryTitle, IS_WEB && { fontFamily: 'Geist' }]}>
        Move $200 to your high-yield savings
      </Text>
      <Text style={styles.primaryBody}>
        Your checking account balance is 15% above your 3-month average. Moving this surplus to your Alpha Savings account will earn an additional 4.5% APY.
      </Text>
      <View style={styles.primaryActions}>
        <View style={styles.iconBtnRow}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="business-outline" size={16} color={C.faint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="trending-up-outline" size={16} color={C.faint} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.executeBtn} activeOpacity={0.85}>
          <Text style={[styles.executeBtnText, IS_WEB && { fontFamily: 'Geist' }]}>Execute Transfer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Opportunity mini-card ────────────────────────────────────────────────────
function OppCard({ icon, title, body, savingLabel, linkText }) {
  return (
    <View style={styles.oppCard}>
      <View style={styles.oppIcon}>
        <Ionicons name={icon} size={18} color={C.teal} />
      </View>
      <Text style={[styles.oppTitle, IS_WEB && { fontFamily: 'Geist' }]}>{title}</Text>
      <Text style={styles.oppBody}>{body}</Text>
      <View style={styles.savingBadge}>
        <Text style={styles.savingBadgeText}>{savingLabel}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.7}>
        <Text style={styles.oppLink}>{linkText} →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Travel goal card ─────────────────────────────────────────────────────────
function TravelGoalCard() {
  return (
    <View style={styles.travelCard}>
      {/* Map placeholder — gradient approximates the teal/earth map */}
      <View style={[
        styles.mapArea,
        IS_WEB && {
          backgroundImage: 'linear-gradient(145deg, #0a2a35 0%, #0d3d4a 40%, #0a9165 70%, #085c3a 100%)',
        },
        !IS_WEB && { backgroundColor: '#0a2a35' },
      ]}>
        <View style={styles.mapOverlay}>
          {/* Simplified continent silhouette using views */}
          <View style={styles.continentBlob} />
        </View>
        <Text style={styles.mapLabel}>Europe 2024</Text>
      </View>
      <View style={styles.travelInfo}>
        <View style={styles.travelTitleRow}>
          <Text style={[styles.travelTitle, IS_WEB && { fontFamily: 'Geist' }]}>European Summer Trip</Text>
          <Text style={[styles.travelPct, IS_WEB && { fontFamily: 'Geist' }]}>65%</Text>
        </View>
        <ProgressBar pct={65} />
        <View style={styles.travelAmtRow}>
          <Text style={styles.travelSaved}>$6,500.00 saved</Text>
          <Text style={styles.travelGoal}>$10,000.00 goal</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Savings goal row ─────────────────────────────────────────────────────────
function GoalRow({ icon, title, current, target, caption, color = C.teal }) {
  const pct = Math.round((current / target) * 100);
  return (
    <View style={styles.goalRow}>
      <View style={[styles.goalIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.goalTitleRow}>
          <Text style={[styles.goalTitle, IS_WEB && { fontFamily: 'Geist' }]}>{title}</Text>
          <Text style={styles.goalAmt}>
            <Text style={{ color: C.white, fontWeight: '700' }}>${current.toLocaleString()}</Text>
            {' / '}${target.toLocaleString()}
          </Text>
        </View>
        <Text style={styles.goalCaption}>{caption}</Text>
        <ProgressBar pct={pct} color={color} height={5} />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Savings({ navigation }) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={14} color={C.white} />
          </View>
          <Text style={[styles.brand, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color={C.teal} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
      >
        {/* Hero */}
        <Text style={[styles.pageTitle, IS_WEB && { fontFamily: 'Geist' }]}>Opportunities</Text>
        <Text style={styles.pageSub}>
          Cerebral AI has identified 3 strategic moves to optimize your capital efficiency this month.
        </Text>
        <View style={styles.potentialPill}>
          <Text style={[styles.potentialText, IS_WEB && { fontFamily: 'Geist' }]}>+$425.00  Monthly Potential</Text>
        </View>

        {/* Primary AI card */}
        <PrimaryCard />

        {/* Opportunity mini-cards */}
        <OppCard
          icon="flash-outline"
          title="Utility Provider Swap"
          body="Cerebral found a greener provider with a lower fixed rate for your postcode."
          savingLabel="Save $15/mo"
          linkText="View Comparison"
        />
        <OppCard
          icon="albums-outline"
          title="Subscription Audit"
          body="Two streaming services show zero usage over the last 60 days."
          savingLabel="Save $24.99/mo"
          linkText="Manage Subscriptions"
        />
        <OppCard
          icon="document-text-outline"
          title="Tax Harvest"
          body="Opportunity detected in your tech portfolio to offset capital gains."
          savingLabel="Tax-Loss Benefit"
          linkText="Review Portfolio"
        />

        {/* Travel goal */}
        <TravelGoalCard />

        {/* Active Savings Goals */}
        <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>Active Savings Goals</Text>

        <View style={styles.goalsCard}>
          <GoalRow
            icon="shield-outline"
            title="Emergency Fund"
            current={12400}
            target={15000}
            caption="Target reached in 4 months at current rate."
            color={C.teal}
          />
          <View style={styles.goalDivider} />
          <GoalRow
            icon="car-outline"
            title="New EV Downpayment"
            current={3200}
            target={8000}
            caption="Boost this goal with AI-recommended moves."
            color="#7C3AED"
          />
        </View>

        {/* AI Reasoning */}
        <View style={styles.reasoningCard}>
          <View style={styles.reasoningHeader}>
            <Ionicons name="bulb-outline" size={15} color={C.teal} />
            <Text style={[styles.reasoningTitle, IS_WEB && { fontFamily: 'Geist' }]}>Why these moves?</Text>
          </View>
          <Text style={styles.reasoningQuote}>
            {'"Our liquidity forecasting algorithm predicts a 12% drop in your expected expenditures next month based on historical travel patterns and the expiration of two subscriptions."'}
          </Text>
          <Text style={[styles.reasoningQuote, { marginTop: 10 }]}>
            {'"Interest rates for Alpha Savings have risen by 0.25bps since Monday, while your current checking provider has held rates flat."'}
          </Text>
          <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.8}>
            <Text style={[styles.downloadBtnText, IS_WEB && { fontFamily: 'Geist' }]}>Download Strategic Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  brand:   { fontSize: 17, fontWeight: '700', color: C.white },
  bellBtn: { padding: 4 },

  // Hero
  pageTitle: { fontSize: 34, fontWeight: '900', color: C.white, letterSpacing: -0.8, marginTop: 20, marginBottom: 8 },
  pageSub:   { fontSize: 14, color: C.muted, lineHeight: 21, marginBottom: 14 },
  potentialPill: {
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: C.tealBorder,
    borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16,
    backgroundColor: C.tealDim, marginBottom: 20,
  },
  potentialText: { fontSize: 13, fontWeight: '700', color: C.teal },

  // Primary card
  primaryCard: {
    backgroundColor: C.card,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: C.tealBorder,
    marginBottom: 14,
  },
  aiBadgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  aiDot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: C.teal },
  aiBadgeText:   { fontSize: 11, fontWeight: '800', color: C.teal, letterSpacing: 1.2, flex: 1 },
  sparkleIcon:   {},
  primaryTitle:  { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 10, lineHeight: 26 },
  primaryBody:   { fontSize: 14, color: C.muted, lineHeight: 21, marginBottom: 18 },
  primaryActions:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtnRow:    { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.cardDeep ?? '#0A1018',
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  executeBtn: {
    backgroundColor: C.teal,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22,
  },
  executeBtnText: { fontSize: 14, fontWeight: '800', color: C.bg },

  // Opp card
  oppCard: {
    backgroundColor: C.card,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 12,
  },
  oppIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  oppTitle:  { fontSize: 16, fontWeight: '700', color: C.white, marginBottom: 6 },
  oppBody:   { fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: 14 },
  savingBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: C.tealBorder,
    borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12,
    backgroundColor: C.tealDim, marginBottom: 12,
  },
  savingBadgeText: { fontSize: 13, fontWeight: '700', color: C.teal },
  oppLink:         { fontSize: 13, color: C.teal, fontWeight: '600' },

  // Travel card
  travelCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    marginBottom: 28,
  },
  mapArea: {
    height: 160, justifyContent: 'flex-end', padding: 14,
    position: 'relative',
  },
  mapOverlay:     { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  continentBlob: {
    width: 140, height: 90,
    backgroundColor: 'rgba(139,103,60,0.45)',
    borderRadius: 40,
    transform: [{ rotate: '-12deg' }],
  },
  mapLabel:       { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.75)', zIndex: 1 },
  travelInfo:     { padding: 16, gap: 10 },
  travelTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  travelTitle:    { fontSize: 16, fontWeight: '800', color: C.white },
  travelPct:      { fontSize: 16, fontWeight: '800', color: C.teal },
  travelAmtRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  travelSaved:    { fontSize: 12, color: C.teal, fontWeight: '600' },
  travelGoal:     { fontSize: 12, color: C.faint },

  // Goals
  sectionTitle: { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 14 },
  goalsCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', marginBottom: 20,
  },
  goalRow: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    padding: 16,
  },
  goalIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  goalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  goalTitle:   { fontSize: 14, fontWeight: '700', color: C.white },
  goalAmt:     { fontSize: 13, color: C.muted },
  goalCaption: { fontSize: 12, color: C.faint, lineHeight: 17, marginBottom: 2 },
  goalDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },

  // AI Reasoning
  reasoningCard: {
    backgroundColor: C.card,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 8,
  },
  reasoningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  reasoningTitle:  { fontSize: 15, fontWeight: '700', color: C.white },
  reasoningQuote:  { fontSize: 13, color: C.muted, lineHeight: 20, fontStyle: 'italic' },
  downloadBtn: {
    marginTop: 18,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', backgroundColor: C.cardDeep ?? '#0A1018',
  },
  downloadBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
});
