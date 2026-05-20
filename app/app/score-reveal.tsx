import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubmitStore } from '../stores/submitStore';
import { fontNames, colors } from '../constants/theme';

interface ScoreCell {
  label: string;
  value: number;
  max: number;
}

export default function ScoreRevealScreen() {
  const router = useRouter();
  const { scoreResult, imageUri, reset } = useSubmitStore();

  if (!scoreResult) {
    router.replace('/(tabs)/submit');
    return null;
  }

  const cells: ScoreCell[] = [
    { label: 'VIEW QUALITY', value: scoreResult.score_view, max: 25 },
    { label: 'ELEVATION', value: scoreResult.score_elevation, max: 20 },
    { label: 'REMOTENESS', value: scoreResult.score_remoteness, max: 15 },
    { label: 'LIGHTING', value: scoreResult.score_lighting, max: 10 },
    { label: 'DANGER', value: scoreResult.bonus_danger, max: 8 },
    { label: 'HYDRATION', value: scoreResult.bonus_hydration, max: 5 },
  ];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I just scored ${scoreResult.score_total} on P Spot — ${scoreResult.score_tier}. Every great piss deserves a score. pspot.app`,
      });
    } catch (err) {
      console.error('[score-reveal] Share error:', err);
    }
  };

  const handleAddToMap = () => {
    reset();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : null}

        <Text style={styles.scoreTotal}>{scoreResult.score_total}</Text>
        <Text style={styles.tierName}>{scoreResult.score_tier}</Text>

        <View style={styles.quoteContainer}>
          <Text style={styles.quote}>{scoreResult.ai_quote}</Text>
        </View>

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

        {scoreResult.wildlife_detected ? (
          <View style={styles.easterEgg}>
            <Text style={styles.easterEggText}>🦌 Wildlife detected! +{scoreResult.bonus_wildlife} pts</Text>
          </View>
        ) : null}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleAddToMap}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Add to map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Share score</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: colors.light,
  },
  scoreTotal: {
    fontFamily: fontNames.syne,
    fontSize: 80,
    fontWeight: '800',
    color: '#B89A2E',
    textAlign: 'center',
    lineHeight: 88,
  },
  tierName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  quoteContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    marginVertical: 12,
  },
  quote: {
    fontSize: 14,
    fontWeight: '400',
    fontStyle: 'italic',
    color: colors.deep,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
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
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  cellValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#F5EEC8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  easterEgg: {
    marginTop: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  easterEggText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.mid,
  },
});
