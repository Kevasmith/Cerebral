import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, ActivityIndicator, Alert, Platform, TextInput, Modal, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../store/authStore';

const IS_WEB = Platform.OS === 'web';
const WEB_GRADIENT = IS_WEB
  ? { backgroundImage: 'linear-gradient(145deg, #0F172A 0%, #0b2018 40%, #085c3a 75%, #0a9165 100%)' }
  : {};

function confirmSignOut(onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm('Are you sure you want to sign out?')) onConfirm();
  } else {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

const GOAL_LABEL = {
  save_more:       'Save More',
  make_more:       'Make More',
  learn_investing: 'Learn Investing',
};

const INTEREST_LABEL = {
  investing:   'Investing',
  side_income: 'Side Income',
  networking:  'Networking',
  saving:      'Saving',
};

function Row({ label, value, onPress, rightEl }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.6 : 1}>
      <Text style={styles.rowLabel}>{label}</Text>
      {rightEl ?? <Text style={styles.rowValue}>{value || '—'}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={14} color="#ccc" style={{ marginLeft: 4 }} />}
    </TouchableOpacity>
  );
}

function EditNameModal({ visible, current, onSave, onClose }) {
  const [name, setName] = useState(current ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(name.trim()); onClose(); }
    catch { /* silently ignore */ }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit Display Name</Text>
          <TextInput
            style={[styles.modalInput, IS_WEB && { outlineStyle: 'none' }]}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            placeholder="Your name"
            placeholderTextColor="#aaa"
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSaveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function confirmDeleteAccount(onConfirm) {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(
      'Delete your account? This permanently removes all your data and cannot be undone.'
    );
    if (confirmed) onConfirm();
  } else {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: onConfirm },
      ]
    );
  }
}

export default function Profile({ navigation }) {
  const { profile, preferences, signOut, updateDisplayName, updateNotifications, deleteAccount } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [togglingNotif, setTogglingNotif] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    confirmSignOut(async () => {
      setSigningOut(true);
      try { await signOut(); } finally { setSigningOut(false); }
    });
  };

  const handleDeleteAccount = () => {
    confirmDeleteAccount(async () => {
      setDeletingAccount(true);
      try { await deleteAccount(); } finally { setDeletingAccount(false); }
    });
  };

  const handleNotifToggle = async (val) => {
    setTogglingNotif(true);
    try { await updateNotifications(val); }
    catch { /* silently ignore */ }
    finally { setTogglingNotif(false); }
  };

  const interests = (preferences?.interests ?? [])
    .map((k) => INTEREST_LABEL[k] ?? k)
    .join(', ');

  const initial = profile?.displayName?.[0]?.toUpperCase() ?? '?';
  const plan = profile?.plan ?? 'free';
  const planLabel = plan === 'pro' ? 'Pro' : plan === 'growth' ? 'Growth' : 'Free';
  const planColor = plan === 'pro' ? '#7C3AED' : plan === 'growth' ? '#0a9165' : '#8c98a8';

  return (
    <>
      <ScrollView style={[styles.container, WEB_GRADIENT]} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.displayName}>{profile?.displayName ?? 'User'}</Text>
          <Text style={styles.email}>{profile?.email ?? ''}</Text>
          <View style={[styles.planBadge, { backgroundColor: planColor + '22', borderColor: planColor + '55' }]}>
            <Text style={[styles.planBadgeText, { color: planColor }]}>{planLabel} Plan</Text>
          </View>
        </View>

        <View style={styles.contentArea}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Profile</Text>
            <Row
              label="Display Name"
              value={profile?.displayName ?? 'Set a name'}
              onPress={() => setEditNameVisible(true)}
            />
            <Row label="Goal"      value={GOAL_LABEL[preferences?.goal] ?? preferences?.goal} />
            <Row label="Interests" value={interests || 'None selected'} />
            <Row label="Location"  value={preferences?.location ?? profile?.location} />
          </View>

          {plan === 'free' && (
            <TouchableOpacity
              style={styles.upgradeCard}
              onPress={() => navigation?.navigate?.('Upgrade')}
              activeOpacity={0.85}
            >
              <View style={styles.upgradeLeft}>
                <Ionicons name="flash" size={18} color="#0a9165" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.upgradeTitle}>Upgrade to Growth</Text>
                  <Text style={styles.upgradeSub}>Unlock AI insights & priority alerts</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#0a9165" />
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Insight Alerts</Text>
              {togglingNotif
                ? <ActivityIndicator size="small" color="#0a9165" />
                : (
                  <Switch
                    value={preferences?.notificationsEnabled ?? true}
                    onValueChange={handleNotifToggle}
                    trackColor={{ true: '#0a9165', false: '#ccc' }}
                    thumbColor="#fff"
                  />
                )
              }
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <Row
              label="Contact Support"
              value="support@cerebral.app"
              onPress={() => Linking.openURL('mailto:support@cerebral.app')}
            />
            <Row
              label="Privacy Policy"
              onPress={() => Linking.openURL('https://cerebral.app/privacy')}
            />
            <Row
              label="Terms of Service"
              onPress={() => Linking.openURL('https://cerebral.app/terms')}
            />
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
            {signingOut
              ? <ActivityIndicator color="#EF4444" />
              : <Text style={styles.signOutText}>Sign Out</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} disabled={deletingAccount}>
            {deletingAccount
              ? <ActivityIndicator color="#999" />
              : <Text style={styles.deleteText}>Delete Account</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      <EditNameModal
        visible={editNameVisible}
        current={profile?.displayName}
        onSave={updateDisplayName}
        onClose={() => setEditNameVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  hero: {
    alignItems:       'center',
    paddingTop:       40,
    paddingBottom:    40,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarText:  { color: '#fff', fontSize: 30, fontWeight: '800', ...(IS_WEB && { fontFamily: 'Geist' }) },
  displayName: { fontSize: 20, fontWeight: '700', color: '#fff', ...(IS_WEB && { fontFamily: 'Geist' }) },
  email:       { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  planBadge: {
    marginTop: 10, paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  planBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  contentArea: {
    backgroundColor:      '#F4F2EC',
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingTop:           24,
    paddingHorizontal:    16,
    paddingBottom:        24,
  },

  section:      { backgroundColor: '#FBF9F4', marginBottom: 12, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ECE8DC' },
  rowLabel:     { fontSize: 15, color: '#333', flex: 1 },
  rowValue:     { fontSize: 15, color: '#555', flex: 1, textAlign: 'right' },

  upgradeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F0FDF8',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#0a916520',
    marginBottom: 12,
  },
  upgradeLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  upgradeTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  upgradeSub:   { fontSize: 12, color: '#666', marginTop: 2 },

  signOutBtn:  { marginTop: 4, padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center' },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
  deleteBtn:   { marginTop: 8, padding: 14, alignItems: 'center' },
  deleteText:  { color: '#bbb', fontSize: 13, fontWeight: '500' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#F4F2EC', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0F172A', marginBottom: 20,
  },
  modalBtns:       { flexDirection: 'row', gap: 10 },
  modalCancelBtn:  { flex: 1, padding: 13, borderRadius: 10, borderWidth: 1, borderColor: '#ECE8DC', alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
  modalSaveBtn:    { flex: 1, padding: 13, borderRadius: 10, backgroundColor: '#0F172A', alignItems: 'center' },
  modalSaveText:   { fontSize: 15, color: '#fff', fontWeight: '700' },
});
