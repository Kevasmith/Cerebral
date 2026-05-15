import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SHADOW, SHADOW_SOFT } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';

// AsyncStorage key consumed by Onboarding's GoalStep to pre-select the goal
// that matches the user's "What matters most" answer.
const PROFILE_KEY = 'cerebral.aha_profile';

const QUESTIONS = [
  {
    key: 'intent',
    title: 'What brings you to Cerebral?',
    sub:   'This shapes what we surface first.',
    options: [
      { value: 'big_move',  label: 'I just made a big financial move', sub: 'Home, baby, job change, big purchase' },
      { value: 'autopilot', label: 'I want my money on autopilot',     sub: 'No more spreadsheets or apps that quit on me' },
      { value: 'grow',      label: 'I want to grow what I have',       sub: 'Saving, investing, building wealth' },
      { value: 'curious',   label: 'Honestly, just curious',           sub: 'Show me what you can do' },
    ],
  },
  {
    key: 'focus',
    title: 'What matters most right now?',
    sub:   "We'll prioritize insights that help here.",
    options: [
      { value: 'saving',    label: 'Saving for something specific', sub: 'House, trip, emergency fund, peace of mind' },
      { value: 'debt',      label: 'Paying down debt',              sub: 'Credit card, line of credit, loans' },
      { value: 'awareness', label: 'Knowing where my money goes',   sub: 'Just the awareness, no judgment' },
      { value: 'wealth',    label: 'Building long-term wealth',     sub: 'Investments, retirement, future' },
    ],
  },
  {
    key: 'income',
    title: 'How does your money come in?',
    sub:   "Cerebral models your real rhythm — not a generic one.",
    options: [
      { value: 'steady',    label: 'Steady paycheck',         sub: 'Same amount each time, predictable' },
      { value: 'variable',  label: 'Variable',                sub: 'Different amounts pay to pay' },
      { value: 'boom_bust', label: 'Boom and bust',           sub: 'Big stretches, then nothing — rotational, seasonal, project' },
      { value: 'multiple',  label: 'Multiple sources stacking', sub: 'Job + side income + irregular gigs' },
    ],
  },
];

// Three example insight cards tailored to (intent × income). Defaults to the
// "curious" segment if intent doesn't match. The second card is overridden
// when the income answer is non-steady, since income-rhythm modelling is
// Cerebral's clearest differentiator.
const AHA_CONTENT = {
  big_move: [
    { tag: 'POST-MOVE AUDIT',     title: 'Sarah just bought her first condo. Cerebral found $94/month in subscriptions she had forgotten.', body: 'After a big purchase, old recurring charges hide easily. We surface them in your first week.' },
    { tag: 'REAL HOMEOWNER COSTS', title: 'Your true monthly cost of owning will run $340 above your mortgage.',                              body: 'Property tax, insurance, utilities, maintenance. Cerebral models the real number — not the bank estimate.' },
    { tag: 'GOAL ACCELERATION',   title: 'Redirecting just $50/week could shave 18 months off your next savings goal.',                       body: 'We show the math so you can choose. No pressure, no judgment.' },
  ],
  autopilot: [
    { tag: 'ZERO MANUAL ENTRY',  title: 'Every transaction sorted automatically. Zero spreadsheets.',                                          body: 'Cerebral learns your patterns and categorizes for you — the way old budgeting apps promised but never did.' },
    { tag: 'SUBSCRIPTION DRIFT', title: 'Most users find $50-100/month in forgotten subscriptions.',                                           body: 'Auto-flagged in your first week. Tap once to see them all.' },
    { tag: 'WEEKLY RECAP',       title: 'A Sunday email that takes 90 seconds and replaces the budgeting habit.',                              body: 'No login required to stay informed. Just three things worth knowing this week.' },
  ],
  grow: [
    { tag: 'FEE DISCOVERY',         title: 'Marcus found $3,200/year in account fees he did not know he was paying.',                          body: 'Across investment accounts, banking, credit cards. Cerebral surfaces what you are actually paying for what.' },
    { tag: 'TFSA + RRSP ROOM',      title: 'Most Canadians leave $8,400 in tax-advantaged contribution room unused each year.',                body: 'Cerebral tracks your room and reminds you before deadlines — without telling you what to buy.' },
    { tag: 'LIFESTYLE INFLATION',   title: 'When raises come, spending creeps up 73% of the time.',                                             body: 'We surface when your baseline shifts so you can decide if it was on purpose.' },
  ],
  curious: [
    { tag: 'SUBSCRIPTION DRIFT', title: 'The average new user finds $127/month in spending they did not know about.',                          body: 'Forgotten subscriptions, duplicate services, charges from places you stopped using.' },
    { tag: 'CASH FLOW FORECAST', title: 'See your tightest week of the month before it happens.',                                              body: 'Cerebral models your rhythm and warns you days in advance. No surprises.' },
    { tag: 'REAL SPENDING',      title: 'How you actually spend vs. how you think you spend.',                                                 body: 'Most people are off by 30%+ on at least one category. We show you what is actually happening.' },
  ],
};

