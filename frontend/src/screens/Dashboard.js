import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';
import Skeleton from '../components/Skeleton';

const STATUS_CONFIG = {
  'on-track': { label: 'On Track', color: '#2ecc71', bg: '#eafaf1' },
  overspending: { label: 'Overspending', color: '#e74c3c', bg: '#fdf2f2' },
  underspending: { label: 'Under Budget', color: '#3498db', bg: '#eaf4fb' },
};

const INSIGHT_COLORS = {
  overspending: '#ffeaa7',
  idle_cash: '#dfe6e9',
  income_trend: '#d5f5e3',
  opportunity: '#d6eaf8',
  savings_tip: '#fde8d8',
};

function SnapshotCard({ data }) {
  const cfg = STATUS_CONFIG[data.status] ?? STATUS_CONFIG['on-track'];
  const trend = data.spendingTrend;
  const trendArrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
  const trendColor = trend.direction === 'up' ? '#e74c3c' : trend.direction === 'down' ? '#2ecc71' : '#666';

  return (
    <View style={styles.snapshotCard}>
      <Text style={styles.snapshotLabel}>Available Cash</Text>
      <Text style={styles.snapshotAmount}>${Number(data.totalCashAvailable).toFixed(2)}</Text>
      <View style={styles.snapshotRow}>
        <Text style={{ color: trendColor, fontWeight: '600' }}>
          {trendArrow} ${trend.currentMonth.toFixed(2)} this month
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </View>
  );
}

function InsightCard({ insight, onRead }) {
  const bg = INSIGHT_COLORS[insight.type] ?? '#f5f5f5';
  return (
    <TouchableOpacity
      style={[styles.insightCard, { backgroundColor: bg }]}
      onPress={() => !insight.isRead && onRead(insight.id)}
      activeOpacity={0.8}
    >
      {!insight.isRead && <View style={styles.unreadDot} />}
      <Text style={styles.insightTitle}>{insight.title}</Text>
      <Text style={styles.insightBody}>{insight.body}</Text>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState(null);
  const { profile } = useAuthStore();

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [snapRes, insightRes] = await Promise.all([
        api.get('/accounts/dashboard'),
        api.post('/insights/refresh'),
      ]);
      setSnapshot(snapRes.data);
      setInsights(insightRes.data ?? []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await api.patch(`/insights/${id}/read`);
      setInsights((prev) => prev.map((i) => i.id === id ? { ...i, isRead: true } : i));
    } catch {}
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Skeleton height={28} width={180} borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton height={16} width={130} borderRadius={4} />
        </View>
        <Skeleton height={130} borderRadius={20} style={{ margin: 16, marginTop: 8 }} />
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <Skeleton height={20} width={110} borderRadius={4} style={{ marginBottom: 14 }} />
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} height={88} borderRadius={16} style={{ marginBottom: 12 }} />
          ))}
        </View>
      </ScrollView>
    );
  }
  if (error && !snapshot) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hey{profile?.displayName ? ` ${profile.displayName.split(' ')[0]}` : ''} 👋
        </Text>
        <Text style={styles.headerSub}>Here's your financial picture</Text>
      </View>

      {snapshot && <SnapshotCard data={snapshot} />}

      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onRead={markRead} />
          ))}
        </View>
      )}

      {insights.length === 0 && !loading && (
        <View style={styles.emptyInsights}>
          <Text style={styles.emptyText}>Connect your bank to unlock personalized insights.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#1a1a2e' },
  headerSub: { fontSize: 14, color: '#888', marginTop: 4 },
  snapshotCard: {
    margin: 16, marginTop: 8, backgroundColor: '#1a1a2e',
    borderRadius: 20, padding: 24,
  },
  snapshotLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 },
  snapshotAmount: { color: '#fff', fontSize: 36, fontWeight: '800', marginBottom: 12 },
  snapshotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  insightCard: { borderRadius: 16, padding: 18, marginBottom: 12, position: 'relative' },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c' },
  insightTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  insightBody: { fontSize: 14, color: '#444', lineHeight: 20 },
  emptyInsights: { margin: 16, padding: 20, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center' },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 14 },
  errorText: { color: '#c0392b', marginBottom: 16 },
  retryBtn: { backgroundColor: '#1a1a2e', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
});
