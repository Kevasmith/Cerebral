import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, Platform, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from './src/api/client';
import useAuthStore from './src/store/authStore';
import useBillingStore from './src/store/billingStore';
import { registerForPushNotifications } from './src/utils/notifications';
import WebTopNav from './src/components/WebTopNav';

import SignIn from './src/screens/SignIn';
import Onboarding from './src/screens/Onboarding';
import Dashboard from './src/screens/Dashboard';
import Transactions from './src/screens/Transactions';
import Opportunities from './src/screens/Opportunities';
import Chat from './src/screens/Chat';
import Profile from './src/screens/Profile';
import Accounts from './src/screens/Accounts';
import Settings from './src/screens/Settings';
import Upgrade from './src/screens/Upgrade';
import BillingSuccess from './src/screens/BillingSuccess';
import InsightDetail from './src/screens/InsightDetail';
import ConnectBank from './src/screens/ConnectBank';
import Snapshot from './src/screens/Snapshot';
import Spending from './src/screens/Spending';
import Savings from './src/screens/Savings';
import IntelligenceHub from './src/screens/IntelligenceHub';

const WEB_MAX_WIDTH = 960;
const IS_WEB = Platform.OS === 'web';

// Wraps a screen in a centered max-width container on web only.
// Defined at module level so the reference is stable — no remounts.
function webScreen(Component, bg) {
  if (!IS_WEB) return Component;
  const Screen = (props) => (
    <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: WEB_MAX_WIDTH }}>
        <Component {...props} />
      </View>
    </View>
  );
  Screen.displayName = `Web(${Component.displayName || Component.name || 'Screen'})`;
  return Screen;
}

// All screens use dark bg to match the new dark theme nav bar
const SnapshotScreen  = webScreen(Snapshot,  '#080E14');
const SpendingScreen  = webScreen(Spending,  '#080E14');
const SavingsScreen   = webScreen(Savings,   '#080E14');
const ProfileScreen   = webScreen(Profile,   '#080E14');
const AccountsScreen  = webScreen(Accounts,  '#080E14');

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={IS_WEB ? (props) => <WebTopNav {...props} /> : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#10C896',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: { backgroundColor: '#080E14', borderTopColor: 'rgba(255,255,255,0.07)' },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Snapshot: focused ? 'pulse'         : 'pulse-outline',
            Spending: focused ? 'card'           : 'card-outline',
            Savings:  focused ? 'trending-up'    : 'trending-up-outline',
            Accounts: focused ? 'wallet'          : 'wallet-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Snapshot" component={SnapshotScreen} options={{ tabBarLabel: 'Snapshot' }} />
      <Tab.Screen name="Spending" component={SpendingScreen} options={{ tabBarLabel: 'Spending' }} />
      <Tab.Screen name="Savings"  component={SavingsScreen}  options={{ tabBarLabel: 'Savings'  }} />
      <Tab.Screen name="Accounts" component={AccountsScreen} options={{ tabBarLabel: 'Accounts' }} />
    </Tab.Navigator>
  );
}

const linking = {
  prefixes: ['cerebral://', 'https://cerebral-production.up.railway.app'],
  config: {
    screens: {
      BillingSuccess: 'billing-success',
    },
  },
};

export default function App() {
  const { user, isLoading, isOnboarded, profileFetched, init } = useAuthStore();
  const fetchBilling = useBillingStore((s) => s.fetch);
  const resetBilling = useBillingStore((s) => s.reset);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (IS_WEB) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,500&display=swap';
      document.head.appendChild(link);
    }
    init();

    if (Platform.OS !== 'web') {
      const Notifications = require('expo-notifications');
      notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});
    }

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchBilling();
    } else {
      resetBilling();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    registerForPushNotifications()
      .then((token) => {
        if (token) api.patch('/users/me/push-token', { expoPushToken: token }).catch(() => {});
      })
      .catch(() => {});
  }, [user]);

  // Hold the loading screen until we know the user AND their onboarding state.
  // Without this gate, returning users briefly see Onboarding while fetchProfile runs.
  if (isLoading || (user && !profileFetched)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080E14' }}>
        <ActivityIndicator size="large" color="#10C896" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" translucent={false} />
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="SignIn" component={SignIn} />
          ) : !isOnboarded ? (
            <Stack.Screen name="Onboarding" component={Onboarding} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="Upgrade" component={Upgrade} options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="BillingSuccess" component={BillingSuccess} options={{ animation: 'fade' }} />
              <Stack.Screen name="InsightDetail" component={InsightDetail} options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="ConnectBank" component={ConnectBank} options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="IntelligenceHub" component={IntelligenceHub} options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="Settings" component={Settings} options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="Snapshot" component={Snapshot} options={{ animation: 'fade' }} />
              <Stack.Screen name="Savings" component={Savings} options={{ animation: 'fade' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
