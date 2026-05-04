import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';
import {
  initPurchases, getOfferings, purchasePackage,
  restorePurchases, isNativePurchasesAvailable,
} from '../utils/purchases';

const IS_WEB    = Platform.OS === 'web';
const IS_NATIVE = !IS_WEB;

const C = {
  bg:         '#080E14',
  card:       '#0D1520',
  cardHi:     '#111C2A',
  teal:       '#10C896',
  tealDim:    'rgba(16,200,150,0.12)',
  tealBorder: 'rgba(16,200,150,0.30)',
  gold:       '#F5C842',
  goldDim:    'rgba(245,200,66,0.12)',
  goldBorder: 'rgba(245,200,66,0.35)',
  white:      '#FFFFFF',
  muted:      'rgba(255,255,255,0.55)',
  faint:      'rgba(255,255,255,0.25)',
  border:     'rgba(255,255,255,0.07)',
  red:        '#EF4444',
};

const PLANS = [
  {
    key: 'growth',
    rcIdentifier: 'growth_monthly',
    name: 'Growth',
    price: '$9',
    period: '/month',
    tagline: 'For the financially aware',
    color: C.teal,
    dim: C.tealDim,
    border: C.tealBorder,
    features: [
      'Unlimited connected accounts',
      'Cerebral AI assistant',
      'Advanced spending insights',
      'Priority alerts & notifications',
    ],
  },
  {
    key: 'pro',
    rcIdentifier: 'pro_monthly',
    name: 'Pro',
    price: '$19',
    period: '/month',
    tagline: 'For the financially ambitious',
    color: C.gold,
    dim: C.goldDim,
    border: C.goldBorder,
    popular: true,
    features: [
      'Everything in Growth',
      'Predictive cash flow insights',
      'Premium AI recommendations',
      'Priority customer support',
    ],
  },
];

