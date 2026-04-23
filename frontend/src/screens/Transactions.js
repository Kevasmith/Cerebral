import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { api } from '../api/client';
import Skeleton from '../components/Skeleton';

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

const skeletonRow = { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' };

const CATEGORIES = ['all', 'food', 'transport', 'entertainment', 'shopping', 'bills', 'health', 'travel', 'income', 'transfer', 'other'];
const LIMIT = 20;

function TransactionItem({ item }) {
  return (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={styles.desc}>{item.description || item.merchantName || 'Transaction'}</Text>
        <Text style={styles.meta}>{item.category} • {new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.amount, { color: item.isDebit ? '#c0392b' : '#2ecc71' }]}>
        {item.isDebit ? '-' : '+'}${Math.abs(Number(item.amount)).toFixed(2)}
      </Text>
    </View>
  );
}

export default function Transactions() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const isFetching = useRef(false);

  const fetchPage = useCallback(async (cat, pageNum, append = false) => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const params = { limit: LIMIT, offset: pageNum * LIMIT };
      if (cat !== 'all') params.category = cat;
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
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      isFetching.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // Reset and reload when category changes
  useEffect(() => {
    setTransactions([]);
    setPage(0);
    setHasMore(true);
    setLoading(true);
    fetchPage(category, 0, false);
  }, [category]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchPage(category, 0, false);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchPage(category, nextPage, true);
  };

  if (loading) return <View style={styles.container}><TransactionSkeleton /></View>;
  if (error && transactions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ height: 56 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'center' }}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.catBtn, category === c && styles.catBtnActive]}
            >
              <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
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
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} color="#1a1a2e" /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  desc: { fontSize: 15, fontWeight: '500', color: '#1a1a2e' },
  meta: { color: '#999', marginTop: 3, fontSize: 12 },
  amount: { fontSize: 15, fontWeight: '700' },
  sep: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 16 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginHorizontal: 4 },
  catBtnActive: { backgroundColor: '#1a1a2e' },
  catText: { color: '#555', textTransform: 'capitalize', fontSize: 13, fontWeight: '600' },
  catTextActive: { color: '#fff' },
  emptyText: { color: '#aaa', fontSize: 14 },
  errorText: { color: '#c0392b', marginBottom: 16, fontSize: 14 },
  retryBtn: { backgroundColor: '#1a1a2e', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
});
