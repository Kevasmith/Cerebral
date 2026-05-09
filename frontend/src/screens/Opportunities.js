import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';

const IS_WEB = Platform.OS === 'web';
const { height: SCREEN_H } = Dimensions.get('window');

const WEB_GRADIENT = IS_WEB
  ? { backgroundImage: 'linear-gradient(145deg, #0F172A 0%, #0b2018 40%, #085c3a 75%, #0a9165 100%)' }
  : {};

const C = {
  navy: '#0F172A', navyDeep: '#0b2018', mid: '#085c3a',
  green: '#0a9165', greenLite: '#27ae60', violet: '#7C3AED',
  card: '#FBF9F4', cardNested: '#F7F4EC', bg: '#F4F2EC', chip: '#F0EEE6',
  faint: '#9aa3b2', soft: '#888', border: '#ECE8DC', track: '#ECE9DF',
  red: '#EF4444', amber: '#F59E0B',
};

const SHADOW = {
  shadowColor: C.navy, shadowOpacity: 0.08, shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 }, elevation: 3,
};
const SHADOW_SOFT = {
  shadowColor: C.navy, shadowOpacity: 0.04, shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 }, elevation: 1,
};

// ─── Primary Opportunity Card ─────────────────────────────────────────────────

function OppPrimaryCard() {
  return (
    <View style={styles.primaryCard}>
      <View style={styles.primaryBadgeRow}>
        <View style={styles.primaryAiBadge}>
          <Text style={styles.primaryAiText}>AI Analysis</Text>
        </View>
        <View style={styles.primaryLiveDot} />
      </View>
      <Text style={[styles.primaryTitle, IS_WEB && { fontFamily: 'Geist' }]}>
        Move $200 to your high-yield savings
      </Text>
      <Text style={styles.primaryBody}>
        Checking is 15% above your 3-month average. Alpha Savings earns +4.5% APY.
      </Text>
      <View style={styles.primaryActions}>
        <TouchableOpacity style={styles.executeBtn} activeOpacity={0.85}>
          <Text style={styles.executeBtnText}>Execute Transfer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.infoBtn} activeOpacity={0.7}>
          <Ionicons name="information-circle-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.primaryCaption}>
        · Liquidity forecast model · 92% confidence
      </Text>
    </View>
  );
}

// ─── Mini Opportunity Card ────────────────────────────────────────────────────

function OppMiniCard({ icon, title, body, save }) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniIconWrap}>
        <Ionicons name={icon} size={18} color={C.green} />
      </View>
      <Text style={[styles.miniTitle, IS_WEB && { fontFamily: 'Geist' }]}>{title}</Text>
      <Text style={styles.miniBody}>{body}</Text>
      <View style={styles.miniSaveBadge}>
        <Text style={styles.miniSaveText}>{save}</Text>
      </View>
    </View>
  );
}

// ─── Travel Goal Card ─────────────────────────────────────────────────────────

