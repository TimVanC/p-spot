import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubmitStore } from '../stores/submitStore';
import { buildShareMessage } from '../lib/scoring-utils';
import { colors } from '../constants/theme';

export default function PostSuccessScreen() {
  const router = useRouter();
  const { share_token, score_total, score_tier } = useLocalSearchParams<{
    share_token: string;
    score_total: string;
    score_tier: string;
  }>();

  const { scoreResult, reset } = useSubmitStore();

  const handleShare = async () => {
    if (!scoreResult || !share_token) {
      Alert.alert('Error', 'Missing share data.');
      return;
    }
    try {
      await Share.share({ message: buildShareMessage(scoreResult, share_token) });
    } catch (err) {
      console.error('[post-success] share error:', err);
    }
  };

  const handleViewOnMap = () => {
    reset();
    router.replace('/(tabs)');
  };

  const handleSubmitAnother = () => {
    reset();
    router.replace('/(tabs)/submit');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Ionicons name="checkmark-circle" size={72} color={colors.mid} style={styles.icon} />

        <Text style={styles.heading}>Spot posted.</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.scoreText}>{score_total} pts</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.tierText}>{score_tier}</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleShare} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Share your spot</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleViewOnMap} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>View on map</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.textLink} onPress={handleSubmitAnother} activeOpacity={0.7}>
            <Text style={styles.textLinkText}>Submit another spot</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  icon: { marginBottom: 20 },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  scoreText: { fontSize: 16, fontWeight: '600', color: '#999' },
  dot: { fontSize: 16, color: '#ccc' },
  tierText: { fontSize: 16, fontWeight: '500', color: '#999' },
  buttons: { width: '100%', gap: 12 },
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
  textLink: { alignItems: 'center', paddingVertical: 8 },
  textLinkText: { fontSize: 14, fontWeight: '400', color: '#999' },
});
