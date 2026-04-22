import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
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

const CATEGORIES = [
  'all',
  'food',
  'transport',
  'entertainment',
  'shopping',
  'bills',
  'health',
  'travel',
  'income',
  'transfer',
  'other',
];

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
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(
    async ({ reset = false } = {}) => {
      try {
        if (reset) {
          setPage(0);
        }
        setLoading(true);
        const offset = (reset ? 0 : page * limit);
        const params = { limit, offset };
        if (category && category !== 'all') params.category = category;

        const res = await api.get('/transactions', { params });
        const data = res.data || {};
        const items = data.transactions || data;

        if (reset) {
          setTransactions(items);
        } else {
          setTransactions((prev) => [...prev, ...items]);
        }

        setTotal(data.total ?? items.length + (reset ? 0 : transactions.length));
      } catch (err) {
        setError(err.message || 'Failed to load transactions');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, limit, page, transactions.length],
  );

  useEffect(() => {
    // load first page when category changes
    setTransactions([]);
    setPage(0);
    fetchTransactions({ reset: true });
  }, [category]);

  useEffect(() => {
    // initial load
    fetchTransactions({ reset: true });
  }, []);

  const loadMore = () => {
    if (loading) return;
    const nextOffset = (page + 1) * limit;
    if (total && nextOffset >= total) return;
    setPage((p) => p + 1);
    // fetch for next page after state updates
  };

  // fetch when page changes (except initial 0 handled by reset)
  useEffect(() => {
    if (page === 0) return;
    fetchTransactions();
  }, [page]);

  const onRefresh = () => {
    setRefreshing(true);
    setTransactions([]);
    setPage(0);
    fetchTransactions({ reset: true });
  };

  if (loading && transactions.length === 0) return <View style={styles.container}><TransactionSkeleton /></View>;
  if (error && transactions.length === 0) return <View style={styles.center}><Text>{error}</Text></View>;

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
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListFooterComponent={() => (
          loading && transactions.length > 0 ? <ActivityIndicator style={{ margin: 12 }} /> : null
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  desc: { fontSize: 16, fontWeight: '500' },
  meta: { color: '#666', marginTop: 4 },
  amount: { fontSize: 16, fontWeight: '700' },
  sep: { height: 1, backgroundColor: '#eee' },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f2f2f2', marginHorizontal: 6 },
  catBtnActive: { backgroundColor: '#007bff' },
  catText: { color: '#333', textTransform: 'capitalize' },
  catTextActive: { color: '#fff' },
});
