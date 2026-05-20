import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, fontNames } from '../../constants/theme';
import { Spot, SpotProfile, Drip } from '../../types/spot';
import { timeAgo, formatCoords, formatDuration } from '../../lib/utils';
import { buildShareMessage } from '../../lib/scoring-utils';
import { ScoreResult } from '../../types/scoring';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function AvatarCircle({
  avatarUrl,
  username,
  size,
}: {
  avatarUrl: string | null;
  username: string;
  size: number;
}) {
  const initials = username.slice(0, 2).toUpperCase();
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.light,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.35, fontWeight: '600', color: colors.mid }}>{initials}</Text>
    </View>
  );
}

export default function SpotDetailScreen() {
  const { id, share_token: shareTokenParam } = useLocalSearchParams<{
    id: string;
    share_token?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [spot, setSpot] = useState<Spot | null>(null);
  const [poster, setPoster] = useState<SpotProfile | null>(null);
  const [drips, setDrips] = useState<Drip[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasShaken, setHasShaken] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [dripInput, setDripInput] = useState('');
  const [sendingDrip, setSendingDrip] = useState(false);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    initScreen();
  }, [id]);

  const initScreen = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      setCurrentUserId(uid);

      const { data: spotData } = await supabase
        .from('spots')
        .select('*')
        .eq('id', id)
        .single();

      if (!spotData) {
        setLoading(false);
        return;
      }

      const s = spotData as Spot;
      setSpot(s);
      setShakeCount(s.shake_count ?? 0);

      const [profileResult, dripsResult, shakeResult] = await Promise.all([
        supabase.from('profiles').select('id,username,display_name,avatar_url').eq('id', s.user_id).single(),
        supabase
          .from('drips')
          .select('*, profiles(username, avatar_url)')
          .eq('spot_id', id)
          .order('created_at', { ascending: true }),
        uid
          ? supabase.from('shakes').select('user_id').eq('user_id', uid).eq('spot_id', id).single()
          : Promise.resolve({ data: null }),
      ]);

      if (profileResult.data) setPoster(profileResult.data as SpotProfile);
      if (dripsResult.data) setDrips(dripsResult.data as Drip[]);
      if (shakeResult.data) setHasShaken(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleShake = async () => {
    if (!currentUserId || !spot) return;
    if (hasShaken) {
      setHasShaken(false);
      setShakeCount((c) => c - 1);
      await supabase.from('shakes').delete().eq('user_id', currentUserId).eq('spot_id', spot.id);
      await supabase.from('spots').update({ shake_count: shakeCount - 1 }).eq('id', spot.id);
    } else {
      setHasShaken(true);
      setShakeCount((c) => c + 1);
      await supabase.from('shakes').insert({ user_id: currentUserId, spot_id: spot.id });
      await supabase.from('spots').update({ shake_count: shakeCount + 1 }).eq('id', spot.id);
    }
  };

  const sendDrip = async () => {
    if (!currentUserId || !spot || !dripInput.trim()) return;
    setSendingDrip(true);
    try {
      const { data, error } = await supabase
        .from('drips')
        .insert({ user_id: currentUserId, spot_id: spot.id, body: dripInput.trim() })
        .select('*, profiles(username, avatar_url)')
        .single();
      if (error) throw error;
      setDrips((prev) => [...prev, data as Drip]);
      setDripInput('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert('Error', 'Could not post drip. Try again.');
    } finally {
      setSendingDrip(false);
    }
  };

  const handleShare = async () => {
    if (!spot) return;
    try {
      const fakeResult: ScoreResult = {
        moderation_pass: true,
        score_view: spot.score_view,
        score_elevation: spot.score_elevation,
        score_remoteness: spot.score_remoteness,
        score_lighting: spot.score_lighting,
        bonus_skyline: spot.bonus_skyline,
        bonus_sunrise: spot.bonus_sunrise,
        bonus_wildlife: spot.bonus_wildlife,
        bonus_girth: spot.bonus_girth,
        bonus_hydration: spot.bonus_hydration,
        bonus_danger: spot.bonus_danger,
        bonus_toilet: spot.bonus_toilet,
        bonus_effort: spot.bonus_effort,
        wildlife_detected: spot.wildlife_detected,
        pee_detected: spot.pee_detected ?? false,
        score_tier: spot.score_tier as ScoreResult['score_tier'],
        ai_quote: spot.ai_quote ?? '',
        score_total: spot.score_total,
      };
      await Share.share({ message: buildShareMessage(fakeResult, spot.share_token) });
    } catch (err) {
      console.error('[spot-detail] share error:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!spot) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Spot not found.</Text>
      </View>
    );
  }

  const isOwner = currentUserId === spot.user_id;
  const accessedViaToken = shareTokenParam === spot.share_token;
  const isPrivateLocked = spot.privacy === 'private' && !isOwner && !accessedViaToken;

  if (isPrivateLocked) {
    return (
      <View style={styles.privateCover}>
        <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <Ionicons name="lock-closed" size={48} color={colors.mid} />
        <Text style={styles.privateHeading}>This spot is private.</Text>
        <Text style={styles.privateBody}>Only the owner can view it.</Text>
      </View>
    );
  }

  const locationText = spot.location_name ?? formatCoords(spot.lat, spot.lng);
  const altitudeText = spot.altitude_ft ? ` · ${Math.round(spot.altitude_ft).toLocaleString()} ft` : '';

  const bonuses = [
    { emoji: '🌆', label: 'Skyline', value: spot.bonus_skyline },
    { emoji: '🌅', label: 'Sunrise', value: spot.bonus_sunrise },
    { emoji: '🦅', label: 'Wildlife', value: spot.bonus_wildlife },
    { emoji: '💦', label: 'Stream', value: spot.bonus_girth },
    { emoji: '💧', label: 'Hydration', value: spot.bonus_hydration },
    { emoji: '⚡', label: 'Danger', value: spot.bonus_danger },
    { emoji: '🚽', label: 'Toilet', value: spot.bonus_toilet },
    { emoji: '🏃', label: 'Effort', value: spot.bonus_effort },
  ].filter((b) => b.value > 0);

  const cells = [
    { label: 'VIEW QUALITY', value: spot.score_view, max: 25 },
    { label: 'ELEVATION', value: spot.score_elevation, max: 20 },
    { label: 'REMOTENESS', value: spot.score_remoteness, max: 15 },
    { label: 'LIGHTING', value: spot.score_lighting, max: 10 },
    { label: 'DANGER', value: spot.bonus_danger, max: 8 },
    { label: 'HYDRATION', value: spot.bonus_hydration, max: 5 },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.bottom}
    >
      {/* Floating header over photo */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo */}
        <Image source={{ uri: spot.image_url }} style={styles.photo} resizeMode="cover" />

        {/* Header row: score + poster */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.scoreTotal}>{Math.round(spot.score_total)}</Text>
            <Text style={styles.tierName}>{spot.score_tier}</Text>
          </View>
          {poster && (
            <View style={styles.headerRight}>
              <AvatarCircle avatarUrl={poster.avatar_url} username={poster.username} size={40} />
              <Text style={styles.posterUsername}>@{poster.username}</Text>
              <Text style={styles.submittedTime}>{timeAgo(spot.submitted_at)}</Text>
            </View>
          )}
        </View>

        {/* AI Quote */}
        {spot.ai_quote ? (
          <View style={styles.quoteContainer}>
            <Text style={styles.quote}>{spot.ai_quote}</Text>
          </View>
        ) : null}

        {/* Location row */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.mid} />
          <Text style={styles.locationText}>
            {locationText}
            {altitudeText}
          </Text>
        </View>

        {/* Score grid */}
        <View style={styles.grid}>
          {cells.map((cell) => (
            <View key={cell.label} style={styles.cell}>
              <Text style={styles.cellLabel}>{cell.label}</Text>
              <Text style={styles.cellValue}>{cell.value}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min((cell.value / cell.max) * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Bonus pills */}
        {bonuses.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bonusRow}
          >
            {bonuses.map((b) => (
              <View key={b.label} style={styles.bonusPill}>
                <Text style={styles.bonusText}>
                  {b.emoji} {b.label} +{b.value}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Pee detection */}
        <View style={styles.section}>
          {spot.pee_detected ? (
            <View style={[styles.detectionRow, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="water-outline" size={16} color="#4A7C59" />
              <Text style={[styles.detectionText, { color: '#4A7C59' }]}>Stream confirmed</Text>
            </View>
          ) : (
            <View style={[styles.detectionRow, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.errorText} />
              <Text style={[styles.detectionText, { color: colors.errorText }]}>
                No stream detected — 5pt deduction
              </Text>
            </View>
          )}
        </View>

        {/* Strava strip */}
        {spot.strava_activity_id && (
          <View style={styles.stravaStrip}>
            <View style={styles.stravaAccent} />
            <Ionicons name="walk-outline" size={20} color="#FC4C02" style={styles.stravaIcon} />
            <View style={styles.stravaInfo}>
              <Text style={styles.stravaLabel}>Effort bonus applied</Text>
              <Text style={styles.stravaStats}>
                {spot.strava_distance_mi ? `${spot.strava_distance_mi.toFixed(1)} mi` : ''}
                {spot.strava_elevation_ft ? `  ·  +${Math.round(spot.strava_elevation_ft)} ft` : ''}
                {spot.strava_duration_sec ? `  ·  ${formatDuration(spot.strava_duration_sec)}` : ''}
                {spot.strava_suffer_score ? `  ·  suffer ${spot.strava_suffer_score}` : ''}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Engagement row */}
        <View style={styles.engagementRow}>
          <TouchableOpacity style={styles.engageBtn} onPress={toggleShake} activeOpacity={0.7}>
            <Ionicons
              name={hasShaken ? 'water' : 'water-outline'}
              size={20}
              color={hasShaken ? colors.mid : '#999'}
            />
            <Text style={[styles.engageText, hasShaken && styles.engageTextActive]}>
              {shakeCount} Shakes
            </Text>
          </TouchableOpacity>
          <View style={styles.engageBtn}>
            <Ionicons name="chatbubble-outline" size={20} color="#999" />
            <Text style={styles.engageText}>{drips.length} Drips</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Drips section */}
        <View style={styles.section}>
          <Text style={styles.dripsHeading}>Drips</Text>
          {drips.length === 0 && (
            <Text style={styles.noDrips}>No drips yet. Add yours.</Text>
          )}
          {drips.map((drip) => (
            <View key={drip.id} style={styles.dripRow}>
              <AvatarCircle
                avatarUrl={drip.profiles?.avatar_url ?? null}
                username={drip.profiles?.username ?? '?'}
                size={32}
              />
              <View style={styles.dripContent}>
                <Text style={styles.dripUsername}>{drip.profiles?.username ?? 'unknown'}</Text>
                <Text style={styles.dripBody}>{drip.body}</Text>
                <Text style={styles.dripTime}>{timeAgo(drip.created_at)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Drip input bar */}
      <View style={[styles.dripInputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.dripInput}
          placeholder="Add a drip..."
          placeholderTextColor="#bbb"
          value={dripInput}
          onChangeText={setDripInput}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={sendDrip}
        />
        <TouchableOpacity
          onPress={sendDrip}
          disabled={sendingDrip || !dripInput.trim()}
          activeOpacity={0.7}
        >
          {sendingDrip ? (
            <ActivityIndicator size="small" color={colors.mid} />
          ) : (
            <Ionicons
              name="arrow-up-circle"
              size={28}
              color={dripInput.trim() ? colors.mid : '#ccc'}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  errorText: { fontSize: 16, color: '#999' },

  privateCover: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  privateHeading: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 },
  privateBody: { fontSize: 14, color: '#999' },

  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { paddingBottom: 0 },
  photo: { width: '100%', height: 320 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  headerLeft: { flex: 1 },
  scoreTotal: {
    fontFamily: fontNames.syne,
    fontSize: 56,
    fontWeight: '800',
    color: colors.mid,
    lineHeight: 62,
  },
  tierName: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  posterUsername: { fontSize: 13, fontWeight: '500', color: colors.text },
  submittedTime: { fontSize: 11, color: '#999' },

  quoteContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    marginHorizontal: 20,
    marginVertical: 14,
  },
  quote: { fontSize: 14, fontStyle: 'italic', color: colors.deep, lineHeight: 20 },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    gap: 6,
  },
  locationText: { fontSize: 13, fontWeight: '400', color: '#666', flex: 1 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  cell: {
    width: '47%',
    backgroundColor: colors.light,
    borderRadius: 10,
    padding: 12,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cellValue: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 5 },
  progressTrack: { height: 3, backgroundColor: '#E8DDA0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: colors.primary, borderRadius: 3 },

  bonusRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  bonusPill: {
    backgroundColor: colors.light,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bonusText: { fontSize: 12, fontWeight: '500', color: colors.text },

  section: { paddingHorizontal: 20, marginTop: 12 },
  detectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 10,
  },
  detectionText: { fontSize: 13, fontWeight: '500', flex: 1 },

  stravaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    overflow: 'hidden',
  },
  stravaAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#FC4C02',
  },
  stravaIcon: { marginLeft: 8, marginRight: 10 },
  stravaInfo: { flex: 1 },
  stravaLabel: { fontSize: 11, fontWeight: '600', color: colors.mid, marginBottom: 2 },
  stravaStats: { fontSize: 13, fontWeight: '400', color: colors.text },

  divider: { height: 1, backgroundColor: colors.light, marginHorizontal: 20, marginVertical: 16 },

  engagementRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 24,
  },
  engageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  engageText: { fontSize: 14, fontWeight: '500', color: '#999' },
  engageTextActive: { color: colors.mid },

  dripsHeading: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  noDrips: { fontSize: 14, color: '#bbb', fontStyle: 'italic' },
  dripRow: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-start' },
  dripContent: { flex: 1 },
  dripUsername: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
  dripBody: { fontSize: 14, fontWeight: '400', color: '#333', lineHeight: 20 },
  dripTime: { fontSize: 11, color: '#bbb', marginTop: 4 },

  dripInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.inputBorder,
    backgroundColor: colors.white,
    gap: 10,
  },
  dripInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.light,
    borderRadius: 20,
    color: colors.text,
  },
});
