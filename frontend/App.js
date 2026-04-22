import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { initFirebase } from './src/api/client';
import useAuthStore from './src/store/authStore';

import SignIn from './src/screens/SignIn';
import Onboarding from './src/screens/Onboarding';
import Dashboard from './src/screens/Dashboard';
import Transactions from './src/screens/Transactions';
import Opportunities from './src/screens/Opportunities';
import Chat from './src/screens/Chat';
import Profile from './src/screens/Profile';

const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1a1a2e',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f0f0f0' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Opportunities: focused ? 'compass' : 'compass-outline',
            Transactions: focused ? 'card' : 'card-outline',
            Chat: focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Dashboard} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Opportunities" component={Opportunities} options={{ tabBarLabel: 'Explore' }} />
      <Tab.Screen name="Transactions" component={Transactions} options={{ tabBarLabel: 'Spend' }} />
      <Tab.Screen name="Chat" component={Chat} options={{ tabBarLabel: 'Ask AI' }} />
      <Tab.Screen name="Profile" component={Profile} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, isLoading, isOnboarded, init } = useAuthStore();

  useEffect(() => {
    if (FIREBASE_CONFIG.apiKey) {
      initFirebase(FIREBASE_CONFIG);
    }
    init();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#1a1a2e" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="SignIn" component={SignIn} />
          ) : !isOnboarded ? (
            <Stack.Screen name="Onboarding" component={Onboarding} />
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
