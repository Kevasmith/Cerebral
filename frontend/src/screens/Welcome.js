import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SHADOW } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';

// Pre-auth splash. Cream surface, ink-on-cream type, single emphasis word
// styled italic + green to substitute for the Fraunces-italic moment in the
// reference mockup. Two CTAs — Get started routes through the persona-aware
// "Aha" flow; Log in goes straight to SignIn.
export default function Welcome({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.top}>
        <Text style={[styles.logo, IS_WEB && { fontFamily: 'Geist' }]}>
          cerebral<Text style={styles.logoDot}>.</Text>
        </Text>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, IS_WEB && { fontFamily: 'Geist' }]}>FOR CANADIANS</Text>
          <Text style={[styles.headline, IS_WEB && { fontFamily: 'Geist' }]}>
            Financial{' '}
            <Text style={styles.emphasis}>awareness</Text>
            {',\n'}automated.
          </Text>
          <Text style={styles.sub}>
            Cerebral reads your accounts and surfaces what matters. No spreadsheets. No data entry. Just clarity.
          </Text>
        </View>

        <View style={styles.trustStrip}>
          <View style={styles.trustIcon}>
            <Ionicons name="shield-checkmark" size={16} color={C.textInvert} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.trustText}>
              <Text style={styles.trustStrong}>Bank-grade security.</Text>{' '}
              Read-only. We never move your money.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.ctaBlock}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation?.navigate?.('Aha')}
        >
          <Text style={[styles.primaryBtnText, IS_WEB && { fontFamily: 'Geist' }]}>Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.7}
          onPress={() => navigation?.navigate?.('SignIn', { mode: 'login' })}
        >
          <Text style={styles.secondaryBtnText}>
            Already have an account?{'  '}
            <Text style={styles.secondaryLink}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: C.bg,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  top: { flex: 1 },

  logo:    { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  logoDot: { color: C.green },

  hero: { marginTop: 56 },
  eyebrow: {
    fontSize: 11, fontWeight: '700', color: C.faint,
    letterSpacing: 1.8, marginBottom: 16,
  },
  headline: {
    fontSize: 36, fontWeight: '500', color: C.text,
    letterSpacing: -0.8, lineHeight: 42,
  },
  emphasis: {
    color: C.green, fontStyle: 'italic', fontWeight: '600',
  },
  sub: {
    fontSize: 15, color: C.soft, lineHeight: 22, marginTop: 18,
  },

  trustStrip: {
    marginTop: 30,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 14,
    backgroundColor: C.amberDim, borderRadius: 14,
  },
  trustIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.amber,
    alignItems: 'center', justifyContent: 'center',
  },
  trustText:   { fontSize: 12.5, color: C.text, lineHeight: 17 },
  trustStrong: { fontWeight: '700' },

  ctaBlock: { paddingTop: 12 },
  primaryBtn: {
    backgroundColor: C.surfaceDeep,
    borderRadius: 14, paddingVertical: 18, alignItems: 'center',
    ...SHADOW,
  },
  primaryBtnText: {
    fontSize: 15, fontWeight: '700', color: C.textInvert, letterSpacing: -0.2,
  },
  secondaryBtn: { alignItems: 'center', paddingVertical: 16 },
  secondaryBtnText: { fontSize: 13, color: C.soft },
  secondaryLink:    { color: C.text, fontWeight: '700' },
});
