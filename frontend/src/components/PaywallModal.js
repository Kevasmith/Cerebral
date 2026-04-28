import React from 'react';
import {
  Modal, View, Text, StyleSheet,
  TouchableOpacity, TouchableWithoutFeedback, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const IS_WEB = Platform.OS === 'web';

/**
 * Usage:
 *   const [paywallVisible, setPaywallVisible] = useState(false);
 *   <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} navigation={navigation} feature="AI chat" />
 *
 * To gate a feature:
 *   const { isPaid } = useBillingStore();
 *   if (!isPaid()) { setPaywallVisible(true); return; }
 */
export default function PaywallModal({ visible, onClose, navigation, feature = 'this feature' }) {
  const featureLabel = feature.charAt(0).toUpperCase() + feature.slice(1);

  const handleUpgrade = () => {
    onClose();
    navigation?.navigate?.('Upgrade');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.iconWrap}>
          <Ionicons name="flash" size={28} color="#0a9165" />
        </View>

        <Text style={[styles.title, IS_WEB && { fontFamily: 'Geist' }]}>
          Upgrade to unlock
        </Text>
        <Text style={styles.sub}>
          {`${featureLabel} is available on the Growth and Pro plans. Upgrade to get unlimited AI insights, advanced analytics, and more.`}
        </Text>

        <View style={styles.planRow}>
          {[
            { label: 'Growth', price: '$9/mo', color: '#0a9165' },
            { label: 'Pro',    price: '$19/mo', color: '#7C3AED' },
          ].map((p) => (
            <View key={p.label} style={[styles.planChip, { borderColor: p.color + '44' }]}>
              <Text style={[styles.planChipName, { color: p.color }]}>{p.label}</Text>
              <Text style={styles.planChipPrice}>{p.price}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleUpgrade} activeOpacity={0.85}>
          <Text style={styles.btnText}>See plans</Text>
          <Ionicons name="arrow-forward" size={15} color="#fff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 28, paddingBottom: 44,
    alignItems: 'center',
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2, marginBottom: 24,
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: 'rgba(10,145,101,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1, borderColor: 'rgba(10,145,101,0.28)',
  },
  title: {
    fontSize: 22, fontWeight: '800', color: '#fff',
    marginBottom: 10, textAlign: 'center',
  },
  sub: {
    fontSize: 14, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', lineHeight: 21,
    marginBottom: 24, maxWidth: 300,
  },
  planRow: {
    flexDirection: 'row', gap: 10, marginBottom: 24,
  },
  planChip: {
    flex: 1, alignItems: 'center',
    paddingVertical: 12, borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  planChipName:  { fontSize: 14, fontWeight: '800' },
  planChipPrice: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  btn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0a9165',
    borderRadius: 14, paddingVertical: 14,
    width: '100%', justifyContent: 'center',
    marginBottom: 12,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cancelBtn: { paddingVertical: 10 },
  cancelText: { color: 'rgba(255,255,255,0.35)', fontSize: 14 },
});
