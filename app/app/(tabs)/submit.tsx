import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { extractExif } from '../../lib/exif';
import { useSubmitStore } from '../../stores/submitStore';
import { Privacy } from '../../types/scoring';
import { colors } from '../../constants/theme';

const PRIVACY_OPTIONS: { value: Privacy; label: string; subtitle: string }[] = [
  {
    value: 'public',
    label: 'Public',
    subtitle: 'Visible on map and leaderboard',
  },
  {
    value: 'streamers',
    label: 'Streamers only',
    subtitle: 'Only your Streamers can see this',
  },
  {
    value: 'private',
    label: 'Private',
    subtitle: 'Only you. Share via link anytime.',
  },
];

export default function SubmitScreen() {
  const router = useRouter();
  const { setImage, setExifData, setPrivacy, privacy } = useSubmitStore();

  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  const processImage = async (uri: string) => {
    setExtracting(true);
    try {
      const exif = await extractExif(uri);

      if (!exif) {
        Alert.alert(
          'GPS required',
          'Original photo required — screenshots don\'t count.',
          [{ text: 'OK' }],
        );
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as const,
      });

      setExifData(exif);
      setPendingUri(uri);
      setPendingBase64(base64);
      setShowPrivacySheet(true);
    } catch (err) {
      console.error('[submit] processImage error:', err);
      Alert.alert('Error', 'Could not read this photo. Please try another.');
    } finally {
      setExtracting(false);
    }
  };

  const handleChoosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to submit a spot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow camera access to submit a spot.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const handleConfirmPrivacy = () => {
    if (!pendingUri || !pendingBase64) return;
    setImage(pendingUri, pendingBase64);
    setShowPrivacySheet(false);
    router.push('/scoring');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>Submit a spot.</Text>
        <Text style={styles.subheading}>Rate the view. Claim the spot.</Text>

        {extracting ? (
          <View style={styles.extractingContainer}>
            <ActivityIndicator size="large" color={colors.mid} />
            <Text style={styles.extractingText}>Reading photo...</Text>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <Ionicons name="camera-outline" size={64} color="#B89A2E" />
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleChoosePhoto}
          disabled={extracting}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Choose a photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleTakePhoto}
          disabled={extracting}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Take a photo</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPrivacySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacySheet(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowPrivacySheet(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          <Text style={styles.sheetTitle}>Who can see this?</Text>

          {PRIVACY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={styles.privacyOption}
              onPress={() => setPrivacy(opt.value)}
              activeOpacity={0.7}
            >
              <View style={styles.radioOuter}>
                {privacy === opt.value && <View style={styles.radioInner} />}
              </View>
              <View style={styles.privacyTextGroup}>
                <Text style={styles.privacyLabel}>{opt.label}</Text>
                <Text style={styles.privacySubtitle}>{opt.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmPrivacy}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmButtonText}>Score this spot</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.deep,
    textAlign: 'center',
    marginBottom: 8,
  },
  cameraContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  extractingContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  extractingText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.deep,
  },
  primaryButton: {
    width: '100%',
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
    width: '100%',
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
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.inputBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.inputBorder,
    gap: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.mid,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.mid,
  },
  privacyTextGroup: {
    flex: 1,
  },
  privacyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  privacySubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.deep,
  },
  confirmButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
