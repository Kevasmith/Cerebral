import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { api } from '../api/client';
import { MOCK_OPPORTUNITIES } from '../data/mockData';

const TYPE_CONFIG = {
  gig: { label: 'Gig', color: '#e67e22', bg: '#fef9f0' },
  event: { label: 'Event', color: '#8e44ad', bg: '#f9f0ff' },
  side_hustle: { label: 'Side Hustle', color: '#27ae60', bg: '#f0fff5' },
  investment_explainer: { label: 'Learn', color: '#2980b9', bg: '#f0f8ff' },
  networking: { label: 'Network', color: '#c0392b', bg: '#fff5f5' },
};

const ACTION_LABEL = {
  learn_more: 'Learn More',
  attend: 'Attend',
  explore: 'Explore',
};

function OpportunityCard({ item }) {
  const cfg = TYPE_CONFIG[item.type] ?? { label: item.type, color: '#555', bg: '#f5f5f5' };

  const handleAction = () => {
    if (item.actionUrl) Linking.openURL(item.actionUrl);
  };

  return (
    <View style={[styles.card, { backgroundColor: cfg.bg }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: cfg.color + '22' }]}>
          <Text style={[styles.typeLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {item.location && <Text style={styles.location}>{item.location}</Text>}
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDesc}>{item.description}</Text>
      <TouchableOpacity
        style={[styles.actionBtn, { borderColor: cfg.color }]}
        onPress={handleAction}
        activeOpacity={0.7}
      >
        <Text style={[styles.actionText, { color: cfg.color }]}>
          {ACTION_LABEL[item.actionType] ?? 'Explore'} →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Opportunities() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/opportunities');
      const data = res.data ?? [];
      setOpportunities(data.length > 0 ? data : MOCK_OPPORTUNITIES);
      setError(null);
    } catch {
      setOpportunities(MOCK_OPPORTUNITIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#1a1a2e" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Opportunities</Text>
        <Text style={styles.subheading}>Curated for your goals in Edmonton</Text>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <FlatList
        data={opportunities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OpportunityCard item={item} />}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No opportunities found yet. Check back soon.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  heading: { fontSize: 24, fontWeight: '800', color: '#1a1a2e' },
  subheading: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 8 },
  card: { borderRadius: 16, padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  location: { fontSize: 12, color: '#888' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 14 },
  actionBtn: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  actionText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#999', fontSize: 14 },
  errorText: { color: '#c0392b', padding: 16 },
});
