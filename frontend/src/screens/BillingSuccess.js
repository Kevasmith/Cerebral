import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useBillingStore from '../store/billingStore';

const IS_WEB = Platform.OS === 'web';

export default function BillingSuccess({ navigation }) {
  const insets = useSafeAreaInsets();
  const fetch = useBillingStore((s) => s.fetch);

  // Refresh plan state so the app reflects the new subscription immediately
  useEffect(() => { fetch(); }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <View style={styles.iconRing}>
        <Ionicons name="checkmark-circle" size={72} color="#0a9165" />
      </View>

      <Text style={[styles.title, IS_WEB && { fontFamily: 'Geist' }]}>
        You're all set!
      </Text>
      <Text style={styles.sub}>
        Your subscription is now active. Welcome to your upgraded Cerebral experience.
      </Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation?.navigate?.('Main')}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>Start exploring</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconRing: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(10,145,101,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1, borderColor: 'rgba(10,145,101,0.3)',
  },
  title: {
    fontSize: 34, fontWeight: '900',
    color: '#fff', marginBottom: 14,
    textAlign: 'center', letterSpacing: -0.5,
  },
  sub: {
    fontSize: 15, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', lineHeight: 23,
    marginBottom: 44, maxWidth: 320,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0a9165',
    borderRadius: 14, paddingVertical: 15, paddingHorizontal: 32,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
