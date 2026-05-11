import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Dimensions,
} from 'react-native';
import ChatSheet from '../components/ChatSheet';
import CerebralAvatar from '../components/CerebralAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, SHADOW, SHADOW_SOFT } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = C.green, height = 6 }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: C.track, overflow: 'hidden' }}>
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
        <Ionicons name="sparkles" size={13} color={C.green} />
      </View>
      <Text style={[styles.primaryTitle, IS_WEB && { fontFamily: 'Geist' }]}>
        Move $200 to your high-yield savings
      </Text>
      <Text style={styles.primaryBody}>
        Your checking account balance is 15% above your 3-month average. Moving this surplus to your
        Alpha Savings account will earn an additional 4.5% APY.
      </Text>
      <TouchableOpacity style={styles.executeBtn} activeOpacity={0.85}>
        <Text style={[styles.executeBtnText, IS_WEB && { fontFamily: 'Geist' }]}>Execute Transfer</Text>
        <Ionicons name="arrow-forward" size={15} color={C.textInvert} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Opportunity mini-card ────────────────────────────────────────────────────
function OppCard({ icon, accent, title, body, savingLabel, linkText }) {
  const dim = accent === C.violet ? C.violetDim : accent === C.amber ? C.amberDim : C.greenDim;
  return (
    <View style={styles.oppCard}>
      <View style={[styles.oppIcon, { backgroundColor: dim }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={[styles.oppTitle, IS_WEB && { fontFamily: 'Geist' }]}>{title}</Text>
      <Text style={styles.oppBody}>{body}</Text>
      <View style={styles.oppFooter}>
        <View style={[styles.savingBadge, { backgroundColor: dim }]}>
          <Text style={[styles.savingBadgeText, { color: accent }]}>{savingLabel}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={[styles.oppLink, { color: accent }]}>{linkText} →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Travel goal card ─────────────────────────────────────────────────────────
function TravelGoalCard() {
  return (
    <View style={styles.travelCard}>
      <View style={[
        styles.mapArea,
        IS_WEB
          ? { backgroundImage: 'linear-gradient(145deg, #F59E0B 0%, #EF4444 50%, #7C3AED 100%)' }
          : { backgroundColor: '#F59E0B' },
      ]}>
        <View style={styles.travelBadge}>
          <Text style={styles.travelBadgeText}>Travel Goal</Text>
        </View>
        <Text style={[styles.mapLabel, IS_WEB && { fontFamily: 'Geist' }]}>Europe 2024 ✈︎</Text>
      </View>
      <View style={styles.travelInfo}>
        <View style={styles.travelTitleRow}>
          <Text style={[styles.travelTitle, IS_WEB && { fontFamily: 'Geist' }]}>European Summer Trip</Text>
          <Text style={[styles.travelPct, IS_WEB && { fontFamily: 'Geist' }]}>65%</Text>
        </View>
        <ProgressBar pct={65} />
        <View style={styles.travelAmtRow}>
          <Text style={styles.travelSaved}>$6,500 saved</Text>
          <Text style={styles.travelGoal}>$10,000 goal</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Savings goal row ─────────────────────────────────────────────────────────
function GoalRow({ icon, title, current, target, caption, color }) {
  const pct = Math.round((current / target) * 100);
  const dim = color === C.violet ? C.violetDim : color === C.amber ? C.amberDim : C.greenDim;
  return (
    <View style={styles.goalRow}>
      <View style={[styles.goalIcon, { backgroundColor: dim }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.goalTitleRow}>
          <Text style={[styles.goalTitle, IS_WEB && { fontFamily: 'Geist' }]}>{title}</Text>
          <Text style={styles.goalAmt}>
            <Text style={{ color: C.text, fontWeight: '700' }}>${current.toLocaleString()}</Text>
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
  const [chatOpen, setChatOpen]     = useState(false);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      >
        {/* Hero */}
        <Text style={[styles.eyebrow, IS_WEB && { fontFamily: 'Geist' }]}>Opportunities</Text>
        <Text style={[styles.pageTitle, IS_WEB && { fontFamily: 'Geist' }]}>3 strategic moves</Text>
        <Text style={styles.pageSub}>
          Cerebral AI found ways to optimize your capital this month.
        </Text>
        <View style={styles.potentialPill}>
          <Text style={[styles.potentialAmt, IS_WEB && { fontFamily: 'Geist' }]}>+$425.00</Text>
          <Text style={styles.potentialLabel}>Monthly potential</Text>
        </View>

        {/* Primary AI card */}
        <PrimaryCard />

        {/* Opportunity mini-cards */}
        <OppCard
          icon="flash-outline"
          accent={C.green}
          title="Utility Provider Swap"
          body="Cerebral found a greener provider with a lower fixed rate for your postcode."
          savingLabel="Save $15/mo"
          linkText="View comparison"
        />
        <OppCard
          icon="albums-outline"
          accent={C.violet}
          title="Subscription Audit"
          body="Two streaming services show zero usage over the last 60 days."
          savingLabel="Save $24.99/mo"
          linkText="Manage"
        />
        <OppCard
          icon="document-text-outline"
          accent={C.amber}
          title="Tax Harvest"
          body="Opportunity detected in your tech portfolio to offset capital gains."
          savingLabel="Tax-loss benefit"
          linkText="Review"
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
            color={C.green}
          />
          <View style={styles.goalDivider} />
          <GoalRow
            icon="car-outline"
            title="New EV Downpayment"
            current={3200}
            target={8000}
            caption="Boost this goal with AI-recommended moves."
            color={C.violet}
          />
        </View>

        {/* AI Reasoning */}
        <View style={styles.reasoningCard}>
          <View style={styles.reasoningHeader}>
            <Ionicons name="bulb-outline" size={16} color={C.violet} />
            <Text style={[styles.reasoningTitle, IS_WEB && { fontFamily: 'Geist' }]}>Why these moves?</Text>
          </View>
          <View style={[styles.reasoningQuote, { borderLeftColor: C.violetBorder }]}>
            <Text style={styles.reasoningQuoteText}>
              {'"Liquidity forecasting predicts a 12% drop in expected expenditures next month based on historical travel patterns and the expiration of two subscriptions."'}
            </Text>
          </View>
          <View style={[styles.reasoningQuote, { borderLeftColor: C.greenBorder, marginTop: 10 }]}>
            <Text style={styles.reasoningQuoteText}>
              {'"Alpha Savings rates rose 0.25bps Monday; your current checking provider has held flat."'}
            </Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.85}>
            <Ionicons name="download-outline" size={15} color={C.textInvert} />
            <Text style={[styles.downloadBtnText, IS_WEB && { fontFamily: 'Geist' }]}>Download Strategic Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} screenKey="savings" />
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

  // Hero
  eyebrow:   { fontSize: 11, fontWeight: '800', color: C.green, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 18, marginBottom: 6 },
  pageTitle: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -0.8, marginBottom: 8 },
  pageSub:   { fontSize: 14, color: C.soft, lineHeight: 21, marginBottom: 14 },
  potentialPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
    borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: C.greenDim, marginBottom: 20,
  },
  potentialAmt:   { fontSize: 15, fontWeight: '800', color: C.green, letterSpacing: -0.2 },
  potentialLabel: { fontSize: 12, color: C.green, fontWeight: '600' },

  // Primary card
  primaryCard: {
    backgroundColor: C.card,
    borderRadius: 22, padding: 20,
    marginBottom: 14,
    ...SHADOW,
  },
  aiBadgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  aiDot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  aiBadgeText:   { fontSize: 11, fontWeight: '800', color: C.green, letterSpacing: 1.2, flex: 1 },
  primaryTitle:  { fontSize: 21, fontWeight: '800', color: C.text, marginBottom: 10, lineHeight: 27, letterSpacing: -0.3 },
  primaryBody:   { fontSize: 14, color: C.soft, lineHeight: 21, marginBottom: 18 },
  executeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.surfaceDeep,
    borderRadius: 14, paddingVertical: 14,
    ...SHADOW_SOFT,
  },
  executeBtnText: { fontSize: 14, fontWeight: '700', color: C.textInvert, letterSpacing: -0.2 },

  // Opp card
  oppCard: {
    backgroundColor: C.card,
    borderRadius: 18, padding: 16,
    marginBottom: 12,
    ...SHADOW_SOFT,
  },
  oppIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  oppTitle:  { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 6, letterSpacing: -0.2 },
  oppBody:   { fontSize: 13, color: C.soft, lineHeight: 19, marginBottom: 12 },
  oppFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savingBadge: {
    borderRadius: 8, paddingVertical: 5, paddingHorizontal: 12,
  },
  savingBadgeText: { fontSize: 12, fontWeight: '700' },
  oppLink:         { fontSize: 13, fontWeight: '700' },

  // Travel card
  travelCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 22,
    ...SHADOW,
  },
  mapArea: {
    height: 130, justifyContent: 'flex-end', padding: 14,
    position: 'relative',
  },
  travelBadge: {
    position: 'absolute', top: 12, left: 14,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20,
  },
  travelBadgeText: { fontSize: 10, fontWeight: '800', color: C.textInvert, letterSpacing: 0.8, textTransform: 'uppercase' },
  mapLabel:        { fontSize: 18, fontWeight: '800', color: C.textInvert, letterSpacing: -0.3 },
  travelInfo:      { padding: 16, gap: 10 },
  travelTitleRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  travelTitle:     { fontSize: 15, fontWeight: '700', color: C.text },
  travelPct:       { fontSize: 15, fontWeight: '800', color: C.green },
  travelAmtRow:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  travelSaved:     { fontSize: 12, color: C.soft, fontWeight: '600' },
  travelGoal:      { fontSize: 12, color: C.text, fontWeight: '600' },

  // Goals
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 12, letterSpacing: -0.3 },
  goalsCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    overflow: 'hidden', marginBottom: 18,
    ...SHADOW_SOFT,
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
  goalTitle:    { fontSize: 14, fontWeight: '700', color: C.text },
  goalAmt:      { fontSize: 13, color: C.soft },
  goalCaption:  { fontSize: 12, color: C.faint, lineHeight: 17, marginBottom: 2 },
  goalDivider:  { height: 1, backgroundColor: C.border, marginHorizontal: 16 },

  // AI Reasoning
  reasoningCard: {
    backgroundColor: C.card,
    borderRadius: 18, padding: 18,
    marginBottom: 8,
    ...SHADOW_SOFT,
  },
  reasoningHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  reasoningTitle:     { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  reasoningQuote:     { paddingLeft: 12, borderLeftWidth: 2 },
  reasoningQuoteText: { fontSize: 13, color: C.soft, lineHeight: 19, fontStyle: 'italic' },
  downloadBtn: {
    marginTop: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.surfaceDeep,
    borderRadius: 14, paddingVertical: 14,
  },
  downloadBtnText: { fontSize: 14, fontWeight: '700', color: C.textInvert, letterSpacing: -0.2 },
});
