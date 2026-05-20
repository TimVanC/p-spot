import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubmitStore } from '../stores/submitStore';
import { colors } from '../constants/theme';

export default function ConfirmSpotScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { imageUri, reset } = useSubmitStore();

  if (!imageUri) {
    router.replace('/(tabs)/submit');
    return null;
  }

  const handleBack = () => {
    reset();
    router.replace('/(tabs)/submit');
  };

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: imageUri }}
        style={[styles.photo, { height: height * 0.65 }]}
        resizeMode="cover"
      />

      <SafeAreaView edges={['bottom']} style={styles.panel}>
        <Text style={styles.heading}>Ready to score?</Text>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => router.push('/scoring')}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmButtonText}>Score this spot</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={14} color="#999" />
          <Text style={styles.backLinkText}>Choose a different photo</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  photo: {
    width: '100%',
  },
  panel: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
  },
});
