import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { name: 'Snapshot', label: 'Snapshot', icon: 'pulse',       iconOut: 'pulse-outline'       },
  { name: 'Spending', label: 'Spending', icon: 'card',        iconOut: 'card-outline'        },
  { name: 'Savings',  label: 'Savings',  icon: 'trending-up', iconOut: 'trending-up-outline' },
  { name: 'Accounts', label: 'Accounts', icon: 'person',      iconOut: 'person-outline'      },
];

export default function WebTopNav({ state, navigation }) {
  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="analytics-outline" size={13} color="#fff" />
          </View>
          <Text style={styles.logo}>Cerebral</Text>
        </View>

        <View style={styles.tabs}>
          {TABS.map((tab, index) => {
            const active = state.index === index;
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => navigation.navigate(tab.name)}
                style={[styles.tab, active && styles.tabActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={active ? tab.icon : tab.iconOut}
                  size={15}
                  color={active ? '#10C896' : 'rgba(255,255,255,0.45)'}
                />
                <Text style={[styles.label, active && styles.labelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#080E14',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 28,
    height: 58,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(16,200,150,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16,200,150,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  tabs: { flexDirection: 'row', gap: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabActive: { backgroundColor: 'rgba(16,200,150,0.1)', borderWidth: 1, borderColor: 'rgba(16,200,150,0.2)' },
  label:       { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  labelActive: { color: '#10C896' },
});
