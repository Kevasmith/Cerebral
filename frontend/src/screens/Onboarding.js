import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import useAuthStore from '../store/authStore';

const GOALS = [
  { key: 'save_more', label: 'Save More', emoji: '🏦', desc: 'Build a savings habit' },
  { key: 'make_more', label: 'Make More', emoji: '💰', desc: 'Find income opportunities' },
  { key: 'learn_investing', label: 'Learn Investing', emoji: '📈', desc: 'Understand how to grow money' },
];

const INTERESTS = [
  { key: 'investing', label: 'Investing', emoji: '📊' },
  { key: 'side_income', label: 'Side Income', emoji: '🚀' },
  { key: 'networking', label: 'Networking', emoji: '🤝' },
  { key: 'saving', label: 'Saving', emoji: '💡' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0); // 0 = goal, 1 = interests
  const [goal, setGoal] = useState(null);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { savePreferences } = useAuthStore();

  const toggleInterest = (key) => {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const finish = async () => {
    if (!interests.length) { setError('Pick at least one interest'); return; }
    setError('');
    setLoading(true);
    try {
      await savePreferences({ goal, interests, location: 'Edmonton, AB' });
    } catch (e) {
      setError('Could not save preferences. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>What's your main goal?</Text>
        <Text style={styles.sub}>We'll personalise your experience around this.</Text>
        <View style={styles.options}>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.key}
              style={[styles.card, goal === g.key && styles.cardSelected]}
              onPress={() => setGoal(g.key)}
            >
              <Text style={styles.cardEmoji}>{g.emoji}</Text>
              <Text style={[styles.cardLabel, goal === g.key && styles.cardLabelSelected]}>{g.label}</Text>
              <Text style={styles.cardDesc}>{g.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.btn, !goal && styles.btnDisabled]}
          onPress={() => goal && setStep(1)}
          disabled={!goal}
        >
          <Text style={styles.btnText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>What interests you?</Text>
      <Text style={styles.sub}>Pick everything that applies — we'll find opportunities that match.</Text>
      <View style={styles.grid}>
        {INTERESTS.map((i) => {
          const active = interests.includes(i.key);
          return (
            <TouchableOpacity
              key={i.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleInterest(i.key)}
            >
              <Text style={styles.chipEmoji}>{i.emoji}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{i.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={finish} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Get Started</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#f8f9fa', justifyContent: 'center' },
  heading: { fontSize: 26, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  sub: { fontSize: 15, color: '#666', marginBottom: 32 },
  options: { gap: 12, marginBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#e0e0e0' },
  cardSelected: { borderColor: '#1a1a2e', backgroundColor: '#f0f0ff' },
  cardEmoji: { fontSize: 28, marginBottom: 6 },
  cardLabel: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  cardLabelSelected: { color: '#1a1a2e' },
  cardDesc: { fontSize: 13, color: '#888', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  chip: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 2, borderColor: '#e0e0e0' },
  chipActive: { borderColor: '#1a1a2e', backgroundColor: '#f0f0ff' },
  chipEmoji: { fontSize: 26, marginBottom: 6 },
  chipLabel: { fontSize: 14, fontWeight: '600', color: '#555' },
  chipLabelActive: { color: '#1a1a2e' },
  btn: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#c0392b', marginBottom: 12, fontSize: 13 },
});
