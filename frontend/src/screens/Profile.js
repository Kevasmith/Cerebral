import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, ActivityIndicator, Alert, Platform,
} from 'react-native';
import useAuthStore from '../store/authStore';

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
  save_more: 'Save More 🏦',
  make_more: 'Make More 💰',
  learn_investing: 'Learn Investing 📈',
};

const INTEREST_LABEL = {
  investing: 'Investing 📊',
  side_income: 'Side Income 🚀',
  networking: 'Networking 🤝',
  saving: 'Saving 💡',
};

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

export default function Profile() {
  const { profile, preferences, signOut } = useAuthStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    confirmSignOut(async () => {
      setSigningOut(true);
      try { await signOut(); } finally { setSigningOut(false); }
    });
  };

  const interests = (preferences?.interests ?? [])
    .map((k) => INTEREST_LABEL[k] ?? k)
    .join(', ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.displayName}>{profile?.displayName ?? 'User'}</Text>
        <Text style={styles.email}>{profile?.email ?? ''}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Profile</Text>
        <Row label="Goal" value={GOAL_LABEL[preferences?.goal] ?? preferences?.goal} />
        <Row label="Interests" value={interests || 'None selected'} />
        <Row label="Location" value={preferences?.location ?? profile?.location} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Accounts</Text>
        <Text style={styles.comingSoon}>Manage connected bank accounts — coming soon</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Insight Alerts</Text>
          <Switch
            value={preferences?.notificationsEnabled ?? true}
            trackColor={{ true: '#1a1a2e' }}
            disabled
          />
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
        {signingOut
          ? <ActivityIndicator color="#e74c3c" />
          : <Text style={styles.signOutText}>Sign Out</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  avatarSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  displayName: { fontSize: 20, fontWeight: '700', color: '#1a1a2e' },
  email: { fontSize: 14, color: '#888', marginTop: 4 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowLabel: { fontSize: 15, color: '#333', flex: 1 },
  rowValue: { fontSize: 15, color: '#555', flex: 1, textAlign: 'right' },
  comingSoon: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
  signOutBtn: { margin: 16, marginTop: 8, padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#e74c3c', alignItems: 'center' },
  signOutText: { color: '#e74c3c', fontSize: 16, fontWeight: '700' },
});
