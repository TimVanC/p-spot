import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { scoreSpot } from '../lib/claude';
import { useSubmitStore } from '../stores/submitStore';
import { fontNames } from '../constants/theme';

export default function ScoringScreen() {
  const router = useRouter();
  const {
    imageBase64,
    exifData,
    setScoreResult,
    setImageUrl,
    reset,
  } = useSubmitStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [rejected, setRejected] = useState(false);
  const [strikeCount, setStrikeCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (!imageBase64 || !exifData) {
      router.replace('/(tabs)/submit');
      return;
    }
    runScoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runScoring = async () => {
    if (!imageBase64 || !exifData) return;

    try {
      const result = await scoreSpot(imageBase64, exifData.altitudeFt ?? 0);

      if (!result.moderation_pass) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, strikes')
          .single();

        if (profile) {
          const newStrikes = (profile.strikes ?? 0) + 1;
          await supabase
            .from('profiles')
            .update({ strikes: newStrikes })
            .eq('id', profile.id);
          setStrikeCount(newStrikes);
        }
        setRejected(true);
        return;
      }

      // Upload image to storage now (so the URL is ready for post-spot)
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error('Not authenticated.');

      const timestamp = Date.now();
      const storagePath = `${userId}/${timestamp}.jpg`;

      const binaryString = atob(imageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('spots')
        .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('spots')
        .getPublicUrl(storagePath);

      setImageUrl(publicUrlData.publicUrl);
      setScoreResult(result);

      // Navigate to score reveal — user will choose privacy in post-spot.tsx
      router.replace('/score-reveal');
    } catch (err: unknown) {
      console.error('[scoring] Error:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={56} color="#D4B84A" />
          <Text style={styles.errorTitle}>Something went wrong.</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity
            style={styles.tryAgainButton}
            onPress={() => { reset(); router.replace('/(tabs)/submit'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.tryAgainText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (rejected) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={56} color="#C0392B" />
          <Text style={styles.rejectedTitle}>Submission rejected.</Text>
          <Text style={styles.rejectedBody}>
            This photo didn't pass content moderation.
          </Text>
          <Text style={styles.strikeCount}>Strike {Math.min(strikeCount, 3)} of 3</Text>
          <TouchableOpacity
            style={styles.tryAgainButton}
            onPress={() => { reset(); router.replace('/(tabs)/submit'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.tryAgainText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.scoringContainer}>
      <Text style={styles.logo}>P Spot</Text>

      <Animated.View style={[styles.pulse, { transform: [{ scale: pulseAnim }] }]} />

      <Text style={styles.scoringText}>Scoring your spot...</Text>

      <Text style={styles.adPlaceholder}>Ad placeholder — Google AdMob</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#3D3010',
  },
  scoringContainer: {
    flex: 1,
    backgroundColor: '#3D3010',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  logo: {
    fontFamily: fontNames.syne,
    fontSize: 32,
    fontWeight: '700',
    color: '#D4B84A',
    marginBottom: 60,
    letterSpacing: 1,
  },
  pulse: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#D4B84A',
    marginBottom: 40,
    opacity: 0.85,
  },
  scoringText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  adPlaceholder: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.35)',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
    backgroundColor: '#3D3010',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  errorBody: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  rejectedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  rejectedBody: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  strikeCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74C3C',
    marginTop: 4,
  },
  tryAgainButton: {
    marginTop: 12,
    backgroundColor: '#D4B84A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  tryAgainText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3D3010',
  },
});
