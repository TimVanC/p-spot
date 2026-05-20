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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubmitStore } from '../stores/submitStore';
import { fontNames, colors } from '../constants/theme';

export default function ScoreRevealScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { scoreResult, imageUri, reset } = useSubmitStore();

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const scoreScale = useRef(new Animated.Value(0.5)).current;
  const scoreOpacity = useRef(new Animated.Value(0)).current;
  const tierOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scoreResult) return;

    Animated.sequence([
      // 1. Score number animates in
      Animated.parallel([
        Animated.timing(scoreScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scoreOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 2. Tier fades in 300ms after score starts
      Animated.timing(tierOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // 3. Hold for ~600ms
      Animated.delay(600),
      // 4. Overlay fades out revealing detail screen
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [overlayOpacity, scoreOpacity, scoreScale, tierOpacity, scoreResult]);

  if (!scoreResult) {
    router.replace('/(tabs)/submit');
    return null;
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I just scored ${scoreResult.score_total} on P Spot — ${scoreResult.score_tier}. Every great piss deserves a score. pspot.app`,
      });
    } catch (err) {
      console.error('[score-reveal] share error:', err);
    }
  };

  const handleAddToMap = () => {
    reset();
    router.replace('/(tabs)');
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

      {/* ── Detail screen (underneath overlay) ── */}
      <ScrollView
        bounces
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Photo — full width, flush top, no radius */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder} />
        )}

        {/* Score section */}
        <View style={styles.scoreSection}>
          <Text style={styles.scoreTotal}>{scoreResult.score_total}</Text>
          <Text style={styles.tierName}>{scoreResult.score_tier}</Text>
          <View style={styles.quoteContainer}>
            <Text style={styles.quote}>{scoreResult.ai_quote}</Text>
          </View>
        </View>

        {/* Breakdown grid */}
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

          {scoreResult.wildlife_detected && (
            <View style={styles.wildlifeRow}>
              <Ionicons name="paw-outline" size={16} color="#B89A2E" />
              <Text style={styles.wildlifeText}>
                Wildlife detected — bonus points awarded
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Share score</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleAddToMap}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Add to map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.textLink}
            onPress={handleSubmitAnother}
            activeOpacity={0.7}
          >
            <Text style={styles.textLinkText}>Submit another</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Animated overlay ── */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents="none"
      >
        <SafeAreaView style={styles.overlayInner}>
          <Animated.Text
            style={[
              styles.overlayScore,
              { transform: [{ scale: scoreScale }], opacity: scoreOpacity },
            ]}
          >
            {scoreResult.score_total}
          </Animated.Text>
          <Animated.Text style={[styles.overlayTier, { opacity: tierOpacity }]}>
            {scoreResult.score_tier}
          </Animated.Text>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // ── Scroll content ──
  scrollContent: {
    paddingBottom: 40,
  },
  photo: {
    width: '100%',
    height: 380,
  },
  photoPlaceholder: {
    width: '100%',
    height: 380,
    backgroundColor: colors.light,
  },

  // Score section
  scoreSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scoreTotal: {
    fontFamily: fontNames.syne,
    fontSize: 72,
    fontWeight: '800',
    color: '#B89A2E',
    letterSpacing: -2,
    lineHeight: 80,
  },
  tierName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  quoteContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    marginVertical: 14,
  },
  quote: {
    fontSize: 14,
    fontWeight: '400',
    fontStyle: 'italic',
    color: colors.deep,
    lineHeight: 20,
  },

  // Grid
  gridSection: {
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    backgroundColor: colors.light,
    borderRadius: 10,
    padding: 12,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cellValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 5,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#F5EEC8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  wildlifeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.light,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  wildlifeText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.light,
    marginHorizontal: 20,
    marginVertical: 16,
  },

  // Actions
  actions: {
    paddingHorizontal: 20,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.mid,
  },
  textLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  textLinkText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
  },

  // ── Overlay ──
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#3D3010',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayScore: {
    fontFamily: fontNames.syne,
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