function PlanCard({ plan, rcPackage, loading, onSelect }) {
  const displayPrice = rcPackage ? rcPackage.product.priceString : plan.price;

  return (
    <View style={[s.card, plan.popular && { borderColor: plan.border, backgroundColor: C.cardHi }]}>
      {plan.popular && (
        <View style={[s.popularBadge, { backgroundColor: plan.dim, borderColor: plan.border }]}>
          <Ionicons name="flash" size={11} color={plan.color} />
          <Text style={[s.popularText, { color: plan.color }]}>Most Popular</Text>
        </View>
      )}

      <View style={s.cardHeader}>
        <View>
          <Text style={[s.planName, { color: plan.color }]}>{plan.name}</Text>
          <Text style={s.planTagline}>{plan.tagline}</Text>
        </View>
        <View style={s.priceWrap}>
          <Text style={[s.price, { color: plan.color }]}>{displayPrice}</Text>
          <Text style={s.period}>/mo</Text>
        </View>
      </View>

      <View style={s.featureList}>
        {plan.features.map((f) => (
          <View key={f} style={s.featureRow}>
            <Ionicons name="checkmark" size={14} color={plan.color} style={s.featureIcon} />
            <Text style={s.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[s.selectBtn, { backgroundColor: plan.color }]}
        onPress={() => onSelect(plan, rcPackage)}
        disabled={loading === plan.key}
        activeOpacity={0.82}
      >
        {loading === plan.key
          ? <ActivityIndicator color={C.bg} />
          : <Text style={s.selectBtnText}>Get {plan.name}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

export default function Upgrade({ navigation }) {
  const [loading,    setLoading]    = useState(null);
  const [restoring,  setRestoring]  = useState(false);
  const [error,      setError]      = useState('');
  const [rcOffering, setRcOffering] = useState(null);
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!IS_NATIVE || !isNativePurchasesAvailable()) return;
    initPurchases(profile?.betterAuthId)
      .then(getOfferings)
      .then((offering) => setRcOffering(offering))
      .catch(() => {});
  }, []);

  const getRcPackage = (plan) => {
    if (!rcOffering) return null;
    return rcOffering.availablePackages?.find(
      (p) => p.identifier === plan.rcIdentifier || p.identifier === plan.key
    ) ?? null;
  };

  const handleSelect = async (plan, rcPackage) => {
    setError('');
    setLoading(plan.key);
    try {
      if (IS_NATIVE && isNativePurchasesAvailable() && rcPackage) {
        await purchasePackage(rcPackage);
        if (Platform.OS === 'ios') {
          Alert.alert('Success', `You're now on the ${plan.name} plan!`, [
            { text: 'Done', onPress: () => navigation?.goBack?.() },
          ]);
        }
      } else {
        const origin = typeof window !== 'undefined'
          ? window.location.origin
          : 'https://cerebral-production.up.railway.app';

        const res = await api.post('/billing/checkout', {
          plan: plan.key,
          successUrl: `${origin}/billing-success`,
          cancelUrl:  `${origin}/upgrade`,
        });

        const url = res.data?.url;
        if (!url) throw new Error('No checkout URL returned');
        IS_WEB ? (window.location.href = url) : await Linking.openURL(url);
      }
    } catch (e) {
      if (e?.code !== 'PURCHASE_CANCELLED') {
        setError(e?.message || 'Could not complete purchase. Try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    if (!IS_NATIVE || !isNativePurchasesAvailable()) {
      setError('Restore purchases is only available on iOS and Android.');
      return;
    }
    setRestoring(true);
    setError('');
    try {
      const info = await restorePurchases();
      const hasActive = Object.keys(info.entitlements?.active ?? {}).length > 0;
      Alert.alert(
        hasActive ? 'Purchases Restored' : 'Nothing to Restore',
        hasActive
          ? 'Your previous subscription has been restored.'
          : 'No active subscription found for this Apple ID.',
      );
    } catch {
      setError('Could not restore purchases. Try again.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation?.goBack?.()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, IS_WEB && { fontFamily: 'Geist' }]}>Choose Your Plan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeText}>C</Text>
          </View>
          <Text style={[s.heroTitle, IS_WEB && { fontFamily: 'Geist' }]}>
            Unlock Cerebral Intelligence
          </Text>
          <Text style={s.heroSub}>
            AI-powered financial clarity — not just a budgeting app.
          </Text>
        </View>

        {/* Error */}
        {!!error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color={C.red} style={{ marginRight: 6 }} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Plan cards */}
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            rcPackage={getRcPackage(plan)}
            loading={loading}
            onSelect={handleSelect}
          />
        ))}

        {/* Restore purchases */}
        <TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={restoring}>
          {restoring
            ? <ActivityIndicator size="small" color={C.muted} />
            : <Text style={s.restoreText}>Restore Purchases</Text>
          }
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          Cancel anytime · Secure payment via Stripe / Apple · No hidden fees
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.white },

  hero: { alignItems: 'center', paddingVertical: 28 },
  heroBadge: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      web:     { boxShadow: '0 0 20px 4px rgba(16,200,150,0.2)' },
      default: { shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 14 },
    }),
  },
  heroBadgeText: { fontSize: 24, fontWeight: '900', color: C.teal },
  heroTitle:     { fontSize: 22, fontWeight: '900', color: C.white, textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  heroSub:       { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: { color: C.red, fontSize: 13, flex: 1 },

  card: {
    backgroundColor: C.card,
    borderRadius: 20, padding: 20,
    marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
  },
  popularBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 999, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 14,
  },
  popularText:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  planName:     { fontSize: 20, fontWeight: '900', letterSpacing: -0.2 },
  planTagline:  { fontSize: 12, color: C.muted, marginTop: 3 },
  priceWrap:    { alignItems: 'flex-end' },
  price:        { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  period:       { fontSize: 12, color: C.faint, marginTop: 2 },

  featureList: { marginBottom: 20, gap: 10 },
  featureRow:  { flexDirection: 'row', alignItems: 'center' },
  featureIcon: { marginRight: 10 },
  featureText: { fontSize: 14, color: C.white, fontWeight: '500', lineHeight: 19 },

  selectBtn:     { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  selectBtnText: { color: C.bg, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },

  restoreBtn:  { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  restoreText: { fontSize: 13, color: C.faint, fontWeight: '500' },

  disclaimer: {
    fontSize: 11, color: 'rgba(255,255,255,0.18)',
    textAlign: 'center', lineHeight: 18,
    marginTop: 4, marginBottom: 8, fontStyle: 'italic',
  },
});
