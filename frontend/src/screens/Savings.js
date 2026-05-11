import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import ChatSheet from '../components/ChatSheet';
import CerebralAvatar from '../components/CerebralAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, SHADOW, SHADOW_SOFT } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';

const INITIAL_GOALS = [
  {
    id: 'travel',    name: 'Europe 2024',         icon: 'airplane-outline',
    current: 6500,   target: 10000, monthly: 700, color: C.amber,  accent: C.amberDim,
  },
  {
    id: 'emergency', name: 'Emergency Fund',      icon: 'shield-outline',
    current: 12400,  target: 15000, monthly: 200, color: C.green,  accent: C.greenDim,
  },
  {
    id: 'ev',        name: 'EV Downpayment',      icon: 'car-outline',
    current: 3200,   target: 8000,  monthly: 0,   color: C.violet, accent: C.violetDim,
  },
];

const fmt = (n) => '$' + Math.round(n).toLocaleString();

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = C.green, height = 6 }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: C.track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(pct, 100)}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

// ─── Goal card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, onEdit }) {
  const pct = Math.min(100, Math.round((goal.current / Math.max(goal.target, 1)) * 100));
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalTop}>
        <View style={[styles.goalIcon, { backgroundColor: goal.accent }]}>
          <Ionicons name={goal.icon} size={18} color={goal.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.goalTitleRow}>
            <Text style={[styles.goalName, IS_WEB && { fontFamily: 'Geist' }]} numberOfLines={1}>{goal.name}</Text>
            <Text style={[styles.goalPct, { color: goal.color }, IS_WEB && { fontFamily: 'Geist' }]}>{pct}%</Text>
          </View>
          <Text style={styles.goalAmts}>
            <Text style={{ color: C.text, fontWeight: '700' }}>{fmt(goal.current)}</Text>
            {' of '}{fmt(goal.target)} · {fmt(goal.monthly)}/mo
          </Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={16} color={C.muted} />
        </TouchableOpacity>
      </View>
      <View style={{ marginTop: 12 }}>
        <ProgressBar pct={pct} color={goal.color} height={6} />
      </View>
    </View>
  );
}

