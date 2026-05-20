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
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { parseImagePickerExif } from '../../lib/exif';
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

  const compressAndEncode = async (uri: string) => {
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
      encoding: 'base64' as const,
    });
    return { uri: compressed.uri, base64 };
  };

  /** For photos chosen from the library — GPS comes from EXIF. */
  const processLibraryAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setExtracting(true);
    try {
      const exif = asset.exif
        ? parseImagePickerExif(asset.exif as Record<string, unknown>)
        : null;

      if (!exif) {
        Alert.alert(
          'GPS required',
          "Original photo required — screenshots don't count.",
          [{ text: 'OK' }],
        );
        return;
      }

      const { uri, base64 } = await compressAndEncode(asset.uri);
      setExifData(exif);
      setPendingUri(uri);
      setPendingBase64(base64);
      setShowPrivacySheet(true);
    } catch (err) {
      console.error('[submit] processLibraryAsset error:', err);
      Alert.alert('Error', 'Could not read this photo. Please try another.');
    } finally {
      setExtracting(false);
    }
  };

  /** For photos taken with the camera — GPS comes from device location. */
  const processCameraAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setExtracting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location required',
          'Allow location access so your spot can be placed on the map.',
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const exif = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        altitudeFt: location.coords.altitude != null
          ? Math.round(location.coords.altitude * 3.28084)
          : undefined,
        timestamp: new Date(location.timestamp).toISOString(),
      };

      const { uri, base64 } = await compressAndEncode(asset.uri);
      setExifData(exif);
      setPendingUri(uri);
      setPendingBase64(base64);
      setShowPrivacySheet(true);
    } catch (err) {
      console.error('[submit] processCameraAsset error:', err);
      Alert.alert('Error', 'Could not get your location. Please try again.');
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
      exif: true,
    });

    if (!result.canceled && result.assets[0]) {
      await processLibraryAsset(result.assets[0]);
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
      await processCameraAsset(result.assets[0]);
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
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" color={colors.mid} />
            <Text style={styles.extractingText}>Reading photo...</Text>
          </View>
        ) : (
          <View style={styles.iconContainer}>
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
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 8,
  },
  extractingText: {
    fontSize: 12,
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
