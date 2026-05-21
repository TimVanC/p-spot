import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Syne_700Bold } from '@expo-google-fonts/syne';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../lib/supabase';
import '../lib/mapbox'; // initialize Mapbox token on app start

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({ Syne_700Bold });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setSessionLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then((val) => {
      setOnboardingComplete(val === 'true');
    });
  }, []);

  const isReady = (fontsLoaded || !!fontError) && sessionLoaded && onboardingComplete !== null;

  useEffect(() => {
    if (!isReady) return;
    SplashScreen.hideAsync();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inAuth = segments[0] === '(auth)';
    const inTabs = segments[0] === '(tabs)';
    const inProtected = [
      'spot', 'badges', 'level', 'notifications', 'settings',
      'scoring', 'score-reveal', 'confirm-spot', 'post-spot', 'post-success', 'profile',
    ].includes(segments[0] as string);

    if (!onboardingComplete && inOnboarding) return;
    if (onboardingComplete && !session && inAuth) return;
    if (onboardingComplete && session && (inTabs || inProtected)) return;

    if (!onboardingComplete) {
      router.replace('/onboarding');
    } else if (!session) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(tabs)');
    }
  }, [isReady, session, segments, onboardingComplete, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="spot/[id]" />
      <Stack.Screen name="badges" />
      <Stack.Screen name="level" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="confirm-spot" />
      <Stack.Screen name="scoring" />
      <Stack.Screen name="score-reveal" />
      <Stack.Screen name="post-spot" />
      <Stack.Screen name="post-success" />
      <Stack.Screen name="profile/[id]" />
    </Stack>
  );
}
