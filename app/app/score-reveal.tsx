import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Animated,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubmitStore } from '../stores/submitStore';
import { colors } from '../constants/theme';

export default function ScoreRevealScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { scoreResult, imageUri, exifData, reset } = useSubmitStore();

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const scoreScale = useRef(new Animated.Value(0.5)).current;
  const scoreOpacity = useRef(new Animated.Value(0)).current;
  const tierOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scoreResult) return;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scoreScale, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(scoreOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(tierOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(600),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [overlayOpacity, scoreOpacity, scoreScale, tierOpacity, scoreResult]);

  if (!scoreResult) {
    router.replace('/(tabs)/submit');
    return null;
  }

  const buildShareMessage = () => {
    const metrics = [
      { label: 'View Quality', value: scoreResult.score_view, max: 25, emoji: '🏔️' },
      { label: 'Elevation', value: scoreResult.score_elevation, max: 20, emoji: '⛰️' },
      { label: 'Remoteness', value: scoreResult.score_remoteness, max: 15, emoji: '🌲' },
      { label: 'Lighting', value: scoreResult.score_lighting, max: 10, emoji: '🌅' },
      { label: 'Danger', value: scoreResult.bonus_danger, max: 8, emoji: '⚡' },
      { label: 'Hydration', value: scoreResult.bonus_hydration, max: 5, emoji: '💧' },
      { label: 'Skyline', value: scoreResult.bonus_skyline, max: 8, emoji: '🌆' },
      { label: 'Wildlife', value: scoreResult.bonus_wildlife, max: 8, emoji: '🦅' },
      { label: 'Stream', value: scoreResult.bonus_girth, max: 5, emoji: '💦' },
      { label: 'Sunrise/Sunset', value: scoreResult.bonus_sunrise, max: 5, emoji: '🌄' },
    ];

    const top3 = metrics
      .filter((m) => m.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const metricLines = top3.map((m) => `${m.emoji} ${m.label}: ${m.value}/${m.max}`);

    return [
      'P SPOT RECEIPT 🧾',
      '―――――――――――――',
      `Score: ${scoreResult.score_total}`,
      `Tier: ${scoreResult.score_tier}`,
      ...metricLines,
      '―――――――――――――',
      'Every great piss deserves a score.',
      'https://www.pspot.app/',
    ].join('\n');
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: buildShareMessage() });
    } catch (err) {
      console.error('[score-reveal] share error:', err);
    }
  };

  const handlePostSpot = () => {
    router.push('/post-spot');
  };

  const handleSubmitAnother = () => {
    reset();
    router.replace('/(tabs)/submit');
  };

  const cells = [
    { label: 'VIEW QUALITY', value: scoreResult.score_view, max: 25 },
    { label: 'ELEVATION', value: scoreResult.score_elevation, max: 20 },
    { label: 'REMOTENESS', value: scoreResult.score_remoteness, max: 15 },
    { label: 'LIGHTING', value: scoreResult.score_lighting, max: 10 },
    { label: 'DANGER', value: scoreResult.bonus_danger, max: 8 },
    { label: 'HYDRATION', value: scoreResult.bonus_hydration, max: 5 },
  ];

  const cellWidth = (width - 40 - 12) / 2;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView bounces showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder} />
        )}

        <View style={styles.scoreSection}>
          <Text style={styles.scoreTotal}>{scoreResult.score_total}</Text>
          <Text style={styles.tierName}>{scoreResult.score_tier}</Text>
          <View style={styles.quoteContainer}>
            <Text style={styles.quote}>{scoreResult.ai_quote}</Text>
          </View>
        </View>

        <View style={styles.gridSection}>
          <View style={styles.grid}>
            {cells.map((cell) => (
              <View key={cell.label} style={[styles.cell, { width: cellWidth }]}>
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

          {/* Pee detection row */}
          {scoreResult.pee_detected ? (
            <View style={[styles.detectionRow, styles.detectionRowPositive]}>
              <Ionicons name="water-outline" size={16} color="#B89A2E" />
              <Text style={styles.detectionTextPositive}>Stream detected</Text>
            </View>
          ) : (
            <View style={[styles.detectionRow, styles.detectionRowNegative]}>
              <Ionicons name="alert-circle-outline" size={16} color="#A32D2D" />
              <Text style={styles.detectionTextNegative}>No stream detected — 5pt deduction</Text>
            </View>
          )}

          {scoreResult.wildlife_detected && (
            <View style={styles.wildlifeRow}>
              <Ionicons name="paw-outline" size={16} color="#B89A2E" />
              <Text style={styles.wildlifeText}>Wildlife detected — bonus points awarded</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleShare} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Share score</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handlePostSpot} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Post to P Spot</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.textLink} onPress={handleSubmitAnother} activeOpacity={0.7}>
            <Text style={styles.textLinkText}>Submit another</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Entrance animation overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
        <View style={styles.overlayInner}>
          <Animated.Text
            style={[styles.overlayScore, { transform: [{ scale: scoreScale }], opacity: scoreOpacity }]}
          >
            {scoreResult.score_total}
          </Animated.Text>
          <Animated.Text style={[styles.overlayTier, { opacity: tierOpacity }]}>
            {scoreResult.score_tier}
          </Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  scrollContent: { paddingBottom: 40 },
  photo: { width: '100%', height: 380 },
  photoPlaceholder: { width: '100%', height: 380, backgroundColor: colors.light },

  scoreSection: { paddingHorizontal: 20, paddingTop: 20 },
  scoreTotal: {
    fontSize: 72,
    fontWeight: '800',
    color: '#B89A2E',
    letterSpacing: -2,
    lineHeight: 80,
  },
  tierName: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },
  quoteContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    marginVertical: 14,
  },
  quote: { fontSize: 14, fontWeight: '400', fontStyle: 'italic', color: colors.deep, lineHeight: 20 },

  gridSection: { paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { backgroundColor: colors.light, borderRadius: 10, padding: 12 },
  cellLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cellValue: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 5 },
  progressTrack: { height: 3, backgroundColor: '#F5EEC8', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: colors.primary, borderRadius: 3 },

  detectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  detectionRowPositive: { backgroundColor: '#F0FAF4' },
  detectionRowNegative: { backgroundColor: '#FEF0F0' },
  detectionTextPositive: { fontSize: 13, fontWeight: '500', color: '#4A7C59', flex: 1 },
  detectionTextNegative: { fontSize: 13, fontWeight: '500', color: '#A32D2D', flex: 1 },

  wildlifeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.light,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  wildlifeText: { fontSize: 13, fontWeight: '500', color: colors.text, flex: 1 },

  divider: { height: 1, backgroundColor: colors.light, marginHorizontal: 20, marginVertical: 16 },

  actions: { paddingHorizontal: 20, gap: 10 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
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
  textLink: { alignItems: 'center', paddingVertical: 8 },
  textLinkText: { fontSize: 14, fontWeight: '400', color: '#999' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#3D3010',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayInner: { alignItems: 'center', justifyContent: 'center' },
  overlayScore: {
    fontSize: 96,
    fontWeight: '800',
    color: '#D4B84A',
    letterSpacing: -3,
    lineHeight: 104,
  },
  overlayTier: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    letterSpacing: 0.3,
  },
});