function TravelGoalCard() {
  return (
    <View style={styles.travelCard}>
      <View style={styles.travelHeader}>
        <View style={styles.travelOverlay} />
        <View style={styles.travelBadge}>
          <Text style={styles.travelBadgeText}>Travel Goal</Text>
        </View>
        <Text style={[styles.travelTitle, IS_WEB && { fontFamily: 'Geist' }]}>Europe 2024 ✈︎</Text>
      </View>
      <View style={styles.travelBody}>
        <View style={styles.travelRow}>
          <Text style={styles.travelName}>European Summer Trip</Text>
          <Text style={[styles.travelPct, IS_WEB && { fontFamily: 'Geist' }]}>65%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: '65%' }]} />
        </View>
        <View style={styles.travelAmtRow}>
          <Text style={styles.travelSaved}>$6,500 saved</Text>
          <Text style={styles.travelGoal}>$10,000 goal</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ icon, title, saved, target, pct, color, accent }) {
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalTop}>
        <View style={[styles.goalIconWrap, { backgroundColor: C.cardNested }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.goalTitleRow}>
            <Text style={[styles.goalName, IS_WEB && { fontFamily: 'Geist' }]}>{title}</Text>
            <Text style={[styles.goalPct, { color: accent }, IS_WEB && { fontFamily: 'Geist' }]}>{pct}%</Text>
          </View>
          <Text style={styles.goalAmts}>{saved} <Text style={{ color: C.faint }}>of</Text> {target}</Text>
        </View>
      </View>
      <View style={styles.goalTrack}>
        <View style={[styles.goalBar, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Why These Moves Card ─────────────────────────────────────────────────────

function WhyCard() {
  return (
    <View style={styles.whyCard}>
      <View style={styles.whyHeader}>
        <Ionicons name="bulb-outline" size={16} color={C.violet} />
        <Text style={[styles.whyTitle, IS_WEB && { fontFamily: 'Geist' }]}>Why these moves?</Text>
      </View>
      <View style={[styles.whyQuote, { borderLeftColor: 'rgba(124,58,237,0.25)' }]}>
        <Text style={styles.whyText}>
          "Liquidity forecasting predicts a 12% drop in expenditures next month based on historical travel patterns."
        </Text>
      </View>
      <View style={[styles.whyQuote, { borderLeftColor: 'rgba(10,145,101,0.25)', marginTop: 8 }]}>
        <Text style={styles.whyText}>
          "Alpha Savings rates rose 0.25bps Monday; your checking provider held flat."
        </Text>
      </View>
    </View>
  );
}

// ─── Legacy Opportunity Card (for API data) ───────────────────────────────────

const TYPE_CONFIG = {
  gig:                  { label: 'Gig',        color: '#e67e22', bg: 'rgba(230,126,34,0.08)' },
  event:                { label: 'Event',       color: '#8e44ad', bg: 'rgba(142,68,173,0.08)' },
  side_hustle:          { label: 'Side Hustle', color: '#27ae60', bg: 'rgba(39,174,96,0.08)'  },
  investment_explainer: { label: 'Learn',       color: '#2980b9', bg: 'rgba(41,128,185,0.08)' },
  networking:           { label: 'Network',     color: C.red,     bg: 'rgba(239,68,68,0.08)'  },
};
const ACTION_LABEL = { learn_more: 'Learn More', attend: 'Attend', explore: 'Explore' };

function LegacyOpportunityCard({ item }) {
  const cfg = TYPE_CONFIG[item.type] ?? { label: item.type, color: C.faint, bg: C.chip };
  return (
    <View style={[styles.legacyCard, IS_WEB && styles.legacyCardWeb]}>
      <View style={styles.legacyHeader}>
        <View style={[styles.typeBadge, { backgroundColor: cfg.color + '22' }]}>
          <Text style={[styles.typeLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {item.location && <Text style={styles.location}>{item.location}</Text>}
      </View>
      <Text style={styles.legacyTitle}>{item.title}</Text>
      <Text style={styles.legacyDesc}>{item.description}</Text>
      <TouchableOpacity
        style={[styles.actionBtn, { borderColor: cfg.color }]}
        onPress={() => item.actionUrl && Linking.openURL(item.actionUrl)}
        activeOpacity={0.7}
      >
        <Text style={[styles.actionText, { color: cfg.color }]}>
          {ACTION_LABEL[item.actionType] ?? 'Explore'} →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Opportunities() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [opportunities, setOpportunities] = useState([]);

  const load = useCallback(async () => {
    try {
      const res  = await api.get('/opportunities');
      const data = res.data ?? [];
      setOpportunities(data);
    } catch {
      setOpportunities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, WEB_GRADIENT, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, WEB_GRADIENT]}
      contentContainerStyle={{ paddingBottom: 0 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
        />
      }
    >
      {/* ── Dark hero ── */}
      <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
        <Text style={styles.heroEyebrow}>Opportunities</Text>
        <Text style={[styles.heroTitle, IS_WEB && { fontFamily: 'Geist' }]}>3 strategic moves</Text>
        <Text style={styles.heroSub}>
          Cerebral AI found ways to optimize your capital this month.
        </Text>
        <View style={styles.heroBadge}>
          <Text style={[styles.heroBadgeAmt, IS_WEB && { fontFamily: 'Geist' }]}>+$425.00</Text>
          <Text style={styles.heroBadgeLabel}>Monthly potential</Text>
        </View>
      </View>

      {/* ── Cream content area ── */}
      <View style={styles.contentArea}>
        {/* Primary AI card */}
        <OppPrimaryCard />

        {/* More smart moves — horizontal scroll */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>More smart moves</Text>
          <Text style={styles.sectionCount}>3 found</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.miniScroll}
        >
          <OppMiniCard
            icon="flash-outline"
            title="Utility Provider Swap"
            body="Greener provider with a lower fixed rate for your postcode."
            save="Save $15/mo"
          />
          <OppMiniCard
            icon="apps-outline"
            title="Subscription Audit"
            body="Two streaming services show zero usage in 60 days."
            save="Save $24.99/mo"
          />
          <OppMiniCard
            icon="receipt-outline"
            title="Tax-Loss Harvest"
            body="Tech portfolio offset opportunity detected."
            save="Tax benefit"
          />
        </ScrollView>

        {/* Travel goal */}
        <View style={styles.goalSection}>
          <TravelGoalCard />
        </View>

        {/* Active goals */}
        <View style={styles.goalsArea}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 10 }, IS_WEB && { fontFamily: 'Geist' }]}>
            Active goals
          </Text>
          <GoalCard
            icon="shield-checkmark-outline" title="Emergency Fund"
            saved="$12,400" target="$15,000" pct={82}
            color={C.green} accent={C.green}
          />
          <GoalCard
            icon="car-outline" title="EV Downpayment"
            saved="$3,200" target="$8,000" pct={40}
            color={C.navy} accent={C.navy}
          />
        </View>

        {/* Why these moves */}
        <WhyCard />

        {/* API opportunities (if any beyond mock) */}
        {opportunities.length > 0 && (
          <View style={styles.legacySection}>
            <Text style={[styles.sectionTitle, IS_WEB && { fontFamily: 'Geist' }]}>More opportunities</Text>
            {IS_WEB ? (
              <View style={styles.legacyGrid}>
                {opportunities.map((item) => (
                  <LegacyOpportunityCard key={item.id} item={item} />
                ))}
              </View>
            ) : (
              opportunities.map((item) => (
                <LegacyOpportunityCard key={item.id} item={item} />
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.navy },

  // Hero
  hero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  heroEyebrow: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  heroTitle:   { fontSize: 26, fontWeight: '700', color: '#fff', letterSpacing: -0.6, lineHeight: 32, marginBottom: 4 },
  heroSub:     { fontSize: 13, color: 'rgba(255,255,255,0.62)', lineHeight: 20, marginBottom: 14 },
  heroBadge:   {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12,
  },
  heroBadgeAmt:   { fontSize: 15, fontWeight: '700', color: C.greenLite },
  heroBadgeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  // Content area
  contentArea: {
    backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 18, minHeight: SCREEN_H * 0.75,
  },

  // Primary AI card
  primaryCard: {
    marginHorizontal: 16, borderRadius: 22, padding: 20, color: '#fff',
    backgroundColor: C.navy,
    ...(IS_WEB ? {
      backgroundImage: `linear-gradient(155deg, ${C.navy} 0%, #0b2018 50%, #085c3a 100%)`,
    } : {}),
    shadowColor: C.green, shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  primaryBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  primaryAiBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(76,215,246,0.15)', borderRadius: 20,
  },
  primaryAiText:  { fontSize: 9.5, fontWeight: '800', color: '#7be0ff', letterSpacing: 1, textTransform: 'uppercase' },
  primaryLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.greenLite },
  primaryTitle:   { fontSize: 21, fontWeight: '700', color: '#fff', letterSpacing: -0.5, lineHeight: 27, marginBottom: 8 },
  primaryBody:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginBottom: 16 },
  primaryActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  executeBtn: {
    flex: 1, paddingVertical: 12, backgroundColor: C.green, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.green, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  executeBtnText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  infoBtn: {
    width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  primaryCaption: { fontSize: 11.5, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.navy, letterSpacing: -0.3 },
  sectionCount: { fontSize: 11.5, color: C.faint, fontWeight: '600' },

  // Mini cards horizontal scroll
  miniScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  miniCard: {
    width: 200, backgroundColor: C.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border, ...SHADOW_SOFT,
  },
  miniIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(10,145,101,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  miniTitle:    { fontSize: 14, fontWeight: '700', color: C.navy, letterSpacing: -0.2, lineHeight: 18, marginBottom: 5 },
  miniBody:     { fontSize: 11.5, color: C.soft, lineHeight: 16, marginBottom: 10, minHeight: 32 },
  miniSaveBadge:{ backgroundColor: C.cardNested, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  miniSaveText: { fontSize: 12, fontWeight: '700', color: C.green },

  // Travel goal card
  goalSection: { marginHorizontal: 16, marginTop: 18, marginBottom: 4 },
  travelCard:  { backgroundColor: C.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...SHADOW_SOFT },
  travelHeader: {
    height: 120, justifyContent: 'flex-end', padding: 14,
    ...(IS_WEB
      ? { backgroundImage: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #7c3aed 100%)' }
      : { backgroundColor: '#f59e0b' }),
  },
  travelOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    ...(IS_WEB ? { backgroundImage: 'linear-gradient(180deg, transparent 40%, rgba(15,23,42,0.55) 100%)' } : { backgroundColor: 'rgba(0,0,0,0.3)' }),
  },
  travelBadge: {
    position: 'absolute', top: 12, left: 14,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20,
  },
  travelBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.8, textTransform: 'uppercase' },
  travelTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  travelBody:  { padding: 14 },
  travelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  travelName:  { fontSize: 13, fontWeight: '600', color: C.navy },
  travelPct:   { fontSize: 13, fontWeight: '700', color: C.green },
  progressTrack:{ height: 8, backgroundColor: C.track, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBar:  { height: 8, backgroundColor: C.green, borderRadius: 4 },
  travelAmtRow: { flexDirection: 'row', justifyContent: 'space-between' },
  travelSaved:  { fontSize: 11.5, fontWeight: '600', color: C.soft },
  travelGoal:   { fontSize: 11.5, fontWeight: '600', color: C.navy },

  // Goal cards
  goalsArea: { paddingHorizontal: 16, marginTop: 16 },
  goalCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 10,
  },
  goalTop:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  goalIconWrap:{ width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  goalTitleRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  goalName:    { fontSize: 14, fontWeight: '700', color: C.navy, letterSpacing: -0.2 },
  goalPct:     { fontSize: 12, fontWeight: '700' },
  goalAmts:    { fontSize: 11, color: C.soft, marginTop: 1 },
  goalTrack:   { height: 6, backgroundColor: C.track, borderRadius: 3, overflow: 'hidden' },
  goalBar:     { height: 6, borderRadius: 3 },

  // Why card
  whyCard: {
    marginHorizontal: 16, marginTop: 14, backgroundColor: C.cardNested,
    borderRadius: 18, padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border,
  },
  whyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  whyTitle:  { fontSize: 14, fontWeight: '700', color: C.navy, letterSpacing: -0.2 },
  whyQuote:  { paddingLeft: 12, borderLeftWidth: 2 },
  whyText:   { fontSize: 11.5, color: C.soft, fontStyle: 'italic', lineHeight: 17 },

  // Legacy API cards
  legacySection: { paddingHorizontal: 16, marginTop: 20 },
  legacyGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legacyCard:    { backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 14, ...SHADOW_SOFT },
  legacyCardWeb: { flex: 1, minWidth: 280 },
  legacyHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeLabel:     { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  location:      { fontSize: 12, color: C.soft },
  legacyTitle:   { fontSize: 16, fontWeight: '700', color: C.navy, marginBottom: 6 },
  legacyDesc:    { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 14 },
  actionBtn:     { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  actionText:    { fontSize: 13, fontWeight: '700' },
});
