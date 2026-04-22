import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button } from 'react-native';
import Dashboard from './src/screens/Dashboard';
import Transactions from './src/screens/Transactions';
import Chat from './src/screens/Chat';
import SignIn from './src/screens/SignIn';
import { useEffect } from 'react';
import { initFirebase, ensureAnonymousAuth } from './src/api/client';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize Firebase from Expo public env vars (set these in app config)
    const cfg = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

    // Only initialize if apiKey present
    if (cfg.apiKey) {
      initFirebase(cfg);
      // try anonymous sign-in to get a token for API calls
      ensureAnonymousAuth().catch(() => {});
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Dashboard"
            component={Dashboard}
            options={({ navigation }) => ({
              headerRight: () => (
                <>
                  <Button title="Transactions" onPress={() => navigation.navigate('Transactions')} />
                  <Button title="Chat" onPress={() => navigation.navigate('Chat')} />
                </>
              ),
            })}
          />
          <Stack.Screen name="Transactions" component={Transactions} />
          <Stack.Screen name="Chat" component={Chat} />
          <Stack.Screen name="SignIn" component={SignIn} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
