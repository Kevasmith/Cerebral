import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Alert, Platform, TextInput,
  Modal, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import useBillingStore from '../store/billingStore';
import { C, SHADOW, SHADOW_SOFT } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';

function memberSince(profile) {
  if (!profile?.createdAt) return null;
  return new Date(profile.createdAt).getFullYear();
}

function confirmAction(title, message, destructiveLabel, onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: destructiveLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }
}

// ─── Edit name modal ──────────────────────────────────────────────────────────
function EditNameModal({ visible, current, onSave, onClose }) {
  const [name, setName] = useState(current ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave(name.trim()); onClose(); }
    catch {}
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={[styles.modalTitle, IS_WEB && { fontFamily: 'Geist' }]}>Edit Display Name</Text>
          <TextInput
            style={[styles.modalInput, IS_WEB && { outlineStyle: 'none' }]}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            placeholder="Your name"
            placeholderTextColor={C.faint}
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator color={C.textInvert} size="small" />
                : <Text style={[styles.modalSaveText, IS_WEB && { fontFamily: 'Geist' }]}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────
function SettingsRow({ icon, iconBg, iconColor, label, sublabel, onPress, rightEl, danger, isLast }) {
  return (
    <TouchableOpacity
      style={[styles.settingsRow, !isLast && styles.settingsRowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg ?? C.cardAlt }]}>
        <Ionicons name={icon} size={18} color={danger ? C.red : (iconColor ?? C.text)} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, danger && { color: C.red }, IS_WEB && { fontFamily: 'Geist' }]}>
          {label}
        </Text>
        {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
      </View>
      {rightEl ?? (
        <Ionicons name="chevron-forward" size={16} color={danger ? C.red : C.faint} />
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Settings({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile, preferences, signOut, updateDisplayName, updateNotifications, deleteAccount } = useAuthStore();

  const { plan, fetch: fetchBilling } = useBillingStore();

  const [editNameVisible, setEditNameVisible] = useState(false);
  const [signingOut, setSigningOut]           = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [togglingNotif, setTogglingNotif]     = useState(false);

  useEffect(() => { fetchBilling(); }, []);

  const initial  = profile?.displayName?.[0]?.toUpperCase() ?? 'C';
  const sinceYear = memberSince(profile);
  const notifOn  = preferences?.notificationsEnabled ?? true;

  const handleSignOut = () => {
    confirmAction(
      'Secure Logout',
      'Are you sure you want to sign out of Cerebral?',
      'Sign Out',
      async () => {
        setSigningOut(true);
        try { await signOut(); } finally { setSigningOut(false); }
      },
    );
  };

  const handleDeleteAccount = () => {
    confirmAction(
      'Delete Account',
      'This permanently removes all your data and cannot be undone.',
      'Delete Forever',
      async () => {
        setDeletingAccount(true);
        try { await deleteAccount(); } finally { setDeletingAccount(false); }
      },
    );
  };

  const handleNotifToggle = async (val) => {
    setTogglingNotif(true);
    try { await updateNotifications(val); }
    catch {}
    finally { setTogglingNotif(false); }
  };

  return (
    <>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, IS_WEB && { fontFamily: 'Geist' }]}>Account Settings</Text>
          <TouchableOpacity style={styles.helpBtn} activeOpacity={0.7}
            onPress={() => Linking.openURL('mailto:support@cerebral.app')}
          >
            <View style={styles.helpCircle}>
              <Text style={styles.helpText}>?</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile hero card ─────────────────────────────────────────── */}
          <View style={styles.heroCard}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                <Text style={[styles.avatarText, IS_WEB && { fontFamily: 'Geist' }]}>{initial}</Text>
              </View>
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={9} color={C.textInvert} />
              </View>
            </View>
            <Text style={[styles.heroName, IS_WEB && { fontFamily: 'Geist' }]}>
              {profile?.displayName ?? 'User'}
            </Text>
            {sinceYear && (
              <Text style={styles.heroSince}>Member since {sinceYear}</Text>
            )}
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => setEditNameVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.editProfileText, IS_WEB && { fontFamily: 'Geist' }]}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* ── Your Plan ────────────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, IS_WEB && { fontFamily: 'Geist' }]}>Your Plan</Text>
          <View style={styles.planCard}>
            <View style={styles.planLeft}>
              <View style={[
                styles.planBadge,
                plan === 'pro'    && { backgroundColor: C.amberDim },
                plan === 'growth' && { backgroundColor: C.tealDim },
                plan === 'free'   && { backgroundColor: C.cardAlt },
              ]}>
                <Text style={[
                  styles.planBadgeText,
                  plan === 'pro'    && { color: C.amber },
                  plan === 'growth' && { color: C.teal },
                  plan === 'free'   && { color: C.muted },
                ]}>
                  {plan === 'free' ? 'Free' : plan === 'growth' ? 'Growth' : 'Pro'}
                </Text>
              </View>
              <View>
                <Text style={styles.planName}>
                  {plan === 'free'   ? 'Free Plan' :
                   plan === 'growth' ? 'Growth Plan' : 'Pro Plan'}
                </Text>
                <Text style={styles.planSub}>
                  {plan === 'free' ? 'Upgrade to unlock AI features' : 'Active subscription'}
                </Text>
              </View>
            </View>
            {plan === 'free' ? (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => navigation?.navigate?.('Upgrade')}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => navigation?.navigate?.('Upgrade')}
                activeOpacity={0.85}
              >
                <Text style={styles.manageBtnText}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── General Settings ─────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, IS_WEB && { fontFamily: 'Geist' }]}>General Settings</Text>

          <View style={styles.settingsCard}>
            <SettingsRow
              icon="shield-checkmark-outline"
              iconBg={C.tealDim}
              iconColor={C.teal}
              label="Security & Privacy"
              sublabel="Biometrics, 2FA, Session Management"
              onPress={() => Alert.alert('Security & Privacy', 'Coming soon.')}
            />
            <SettingsRow
              icon="notifications-outline"
              iconBg={C.violetDim}
              iconColor={C.violet}
              label="Smart Notifications"
              sublabel="Transaction alerts, AI market insights"
              rightEl={
                <View style={styles.toggleRow}>
                  {togglingNotif
                    ? <ActivityIndicator size="small" color={C.teal} />
                    : (
                      <Switch
                        value={notifOn}
                        onValueChange={handleNotifToggle}
                        trackColor={{ true: C.teal, false: C.track }}
                        thumbColor={C.white}
                        ios_backgroundColor={C.track}
                      />
                    )
                  }
                </View>
              }
            />
            <SettingsRow
              icon="lock-closed-outline"
              iconBg={C.cardAlt}
              label="Data Privacy & Sharing"
              sublabel="Manage how your data trains Cerebral AI"
              onPress={() => Linking.openURL('https://cerebral.app/privacy')}
            />
            <SettingsRow
              icon="headset-outline"
              iconBg={C.amberDim}
              iconColor={C.amber}
              label="Elite Concierge Support"
              sublabel="24/7 Priority access to human advisors"
              onPress={() => Linking.openURL('mailto:support@cerebral.app')}
            />
            <SettingsRow
              icon="trash-outline"
              iconBg={C.redDim}
              label="Delete Account"
              sublabel="Permanently remove your data and access"
              onPress={handleDeleteAccount}
              danger
              isLast
            />
          </View>

          {/* ── Secure logout — black pill ─────────────────────────────── */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.85}
          >
            {signingOut ? (
              <ActivityIndicator color={C.textInvert} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color={C.textInvert} style={{ marginRight: 10 }} />
                <Text style={[styles.logoutText, IS_WEB && { fontFamily: 'Geist' }]}>Secure Logout</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <Text style={styles.footer}>
            CEREBRAL FINANCIAL INTELLIGENCE V4.2.0{'  '}•{'  '}ISO 27001 CERTIFIED
          </Text>
        </ScrollView>
      </View>

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
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.cardAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  helpBtn: { padding: 2 },
  helpCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.cardAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  helpText: { fontSize: 15, fontWeight: '700', color: C.muted },

  // Hero card
  heroCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20,
    marginTop: 18, marginBottom: 24,
    ...SHADOW,
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2.5, borderColor: C.teal,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18, position: 'relative',
  },
  avatarInner: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: C.surfaceDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: C.teal },
  checkBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.teal,
    borderWidth: 2, borderColor: C.card,
    alignItems: 'center', justifyContent: 'center',
  },
  heroName:  { fontSize: 24, fontWeight: '900', color: C.text, marginBottom: 6, letterSpacing: -0.3 },
  heroSince: { fontSize: 13, color: C.muted, marginBottom: 20 },
  editProfileBtn: {
    backgroundColor: C.surfaceDeep,
    borderRadius: 999, paddingVertical: 12, paddingHorizontal: 36,
    ...SHADOW_SOFT,
  },
  editProfileText: { fontSize: 15, fontWeight: '700', color: C.textInvert, letterSpacing: -0.2 },

  // Section label
  sectionLabel: {
    fontSize: 18, fontWeight: '800', color: C.text,
    marginBottom: 12, letterSpacing: -0.3,
  },

  // Plan card
  planCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 24,
    ...SHADOW_SOFT,
  },
  planLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  planBadge: {
    borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  planBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  planName:      { fontSize: 14, fontWeight: '800', color: C.text },
  planSub:       { fontSize: 12, color: C.muted, marginTop: 2 },
  upgradeBtn: {
    backgroundColor: C.surfaceDeep, borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  upgradeBtnText: { fontSize: 13, fontWeight: '800', color: C.textInvert, letterSpacing: -0.2 },
  manageBtn: {
    backgroundColor: C.cardAlt, borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  manageBtnText: { fontSize: 13, fontWeight: '700', color: C.text },

  // Settings card
  settingsCard: {
    backgroundColor: C.card, borderRadius: 20,
    overflow: 'hidden', marginBottom: 24,
    ...SHADOW,
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  rowSub:   { fontSize: 12, color: C.muted, lineHeight: 17 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Logout — black pill
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surfaceDeep,
    borderRadius: 999, paddingVertical: 16,
    marginBottom: 28,
    ...SHADOW,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: C.textInvert, letterSpacing: -0.2 },

  // Footer
  footer: {
    fontSize: 10, color: C.faint, textAlign: 'center',
    letterSpacing: 0.8, lineHeight: 16,
  },

  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: C.card, borderRadius: 24, padding: 24,
    width: '100%', maxWidth: 380,
    ...SHADOW,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 16, letterSpacing: -0.2 },
  modalInput: {
    backgroundColor: C.input, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: C.text, marginBottom: 20,
  },
  modalBtns:       { flexDirection: 'row', gap: 10 },
  modalCancelBtn:  {
    flex: 1, padding: 14, borderRadius: 12,
    backgroundColor: C.cardAlt, alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, color: C.text, fontWeight: '600' },
  modalSaveBtn:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: C.surfaceDeep, alignItems: 'center' },
  modalSaveText:   { fontSize: 15, color: C.textInvert, fontWeight: '800', letterSpacing: -0.2 },
});
