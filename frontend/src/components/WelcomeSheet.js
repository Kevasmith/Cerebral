import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, SHADOW } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';

// Post-onboarding celebration sheet — appears once on first Snapshot visit
// after a user finishes onboarding. Mirrors the Acorns "Alex, you're doing
// it!" moment with a Cerebral spin.
export default function WelcomeSheet({ visible, name, onDismiss }) {
  const first = (name ?? '').trim().split(/\s+/)[0] || 'You';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Dismiss handle */}
          <TouchableOpacity style={s.closeBtn} onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={C.muted} />
          </TouchableOpacity>

          <View style={s.headerBadge}>
            <Ionicons name="sparkles" size={16} color={C.green} />
          </View>

          <Text style={[s.title, IS_WEB && { fontFamily: 'Geist' }]} numberOfLines={2}>
            {first}, you're in.
          </Text>
          <Text style={s.sub}>
            Cerebral is now watching your money — here's what's already wired up.
          </Text>

          <View style={s.itemList}>
            <CheckRow text="Your bank is connected and syncing." />
            <CheckRow text="Your goal and percentage split are saved." />
            <CheckRow text="Cerebral Picks are scanning for moves." />
          </View>

          <TouchableOpacity style={s.cta} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={[s.ctaText, IS_WEB && { fontFamily: 'Geist' }]}>Let's go</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function CheckRow({ text }) {
  return (
    <View style={s.row}>
      <View style={s.checkBg}>
        <Ionicons name="checkmark" size={14} color={C.textInvert} />
      </View>
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
    paddingTop: 24,
    paddingBottom: 36,
    ...SHADOW,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.cardAlt,
    zIndex: 1,
  },
  headerBadge: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: C.greenDim, borderWidth: 1, borderColor: C.greenBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, marginTop: 4,
  },
  title: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: -0.6, marginBottom: 8 },
  sub:   { fontSize: 14, color: C.soft, lineHeight: 21, marginBottom: 22 },

  itemList: { gap: 14, marginBottom: 24 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkBg: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { fontSize: 14, color: C.text, fontWeight: '600', flex: 1, lineHeight: 20 },

  cta: {
    backgroundColor: C.green,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOW,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: C.textInvert, letterSpacing: -0.2 },
});
