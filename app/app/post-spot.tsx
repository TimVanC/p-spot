import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useSubmitStore } from '../stores/submitStore';
import { Privacy } from '../types/scoring';
import { colors } from '../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface PrivacyOption {
  value: Privacy;
  label: string;
  subtitle: string;
  icon: IoniconName;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  { value: 'public', label: 'Public', subtitle: 'Visible on map and leaderboard', icon: 'earth-outline' },
  { value: 'streamers', label: 'Streamers only', subtitle: 'Only your Streamers can see this', icon: 'people-outline' },
  { value: 'private', label: 'Private', subtitle: 'Only you. Share via link anytime.', icon: 'lock-closed-outline' },
];

function makeUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function PostSpotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    scoreResult,
    imageUri,
    imageBase64,
    exifData,
    privacy,
    setPrivacy,
    setSubmittedSpotId,
    reset,
  } = useSubmitStore();

  const [showSheet, setShowSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = PRIVACY_OPTIONS.find((o) => o.value === privacy) ?? PRIVACY_OPTIONS[0];

  if (!scoreResult || !imageBase64 || !imageUri || !exifData) {
    console.warn('[post-spot] Missing required store state — redirecting', {
      hasScore: !!scoreResult,
      hasBase64: !!imageBase64,
      hasUri: !!imageUri,
      hasExif: !!exifData,
    });
    router.replace('/(tabs)/submit');
    return null;
  }

  const saveSpot = async (chosenPrivacy: Privacy) => {
    setSaving(true);
    try {
      // 1. Get authenticated user
      console.log('[post-spot] Step 1: getting user...');
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error(`Auth error: ${userError?.message ?? 'No user found'}`);
      }
      const userId = userData.user.id;
      console.log('[post-spot] User id:', userId);

      // 2. Convert base64 → Uint8Array and upload to storage
      console.log('[post-spot] Step 2: uploading image to storage...');
      const binaryString = atob(imageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const storagePath = `${userId}/${Date.now()}.jpg`;
      console.log('[post-spot] Storage path:', storagePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('spots')
        .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) {
        throw new Error(`Storage upload error: ${uploadError.message}`);
      }
      console.log('[post-spot] Upload success:', uploadData?.path);

      // 3. Get public URL
      console.log('[post-spot] Step 3: getting public URL...');
      const { data: urlData } = supabase.storage.from('spots').getPublicUrl(storagePath);
      const imageUrl = urlData.publicUrl;
      console.log('[post-spot] Public URL:', imageUrl);

      // 4. Insert spot row
      console.log('[post-spot] Step 4: inserting spot row...');
      const shareToken = makeUUID();

      const insertPayload = {
        user_id: userId,
        image_url: imageUrl,
        share_token: shareToken,
        privacy: chosenPrivacy,
        lat: exifData.lat,
        lng: exifData.lng,
        altitude_ft: exifData.altitudeFt ?? null,
        location_name: null,
        submitted_at: exifData.timestamp ?? new Date().toISOString(),
        score_view: scoreResult.score_view,
        score_elevation: scoreResult.score_elevation,
        score_remoteness: scoreResult.score_remoteness,
        score_lighting: scoreResult.score_lighting,
        score_total: scoreResult.score_total,
        score_tier: scoreResult.score_tier,
        bonus_skyline: scoreResult.bonus_skyline,
        bonus_sunrise: scoreResult.bonus_sunrise,
        bonus_wildlife: scoreResult.bonus_wildlife,
        bonus_girth: scoreResult.bonus_girth,
        bonus_hydration: scoreResult.bonus_hydration,
        bonus_danger: scoreResult.bonus_danger,
        bonus_toilet: 0,
        bonus_effort: 0,
        ai_quote: scoreResult.ai_quote,
        wildlife_detected: scoreResult.wildlife_detected,
        pee_detected: scoreResult.pee_detected ?? false,
        moderation_pass: true,
      };

      console.log('[post-spot] Insert payload:', JSON.stringify(insertPayload, null, 2));

      const { data: spot, error: insertError } = await supabase
        .from('spots')
        .insert(insertPayload)
        .select('id, share_token')
        .single();

      if (insertError) {
        throw new Error(`DB insert error: ${insertError.message} (code: ${insertError.code})`);
      }

      console.log('[post-spot] Spot saved! id:', spot?.id, 'share_token:', spot?.share_token);
      if (spot?.id) setSubmittedSpotId(spot.id);

      // Navigate to success screen — store reset happens there
      router.replace({
        pathname: '/post-success',
        params: {
          share_token: spot?.share_token ?? '',
          score_total: String(scoreResult.score_total),
          score_tier: scoreResult.score_tier,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[post-spot] FAILED:', message);
      Alert.alert('Could not post spot', message);
    } finally {
      setSaving(false);
    }
  };

  const handlePost = () => saveSpot(privacy);
  const handleKeepPrivate = () => saveSpot('private');

  const handleDiscard = () => {
    reset();
    router.replace('/(tabs)/submit');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>Share your spot?</Text>

        <View style={styles.summaryRow}>
          <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryScore}>{scoreResult.score_total} pts</Text>
            <Text style={styles.summaryTier}>{scoreResult.score_tier}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.visibilityRow}
          onPress={() => setShowSheet(true)}
          activeOpacity={0.8}
        >
          <Ionicons name={selected.icon} size={22} color={colors.mid} style={styles.visibilityIcon} />
          <View style={styles.visibilityText}>
            <Text style={styles.visibilityLabel}>{selected.label}</Text>
            <Text style={styles.visibilitySubtitle}>{selected.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color={colors.mid} />
        </TouchableOpacity>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handlePost}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.primaryButtonText}>Post to P Spot</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, saving && styles.buttonDisabled]}
            onPress={handleKeepPrivate}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Keep it private</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.discardLink} onPress={handleDiscard} activeOpacity={0.7}>
            <Text style={styles.discardText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowSheet(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.dragHandle} />
          <Text style={styles.sheetTitle}>Who can see this?</Text>

          {PRIVACY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.optionRow}
              onPress={() => setPrivacy(opt.value)}
              activeOpacity={0.7}
            >
              <Ionicons name={opt.icon} size={20} color={colors.mid} />
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
              </View>
              <View style={[styles.radioOuter, privacy === opt.value && styles.radioActive]}>
                {privacy === opt.value && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setShowSheet(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 32, gap: 16 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.light, borderRadius: 12, padding: 12,
  },
  thumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.inputBorder },
  summaryText: { flex: 1 },
  summaryScore: { fontSize: 24, fontWeight: '700', color: colors.mid },
  summaryTier: { fontSize: 14, fontWeight: '500', color: colors.text, marginTop: 2 },
  visibilityRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.light, borderRadius: 12, padding: 14,
  },
  visibilityIcon: { marginRight: 12 },
  visibilityText: { flex: 1 },
  visibilityLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 1 },
  visibilitySubtitle: { fontSize: 12, fontWeight: '400', color: colors.deep },
  buttons: { gap: 10, marginTop: 4 },
  primaryButton: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.text },
  secondaryButton: {
    backgroundColor: colors.white, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: colors.primary,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.mid },
  buttonDisabled: { opacity: 0.6 },
  discardLink: { alignItems: 'center', paddingVertical: 8 },
  discardText: { fontSize: 14, fontWeight: '400', color: '#999' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12,
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: colors.inputBorder,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.inputBorder, gap: 12,
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  optionSubtitle: { fontSize: 12, fontWeight: '400', color: colors.deep },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.mid },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.mid },
  doneButton: {
    marginTop: 20, backgroundColor: colors.primary,
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  doneButtonText: { fontSize: 16, fontWeight: '700', color: colors.text },
});