const INCOME_OVERRIDE = {
  boom_bust: { tag: 'INCOME SMOOTHING',  title: 'Modeling your boom/bust cycle so you know what is a safe spend.', body: 'Built for rotational workers, project income, and seasonal earnings. Most apps assume steady paychecks — Cerebral does not.' },
  variable:  { tag: 'INCOME VARIANCE',   title: 'Your true average across variable pay periods.',                  body: 'Cerebral smooths the spikes so you spend confidently in the lean weeks and save during the heavy ones.' },
  multiple:  { tag: 'STACKED INCOME',    title: 'Combined view of all your income streams in one rhythm.',         body: 'Day job + side gigs + irregular project pay. Cerebral builds your real monthly picture from the noise.' },
};

const CARD_ACCENTS = [C.green, C.amber, C.violet];

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ step, total }) {
  return (
    <View style={styles.progress}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.progressDot, i <= step && styles.progressDotFilled]} />
      ))}
    </View>
  );
}

// ─── Question step ────────────────────────────────────────────────────────────
function QuestionStep({ question, step, total, selected, onSelect, onBack }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <ProgressDots step={step} total={total} />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.questionBody}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.qTitle, IS_WEB && { fontFamily: 'Geist' }]}>{question.title}</Text>
        <Text style={styles.qSub}>{question.sub}</Text>

        <View style={styles.optionList}>
          {question.options.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, isSelected && styles.optionActive]}
                activeOpacity={0.85}
                onPress={() => onSelect(opt.value)}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={[styles.optionSub, isSelected && styles.optionSubActive]}>
                  {opt.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Aha reveal ───────────────────────────────────────────────────────────────
function AhaStep({ profile, onContinue, onBack }) {
  const insets = useSafeAreaInsets();

  const cards = useMemo(() => {
    const base = AHA_CONTENT[profile.intent] ?? AHA_CONTENT.curious;
    const result = base.map((c, i) => ({ ...c, accent: CARD_ACCENTS[i % CARD_ACCENTS.length] }));
    if (profile.income && INCOME_OVERRIDE[profile.income]) {
      result[1] = { ...INCOME_OVERRIDE[profile.income], accent: CARD_ACCENTS[1] };
    }
    return result;
  }, [profile.intent, profile.income]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <ProgressDots step={3} total={3} />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.ahaBody}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.ahaEyebrow, IS_WEB && { fontFamily: 'Geist' }]}>TAILORED FOR YOU</Text>
        <Text style={[styles.ahaTitle, IS_WEB && { fontFamily: 'Geist' }]}>
          Here is what Cerebral{' '}
          <Text style={styles.ahaEmphasis}>typically surfaces</Text>
          {' '}for people like you.
        </Text>

        <View style={styles.cardList}>
          {cards.map((c, i) => (
            <View key={i} style={styles.card}>
              <View style={[styles.cardEdge, { backgroundColor: c.accent }]} />
              <View style={styles.cardBody}>
                <Text style={[styles.cardTag, { color: c.accent }]}>{c.tag}</Text>
                <Text style={[styles.cardTitle, IS_WEB && { fontFamily: 'Geist' }]}>{c.title}</Text>
                <Text style={styles.cardCopy}>{c.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.disclosure}>
          Example insights. Cerebral will surface your own from real account data.
        </Text>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={onContinue}>
          <Text style={[styles.primaryBtnText, IS_WEB && { fontFamily: 'Geist' }]}>
            See it on my own money →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Aha({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ intent: null, focus: null, income: null });

  const back = () => {
    if (step === 0) {
      navigation?.goBack?.();
    } else {
      setStep((s) => s - 1);
    }
  };

  const selectAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    // Advance after a short pause so the selection animation reads
    setTimeout(() => setStep((s) => s + 1), 180);
  };

  const completeAndContinue = async () => {
    try {
      await AsyncStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ ...answers, completedAt: new Date().toISOString() }),
      );
    } catch {}
    navigation?.navigate?.('SignIn', { mode: 'signup' });
  };

  if (step < QUESTIONS.length) {
    const q = QUESTIONS[step];
    return (
      <QuestionStep
        question={q}
        step={step}
        total={QUESTIONS.length}
        selected={answers[q.key]}
        onSelect={(value) => selectAnswer(q.key, value)}
        onBack={back}
      />
    );
  }

  return (
    <AhaStep
      profile={answers}
      onContinue={completeAndContinue}
      onBack={() => setStep(QUESTIONS.length - 1)}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 22 },

  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.cardAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  // Progress
  progress: { flexDirection: 'row', gap: 6 },
  progressDot: {
    width: 28, height: 3, borderRadius: 2,
    backgroundColor: C.border,
  },
  progressDotFilled: { backgroundColor: C.text },

  // Question step
  questionBody: { paddingTop: 8, paddingBottom: 24 },
  qTitle: {
    fontSize: 26, fontWeight: '700', color: C.text,
    letterSpacing: -0.4, lineHeight: 32,
  },
  qSub:   { fontSize: 13, color: C.soft, lineHeight: 18, marginTop: 10, marginBottom: 24 },

  optionList: { gap: 10 },
  option: {
    backgroundColor: C.card,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16,
    borderWidth: 1, borderColor: C.border,
    ...SHADOW_SOFT,
  },
  optionActive: {
    backgroundColor: C.surfaceDeep,
    borderColor: C.surfaceDeep,
  },
  optionLabel:       { fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 20 },
  optionLabelActive: { color: C.textInvert },
  optionSub:         { fontSize: 12, color: C.faint, lineHeight: 16, marginTop: 4 },
  optionSubActive:   { color: 'rgba(244,242,236,0.65)' },

  // Aha reveal
  ahaBody:     { paddingTop: 8, paddingBottom: 24 },
  ahaEyebrow:  { fontSize: 11, fontWeight: '700', color: C.amber, letterSpacing: 1.8, marginBottom: 10 },
  ahaTitle:    {
    fontSize: 24, fontWeight: '700', color: C.text,
    letterSpacing: -0.3, lineHeight: 30, marginBottom: 22,
  },
  ahaEmphasis: { color: C.green, fontStyle: 'italic' },

  cardList: { gap: 12, marginBottom: 18 },
  card: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOW_SOFT,
  },
  cardEdge: { width: 3 },
  cardBody: { flex: 1, padding: 16 },
  cardTag:  {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.4,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '700', color: C.text,
    letterSpacing: -0.2, lineHeight: 20, marginBottom: 6,
  },
  cardCopy:  { fontSize: 13, color: C.soft, lineHeight: 19 },

  disclosure: {
    fontSize: 11, color: C.faint, textAlign: 'center',
    lineHeight: 16, marginTop: 4,
  },

  ctaWrap: { paddingTop: 14 },
  primaryBtn: {
    backgroundColor: C.surfaceDeep,
    borderRadius: 14, paddingVertical: 18, alignItems: 'center',
    ...SHADOW,
  },
  primaryBtnText: {
    fontSize: 15, fontWeight: '700', color: C.textInvert, letterSpacing: -0.2,
  },
});
