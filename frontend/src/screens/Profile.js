import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, ActivityIndicator, Alert, Platform,
} from 'react-native';
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
  save_more:       'Save More 🏦',
  make_more:       'Make More 💰',
  learn_investing: 'Learn Investing 📈',
};

const INTEREST_LABEL = {
  investing:   'Investing 📊',
  side_income: 'Side Income 🚀',
  networking:  'Networking 🤝',
  saving:      'Saving 💡',
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
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    confirmSignOut(async () => {
      setSigningOut(true);
      try { await signOut(); } finally { setSigningOut(false); }
    });
  };

  const interests = (preferences?.interests ?? [])
    .map((k) => INTEREST_LABEL[k] ?? k)
    .join(', ');

  const initial = profile?.displayName?.[0]?.toUpperCase() ?? '?';

  return (
    <ScrollView style={[styles.container, WEB_GRADIENT]} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.hero, !IS_WEB && { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.displayName}>{profile?.displayName ?? 'User'}</Text>
        <Text style={styles.email}>{profile?.email ?? ''}</Text>
      </View>

      <View style={styles.contentArea}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Profile</Text>
          <Row label="Goal"      value={GOAL_LABEL[preferences?.goal] ?? preferences?.goal} />
          <Row label="Interests" value={interests || 'None selected'} />
          <Row label="Location"  value={preferences?.location ?? profile?.location} />
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
              trackColor={{ true: '#0a9165' }}
              disabled
            />
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
          {signingOut
            ? <ActivityIndicator color="#EF4444" />
            : <Text style={styles.signOutText}>Sign Out</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  avatarText:  { color: '#fff', fontSize: 30, fontWeight: '800' },
  displayName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  email:       { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

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
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ECE8DC' },
  rowLabel:     { fontSize: 15, color: '#333', flex: 1 },
  rowValue:     { fontSize: 15, color: '#555', flex: 1, textAlign: 'right' },
  comingSoon:   { fontSize: 14, color: '#aaa', fontStyle: 'italic' },

  signOutBtn:  { marginTop: 4, padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center' },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});
