import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, Platform } from 'react-native';

const TEAL        = '#10C896';
const TEAL_BORDER = 'rgba(16,200,150,0.35)';

const LOGO = require('../../assets/logo-mark.png');

export default function CerebralAvatar() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.wrap}>
      <Animated.View style={[s.glow, { opacity: pulse }]} />
      <View style={s.avatar}>
        <Image source={LOGO} style={s.logo} resizeMode="contain" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: TEAL,
    ...Platform.select({
      web: { boxShadow: `0 0 14px 3px ${TEAL}` },
      default: {
        shadowColor: TEAL,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TEAL_BORDER,
  },
  logo: {
    width: 34,
    height: 34,
  },
});
