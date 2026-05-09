import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator, Platform, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import Skeleton from '../components/Skeleton';
import { CATEGORY_KEYS, categoryMeta } from '../constants/categories';

const IS_WEB = Platform.OS === 'web';
const WEB_GRADIENT = IS_WEB
  ? { backgroundImage: 'linear-gradient(145deg, #0F172A 0%, #0b2018 40%, #085c3a 75%, #0a9165 100%)' }
  : {};

function TransactionSkeleton() {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 10, gap: 8 }} pointerEvents="none">
        {[80, 55, 100, 70, 60].map((w, i) => (
          <Skeleton key={i} width={w} height={34} borderRadius={20} />
        ))}
      </ScrollView>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={skeletonRow}>
          <View style={{ flex: 1 }}>
            <Skeleton height={15} width="72%" borderRadius={4} style={{ marginBottom: 8 }} />
            <Skeleton height={12} width="38%" borderRadius={4} />
          </View>
          <Skeleton height={15} width={56} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

const skeletonRow = { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ECE8DC' };

const CATEGORIES = ['all', ...CATEGORY_KEYS];
const PERIODS = ['Week', 'Month', 'Quarter', 'YTD', 'Custom'];
const LIMIT = 20;

function BehavioralInsight() {
  return (
    <View style={styles.aiCard}>
      <View style={styles.aiHeader}>
        <View style={styles.aiChip}>
          <Ionicons name="sparkles" size={11} color="#7C3AED" />
          <Text style={styles.aiChipText}>Cerebral Intelligence</Text>
        </View>
      </View>
      <Text style={[styles.aiTitle, IS_WEB && { fontFamily: 'Geist' }]}>
        Dining out is up <Text style={{ color: '#EF4444' }}>15%</Text> this week vs your baseline.
      </Text>
      <Text style={styles.aiBody}>
        Weekly food spend: $828 (avg $720). Slightly off your "Aggressive Savings" goal.
      </Text>
      <View style={styles.aiAction}>
        <Text style={styles.aiActionLabel}>Recommended Action</Text>
        <Text style={styles.aiActionBody}>
          Swap two planned restaurant dinners for home-prepared meals.
        </Text>
        <TouchableOpacity style={styles.aiBtn}>
          <Text style={styles.aiBtnText}>Add to Budget Plan</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.aiCaption}>· based on 7-day rolling baseline · 12 transactions</Text>
    </View>
  );
}

function TransactionItem({ item }) {
  return (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={styles.desc}>{item.description || item.merchantName || 'Transaction'}</Text>
        <Text style={styles.meta}>{categoryMeta(item.category).label} • {new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.amount, { color: item.isDebit ? '#EF4444' : '#0a9165' }]}>
        {item.isDebit ? '-' : '+'}${Math.abs(Number(item.amount)).toFixed(2)}
      </Text>
    </View>
  );
}

