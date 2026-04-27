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

const IS_WEB = Platform.OS === 'web';
const IS_NATIVE = !IS_WEB;

const WEB_GRADIENT = IS_WEB
  ? { backgroundImage: 'linear-gradient(145deg, #0F172A 0%, #0b2018 40%, #085c3a 75%, #0a9165 100%)' }
  : {};

const PLANS = [
  {
    key: 'growth',
    rcIdentifier: 'growth_monthly',
    name: 'Growth',
    price: '$9',
    period: '/month',
    color: '#0a9165',
    tagline: 'For the financially aware',
    features: [
      'Unlimited connected accounts',
      'AI assistant (Cerebral AI)',
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
    color: '#7C3AED',
    tagline: 'For the financially ambitious',
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
  const displayPrice = rcPackage
    ? rcPackage.product.priceString
    : plan.price;

  return (
    <View style={[styles.card, plan.popular && styles.cardPopular, { borderColor: plan.color + '44' }]}>
      {plan.popular && (
        <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planTagline}>{plan.tagline}</Text>
        </View>
        <View style={styles.priceWrap}>
          <Text style={[styles.price, { color: plan.color }]}>{displayPrice}</Text>
          <Text style={styles.period}>/month</Text>
        </View>
      </View>

      <View style={styles.featureList}>
        {plan.features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={plan.color} style={{ marginRight: 8 }} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.selectBtn, { backgroundColor: plan.color }]}
        onPress={() => onSelect(plan, rcPackage)}
        disabled={loading === plan.key}
        activeOpacity={0.8}
      >
        {loading === plan.key
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.selectBtnText}>Get {plan.name}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

export default function Upgrade({ navigation }) {
  const [loading, setLoading] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
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
        // Native: use Apple IAP via RevenueCat
        await purchasePackage(rcPackage);
        if (Platform.OS === 'ios') {
          Alert.alert('Success', `You're now on the ${plan.name} plan!`, [
            { text: 'Done', onPress: () => navigation?.goBack?.() },
          ]);
        }
      } else {
        // Web or RC not configured: use Stripe checkout
        const origin = typeof window !== 'undefined'
          ? window.location.origin
          : 'https://cerebral-production.up.railway.app';

        const res = await api.post('/billing/checkout', {
          plan: plan.key,
          successUrl: `${origin}/billing-success`,
          cancelUrl: `${origin}/upgrade`,
        });

        const url = res.data?.url;
        if (!url) throw new Error('No checkout URL returned');
        IS_WEB ? (window.location.href = url) : await Linking.openURL(url);
      }
    } catch (e) {
      if (e?.code === 'PURCHASE_CANCELLED') {
        // User cancelled — don't show error
      } else {
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
    <ScrollView style={[styles.container, WEB_GRADIENT]} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
        {navigation && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}
        <View style={styles.badgeRow}>
          <Ionicons name="flash" size={14} color="#0a9165" />
          <Text style={styles.badgeText}>Upgrade Cerebral</Text>
        </View>
        <Text style={styles.heroTitle}>Level up your{'\n'}financial clarity</Text>
        <Text style={styles.heroSub}>
          Get AI-powered insights, smart alerts, and personalized recommendations that actually move the needle.
        </Text>
      </View>

      <View style={styles.contentArea}>
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {PLANS.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            rcPackage={getRcPackage(plan)}
            loading={loading}
            onSelect={handleSelect}
          />
        ))}

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
          {restoring
            ? <ActivityIndicator size="small" color="#888" />
            : <Text style={styles.restoreText}>Restore Purchases</Text>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Subscription auto-renews monthly. Cancel anytime in Settings → Subscriptions. By subscribing you agree to our Terms of Service and Privacy Policy. Secure payments via Apple.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  hero: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
  },
  backBtn: {
    marginBottom: 16,
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(10,145,101,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(10,145,101,0.3)',
  },
  badgeText:  { fontSize: 12, fontWeight: '700', color: '#0a9165' },
  heroTitle:  { fontSize: 30, fontWeight: '900', color: '#fff', lineHeight: 36, marginBottom: 12 },
  heroSub:    { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 21 },

  contentArea: {
    backgroundColor:      '#F4F2EC',
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingTop:           24,
    paddingHorizontal:    16,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: '#EF4444', fontSize: 13, flex: 1 },

  card: {
    backgroundColor: '#FBF9F4',
    borderRadius: 20, padding: 20,
    marginBottom: 16,
    borderWidth: 1.5, borderColor: '#ECE8DC',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  cardPopular: { borderWidth: 2, shadowOpacity: 0.12 },
  popularBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 14,
  },
  popularText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16,
  },
  planName:    { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  planTagline: { fontSize: 12, color: '#888', marginTop: 2 },
  priceWrap:   { alignItems: 'flex-end' },
  price:       { fontSize: 28, fontWeight: '900' },
  period:      { fontSize: 12, color: '#888', marginTop: 2 },

  featureList: { marginBottom: 20 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureText: { fontSize: 14, color: '#333', flex: 1 },

  selectBtn: {
    borderRadius: 13, paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  selectBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  restoreBtn: {
    alignItems: 'center', paddingVertical: 14, marginTop: 4,
  },
  restoreText: { fontSize: 14, color: '#888', fontWeight: '500' },

  disclaimer: {
    fontSize: 11, color: '#aaa', textAlign: 'center',
    lineHeight: 16, marginTop: 4, marginBottom: 8,
    paddingHorizontal: 8,
  },
});
