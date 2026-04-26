import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { MOCK_OPPORTUNITIES } from '../data/mockData';

const IS_WEB = Platform.OS === 'web';
const WEB_GRADIENT = IS_WEB
  ? { backgroundImage: 'linear-gradient(145deg, #0F172A 0%, #0b2018 40%, #085c3a 75%, #0a9165 100%)' }
  : {};

const TYPE_CONFIG = {
  gig:                  { label: 'Gig',        color: '#e67e22', bg: '#fef9f0' },
  event:                { label: 'Event',       color: '#8e44ad', bg: '#f9f0ff' },
  side_hustle:          { label: 'Side Hustle', color: '#27ae60', bg: '#f0fff5' },
  investment_explainer: { label: 'Learn',       color: '#2980b9', bg: '#f0f8ff' },
  networking:           { label: 'Network',     color: '#EF4444', bg: '#fff5f5' },
};

const ACTION_LABEL = {
  learn_more: 'Learn More',
  attend:     'Attend',
  explore:    'Explore',
};

function OpportunityCard({ item }) {
  const cfg = TYPE_CONFIG[item.type] ?? { label: item.type, color: '#555', bg: '#f5f5f5' };

  const handleAction = () => {
    if (item.actionUrl) Linking.openURL(item.actionUrl);
  };

  return (
    <View style={[styles.card, { backgroundColor: cfg.bg }, IS_WEB && styles.cardWeb]}>
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
  const insets = useSafeAreaInsets();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opportunities, setOpportunities] = useState([]);

  const load = useCallback(async () => {
    try {
      const res  = await api.get('/opportunities');
      const data = res.data ?? [];
      setOpportunities(data.length > 0 ? data : MOCK_OPPORTUNITIES);
    } catch {
      setOpportunities(MOCK_OPPORTUNITIES);
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
    <View style={[styles.container, WEB_GRADIENT]}>
      <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
        <Text style={styles.heading}>Opportunities</Text>
        <Text style={styles.subheading}>Curated for your goals</Text>
      </View>
      <View style={styles.contentArea}>
        <FlatList
          data={opportunities}
          keyExtractor={(item) => item.id}
          numColumns={IS_WEB ? 2 : 1}
          key={IS_WEB ? 'web' : 'mobile'}
          columnWrapperStyle={IS_WEB ? styles.webColumnWrapper : null}
          renderItem={({ item }) => <OpportunityCard item={item} />}
          contentContainerStyle={IS_WEB ? styles.listContentWeb : styles.listContent}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0F172A' },
  hero:        { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  heading:     { fontSize: 24, fontWeight: '800', color: '#fff' },
  subheading:  { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  contentArea: { flex: 1, backgroundColor: '#F4F2EC', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },

  card:    { borderRadius: 16, padding: 18, marginBottom: 14 },
  cardWeb: { flex: 1, margin: 8 },

  listContent:      { padding: 16 },
  listContentWeb:   { padding: 8 },
  webColumnWrapper: { alignItems: 'stretch' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  location:   { fontSize: 12, color: '#888' },
  cardTitle:  { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  cardDesc:   { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 14 },
  actionBtn:  { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  actionText: { fontSize: 13, fontWeight: '700' },
  empty:      { alignItems: 'center', marginTop: 40 },
  emptyText:  { color: '#999', fontSize: 14 },
});
