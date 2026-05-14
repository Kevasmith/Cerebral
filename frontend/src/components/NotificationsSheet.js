import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, SHADOW } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';

// Pretty in-app explainer for push notifications. Shown BEFORE the OS-level
// permission prompt so the user sees value before being asked — improves
// opt-in rates and matches the Acorns onboarding flow.
export default function NotificationsSheet({ visible, onEnable, onSkip }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.iconWrap}>
            <Ionicons name="notifications" size={28} color={C.green} />
          </View>

          <Text style={[s.title, IS_WEB && { fontFamily: 'Geist' }]}>Stay in the loop</Text>
          <Text style={s.sub}>
            Cerebral can ping you when something matters — a forecast dip, a
            higher-yield move, or a goal milestone. No spam, just signal.
          </Text>

          <View style={s.bullets}>
            <Bullet icon="trending-down-outline" text="Heads-up before a low-balance week" />
            <Bullet icon="wallet-outline"        text="When idle cash could be earning more" />
            <Bullet icon="flag-outline"          text="When you hit a goal milestone" />
          </View>

          <TouchableOpacity style={s.enable} onPress={onEnable} activeOpacity={0.85}>
            <Text style={[s.enableText, IS_WEB && { fontFamily: 'Geist' }]}>Enable notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.skip} onPress={onSkip}>
            <Text style={s.skipText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Bullet({ icon, text }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={16} color={C.green} />
      <Text style={s.rowText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.40)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    alignItems: 'center',
    ...SHADOW,
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: C.greenDim, borderWidth: 1, borderColor: C.greenBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.4, marginBottom: 8, textAlign: 'center' },
  sub:   { fontSize: 13.5, color: C.soft, lineHeight: 20, textAlign: 'center', marginBottom: 20, paddingHorizontal: 8 },

  bullets:  { alignSelf: 'stretch', gap: 12, marginBottom: 22 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText:  { fontSize: 13.5, color: C.text, flex: 1 },

  enable: {
    alignSelf: 'stretch',
    backgroundColor: C.green,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOW,
  },
  enableText: { fontSize: 16, fontWeight: '800', color: C.textInvert, letterSpacing: -0.2 },
  skip:       { paddingVertical: 14, alignItems: 'center' },
  skipText:   { fontSize: 14, color: C.muted, fontWeight: '600' },
});
