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

export default function PostSpotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scoreResult, imageUri, imageUrl, exifData, privacy, setPrivacy, setSubmittedSpotId, reset } = useSubmitStore();

  const [showSheet, setShowSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = PRIVACY_OPTIONS.find((o) => o.value === privacy) ?? PRIVACY_OPTIONS[0];

  if (!scoreResult || !imageUrl || !exifData) {
    router.replace('/(tabs)/submit');
    return null;
  }

  const saveSpot = async (chosenPrivacy: Privacy) => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error('Not authenticated.');

      const shareToken = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

      const { data: spot, error: insertError } = await supabase
        .from('spots')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          share_token: shareToken,
          privacy: chosenPrivacy,
          lat: exifData.lat,
          lng: exifData.lng,
          altitude_ft: exifData.altitudeFt ?? null,
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
          bonus_toilet: scoreResult.bonus_toilet,
          bonus_effort: scoreResult.bonus_effort,
          ai_quote: scoreResult.ai_quote,
          wildlife_detected: scoreResult.wildlife_detected,
          pee_detected: scoreResult.pee_detected,
          moderation_pass: true,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (spot?.id) setSubmittedSpotId(spot.id);

      reset();
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[post-spot] save error:', err);
      Alert.alert('Error', 'Could not save your spot. Please try again.');
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

        {/* Mini summary row */}
        <View style={styles.summaryRow}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
          ) : null}
          <View style={styles.summaryText}>
            <Text style={styles.summaryScore}>{scoreResult.score_total} pts</Text>
            <Text style={styles.summaryTier}>{scoreResult.score_tier}</Text>
          </View>
        </View>

        {/* Visibility selector */}
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
          {/* Post to P Spot */}
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

          {/* Keep it private */}
          <TouchableOpacity
            style={[styles.secondaryButton, saving && styles.buttonDisabled]}
            onPress={handleKeepPrivate}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Keep it private</Text>
          </TouchableOpacity>

          {/* Discard */}
          <TouchableOpacity style={styles.discardLink} onPress={handleDiscard} activeOpacity={0.7}>
            <Text style={styles.discardText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Privacy bottom sheet */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowSheet(false)}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.dragHandle} />
          <Text style={styles.sheetTitle}>Who can see this?</Text>

          {PRIVACY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.optionRow}
              onPress={() => { setPrivacy(opt.value); }}
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.light,
    borderRadius: 12,
    padding: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.inputBorder,
  },
  summaryText: { flex: 1 },
  summaryScore: { fontSize: 24, fontWeight: '700', color: colors.mid },
  summaryTier: { fontSize: 14, fontWeight: '500', color: colors.text, marginTop: 2 },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: 12,
    padding: 14,
  },
  visibilityIcon: { marginRight: 12 },
  visibilityText: { flex: 1 },
  visibilityLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 1 },
  visibilitySubtitle: { fontSize: 12, fontWeight: '400', color: colors.deep },
  buttons: { gap: 10, marginTop: 4 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.text },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.mid },
  buttonDisabled: { opacity: 0.6 },
  discardLink: { alignItems: 'center', paddingVertical: 8 },
  discardText: { fontSize: 14, fontWeight: '400', color: '#999' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: colors.inputBorder,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.inputBorder,
    gap: 12,
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