// ─── Edit goal modal ──────────────────────────────────────────────────────────
function EditGoalModal({ visible, goal, onSave, onClose }) {
  const [name,    setName]    = useState(goal?.name ?? '');
  const [current, setCurrent] = useState(String(goal?.current ?? 0));
  const [target,  setTarget]  = useState(String(goal?.target  ?? 0));
  const [monthly, setMonthly] = useState(String(goal?.monthly ?? 0));

  React.useEffect(() => {
    if (visible && goal) {
      setName(goal.name);
      setCurrent(String(goal.current));
      setTarget(String(goal.target));
      setMonthly(String(goal.monthly));
    }
  }, [visible, goal]);

  const save = () => {
    onSave({
      ...goal,
      name:    name.trim() || goal.name,
      current: Math.max(0, parseFloat(current) || 0),
      target:  Math.max(1, parseFloat(target)  || 1),
      monthly: Math.max(0, parseFloat(monthly) || 0),
    });
    onClose();
  };

  if (!goal) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <Text style={[styles.modalTitle, IS_WEB && { fontFamily: 'Geist' }]}>Edit Goal</Text>

          <Text style={styles.modalLabel}>Name</Text>
          <TextInput
            style={[styles.modalInput, IS_WEB && { outlineStyle: 'none' }]}
            value={name}
            onChangeText={setName}
            placeholder="Goal name"
            placeholderTextColor={C.faint}
          />

          <View style={styles.modalRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>Current</Text>
              <TextInput
                style={[styles.modalInput, IS_WEB && { outlineStyle: 'none' }]}
                value={current}
                onChangeText={setCurrent}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={C.faint}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>Target</Text>
              <TextInput
                style={[styles.modalInput, IS_WEB && { outlineStyle: 'none' }]}
                value={target}
                onChangeText={setTarget}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={C.faint}
              />
            </View>
          </View>

          <Text style={styles.modalLabel}>Monthly contribution</Text>
          <TextInput
            style={[styles.modalInput, IS_WEB && { outlineStyle: 'none' }]}
            value={monthly}
            onChangeText={setMonthly}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={C.faint}
          />

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={save}>
              <Text style={[styles.modalSaveText, IS_WEB && { fontFamily: 'Geist' }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Cerebral Analysis ────────────────────────────────────────────────────────
function goalAnalysis(goal) {
  const remaining = Math.max(0, goal.target - goal.current);
  if (remaining === 0) {
    return { tone: 'on', sentence: `${goal.name} — Achieved. You hit the ${fmt(goal.target)} target.` };
  }
  if (!goal.monthly || goal.monthly <= 0) {
    return {
      tone: 'stalled',
      sentence: `${goal.name} — Stalled. Add a monthly contribution to estimate timing.`,
    };
  }
  const months = Math.ceil(remaining / goal.monthly);
  const unit = months === 1 ? 'month' : 'months';
  return {
    tone: 'on',
    sentence: `${goal.name} — On track. At ${fmt(goal.monthly)}/mo, you'll hit your ${fmt(goal.target)} target in ${months} ${unit}.`,
  };
}

function AnalysisCard({ goals }) {
  return (
    <View style={styles.analysisCard}>
      <View style={styles.analysisHeader}>
        <Ionicons name="bulb-outline" size={16} color={C.violet} />
        <Text style={[styles.analysisTitle, IS_WEB && { fontFamily: 'Geist' }]}>CEREBRAL ANALYSIS</Text>
      </View>
      {goals.map((g) => {
        const { tone, sentence } = goalAnalysis(g);
        const accentBorder = tone === 'stalled' ? C.amberBorder : C.greenBorder;
        return (
          <View key={g.id} style={[styles.analysisQuote, { borderLeftColor: accentBorder }]}>
            <Text style={styles.analysisText}>{sentence}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Savings() {
  const insets = useSafeAreaInsets();
  const [chatOpen,   setChatOpen]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [goals,      setGoals]      = useState(INITIAL_GOALS);
  const [editing,    setEditing]    = useState(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  const saveGoal = (updated) => {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  };

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
        <Text style={[styles.eyebrow, IS_WEB && { fontFamily: 'Geist' }]}>SAVINGS</Text>
        <Text style={[styles.pageTitle, IS_WEB && { fontFamily: 'Geist' }]}>Your goals</Text>
        <Text style={styles.pageSub}>
          Cerebral is tracking progress toward each target.
        </Text>

        {/* Goal cards */}
        <View style={{ gap: 12, marginTop: 18 }}>
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onEdit={() => setEditing(g)} />
          ))}
        </View>

        {/* Cerebral Analysis */}
        <View style={{ marginTop: 18 }}>
          <AnalysisCard goals={goals} />
        </View>
      </ScrollView>

      <EditGoalModal
        visible={!!editing}
        goal={editing}
        onSave={saveGoal}
        onClose={() => setEditing(null)}
      />
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
  pageSub:   { fontSize: 14, color: C.soft, lineHeight: 21 },

  // Goal card
  goalCard: {
    backgroundColor: C.card,
    borderRadius: 18, padding: 16,
    ...SHADOW_SOFT,
  },
  goalTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalIcon:     { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  goalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  goalName:     { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2, flex: 1, marginRight: 8 },
  goalPct:      { fontSize: 13, fontWeight: '800' },
  goalAmts:     { fontSize: 12, color: C.soft, marginTop: 2 },
  editBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.cardAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  // Cerebral Analysis
  analysisCard: {
    backgroundColor: C.card,
    borderRadius: 18, padding: 18,
    ...SHADOW_SOFT,
  },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  analysisTitle:  { fontSize: 12, fontWeight: '800', color: C.violet, letterSpacing: 1.2 },
  analysisQuote:  { paddingLeft: 12, borderLeftWidth: 2, marginBottom: 10 },
  analysisText:   { fontSize: 13, color: C.soft, lineHeight: 19 },

  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: C.card, borderRadius: 24, padding: 22,
    width: '100%', maxWidth: 380,
    ...SHADOW,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 16, letterSpacing: -0.2 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  modalInput: {
    backgroundColor: C.input, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.text, marginBottom: 14,
  },
  modalRow:        { flexDirection: 'row', gap: 10 },
  modalBtns:       { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn:  {
    flex: 1, padding: 14, borderRadius: 12,
    backgroundColor: C.cardAlt, alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, color: C.text, fontWeight: '600' },
  modalSaveBtn:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: C.surfaceDeep, alignItems: 'center' },
  modalSaveText:   { fontSize: 15, color: C.textInvert, fontWeight: '800', letterSpacing: -0.2 },
});