export default function Transactions() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const isFetching = useRef(false);
  const searchTimer = useRef(null);

  const fetchPage = useCallback(async (cat, pageNum, append = false, searchTerm = '') => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const params = { limit: LIMIT, offset: pageNum * LIMIT };
      if (cat !== 'all') params.category = cat;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await api.get('/transactions', { params });
      const data = res.data ?? {};
      const items = Array.isArray(data) ? data : (data.transactions ?? []);
      const total = data.total ?? items.length;
      if (append) {
        setTransactions((prev) => [...prev, ...items]);
      } else {
        setTransactions(items);
      }
      setHasMore((pageNum + 1) * LIMIT < total);
      setError(null);
    } catch (e) {
      if (!append) {
        setError('Could not load transactions.');
        setTransactions([]);
        setHasMore(false);
      }
    } finally {
      isFetching.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setTransactions([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    fetchPage(category, 0, false, search);
  }, [category]);

  const handleSearchChange = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setTransactions([]);
      setPage(0);
      setHasMore(true);
      setLoading(true);
      fetchPage(category, 0, false, text);
    }, 350);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchPage(category, 0, false, search);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchPage(category, nextPage, true, search);
  };

  const [period, setPeriod] = useState('Month');

  if (loading) {
    return (
      <View style={[styles.container, WEB_GRADIENT]}>
        <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
          <Text style={styles.heading}>Spending Analysis</Text>
          <Text style={styles.subheading}>Your spending history</Text>
        </View>
        <View style={styles.contentArea}>
          <TransactionSkeleton />
        </View>
      </View>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <View style={[styles.container, WEB_GRADIENT]}>
        <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
          <Text style={styles.heading}>Spending Analysis</Text>
          <Text style={styles.subheading}>Your spending history</Text>
        </View>
        <View style={[styles.contentArea, styles.center]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, WEB_GRADIENT]}>
      <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
        <Text style={styles.heading}>Spending Analysis</Text>
        <Text style={styles.subheading}>
          {new Date().toLocaleString('en-CA', { month: 'long', year: 'numeric' })}
        </Text>
      </View>
      <View style={styles.contentArea}>
        {/* Period chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodChips}
        >
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Behavioral AI insight — only when we have transactions to analyze */}
        {transactions.length > 0 && <BehavioralInsight />}

        {/* Search + category filter */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color="#aaa" style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, IS_WEB && { outlineStyle: 'none' }]}
            placeholder="Search transactions..."
            value={search}
            onChangeText={handleSearchChange}
            placeholderTextColor="#bbb"
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={16} color="#bbb" />
            </TouchableOpacity>
          )}
        </View>
        <View style={{ height: 52 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'center' }}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.catBtn, category === c && styles.catBtnActive]}
              >
                <Text style={[styles.catText, category === c && styles.catTextActive]}>
                  {c === 'all' ? 'All' : categoryMeta(c).label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={transactions}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <TransactionItem item={item} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No transactions found.</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} color="#0a9165" /> : null}
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
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  item:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FBF9F4' },
  desc:        { fontSize: 15, fontWeight: '500', color: '#0F172A' },
  meta:        { color: '#999', marginTop: 3, fontSize: 12 },
  amount:      { fontSize: 15, fontWeight: '700' },
  sep:         { height: 1, backgroundColor: '#ECE8DC', marginLeft: 16 },

  // Period chips
  periodChips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  periodChip:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FBF9F4', borderWidth: 1, borderColor: '#ECE8DC' },
  periodChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  periodChipText:   { fontSize: 12.5, fontWeight: '700', color: '#0F172A' },
  periodChipTextActive: { color: '#fff' },

  // AI behavioral insight card
  aiCard: {
    marginHorizontal: 12, marginBottom: 8, backgroundColor: '#fff', borderRadius: 20, padding: 16,
    borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.2)', overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 4,
    position: 'relative',
  },
  aiHeader: { marginBottom: 8 },
  aiChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: 20 },
  aiChipText: { fontSize: 10, fontWeight: '800', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.8 },
  aiTitle:    { fontSize: 17, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3, lineHeight: 23, marginBottom: 6 },
  aiBody:     { fontSize: 12.5, color: '#888', lineHeight: 18, marginBottom: 12 },
  aiAction:   { backgroundColor: '#F7F4EC', borderRadius: 14, padding: 12 },
  aiActionLabel: { fontSize: 10.5, fontWeight: '700', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 },
  aiActionBody:  { fontSize: 12.5, color: '#0F172A', lineHeight: 18, marginBottom: 10 },
  aiBtn:      { backgroundColor: '#0F172A', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  aiBtnText:  { fontSize: 12.5, fontWeight: '700', color: '#fff' },
  aiCaption:  { fontStyle: 'italic', fontSize: 11, fontWeight: '500', color: '#7C3AED', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(124,58,237,0.25)', borderStyle: 'dashed' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0EEE6', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 12, marginTop: 4, marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  catBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0EEE6', marginHorizontal: 4 },
  catBtnActive:  { backgroundColor: '#0F172A' },
  catText:       { color: '#555', textTransform: 'capitalize', fontSize: 13, fontWeight: '600' },
  catTextActive: { color: '#fff' },
  emptyText:   { color: '#aaa', fontSize: 14 },
  errorText:   { color: '#EF4444', marginBottom: 16, fontSize: 14 },
  retryBtn:    { backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText:   { color: '#fff', fontWeight: '600' },
});
