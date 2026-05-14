import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Platform, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SHADOW } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';
const { height: SH } = Dimensions.get('window');
const LOGO = require('../../assets/logo-mark.png');

// First impression — full-green hero, logo, tagline, primary CTA.
// Mirrors the Acorns "Save and invest" splash but with Cerebral's tone.
export default function Welcome({ navigation }) {
  const insets = useSafeAreaInsets();

  // Slow pulse on the logo glow so the splash feels alive.
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9,  duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      {/* Logo */}
      <View style={styles.logoBlock}>
        <View style={styles.logoRing}>
          <Animated.View style={[styles.logoGlow, { opacity: pulse }]} />
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={[styles.brand, IS_WEB && { fontFamily: 'Geist' }]}>Cerebral</Text>
      </View>

      {/* Hero copy */}
      <View style={styles.copyBlock}>
        <Text style={[styles.eyebrow, IS_WEB && { fontFamily: 'Geist' }]}>FINANCIAL AWARENESS</Text>
        <Text style={[styles.headline, IS_WEB && { fontFamily: 'Geist' }]}>
          Understand{'\n'}your money.{'\n'}Grow what{'\n'}you have.
        </Text>
        <Text style={styles.sub}>
          Cerebral watches the patterns you can't see and surfaces the moves that move the needle.
        </Text>
      </View>

      {/* CTA stack */}
      <View style={styles.ctaBlock}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation?.navigate?.('SignIn', { mode: 'signup' })}
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
            <Text style={styles.secondaryBtnLink}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.green,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },

  // ── Logo ──
  logoBlock: { alignItems: 'center', marginTop: SH < 700 ? 16 : 36 },
  logoRing: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, borderColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 0 30px 4px rgba(255,255,255,0.55)' },
      default: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  logo:  { width: 56, height: 56, tintColor: '#FFFFFF' },
  brand: { fontSize: 24, fontWeight: '900', color: C.textInvert, letterSpacing: -0.5, marginTop: 16 },

  // ── Copy ──
  copyBlock: { marginVertical: 32 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.6, marginBottom: 14 },
  headline:{
    fontSize: 38, fontWeight: '900', color: C.textInvert,
    letterSpacing: -1.0, lineHeight: 44,
    marginBottom: 18,
  },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 22 },

  // ── CTAs ──
  ctaBlock: { },
  primaryBtn: {
    backgroundColor: C.surfaceDeep,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    ...SHADOW,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: C.textInvert, letterSpacing: -0.2 },
  secondaryBtn:  { alignItems: 'center', paddingVertical: 16 },
  secondaryBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  secondaryBtnLink: { color: C.textInvert, fontWeight: '700' },
});
