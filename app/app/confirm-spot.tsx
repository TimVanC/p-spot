import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  {
    value: 'public',
    label: 'Public',
    subtitle: 'Visible on map and leaderboard',
    icon: 'earth-outline',
  },
  {
    value: 'streamers',
    label: 'Streamers only',
    subtitle: 'Only your Streamers can see this',
    icon: 'people-outline',
  },
  {
    value: 'private',
    label: 'Private',
    subtitle: 'Only you. Share via link anytime.',
    icon: 'lock-closed-outline',
  },
];

export default function ConfirmSpotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { imageUri, privacy, setPrivacy, reset } = useSubmitStore();
  const [showSheet, setShowSheet] = useState(false);

  const selected = PRIVACY_OPTIONS.find((o) => o.value === privacy) ?? PRIVACY_OPTIONS[0];

  if (!imageUri) {
    router.replace('/(tabs)/submit');
    return null;
  }

  const handleBack = () => {
    reset();
    router.replace('/(tabs)/submit');
  };

  const handleConfirm = () => {
    router.push('/scoring');
  };

  return (
    <View style={styles.root}>
      {/* Full-bleed photo — 65% of screen height */}
      <Image
        source={{ uri: imageUri }}
        style={[styles.photo, { height: height * 0.65 }]}
        resizeMode="cover"
      />

      {/* Bottom panel */}
      <SafeAreaView edges={['bottom']} style={styles.panel}>
        {/* Visibility row */}
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

        {/* Confirm button */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmButtonText}>Score this spot</Text>
        </TouchableOpacity>

        {/* Back link */}
        <TouchableOpacity style={styles.backLink} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={14} color="#999" />
          <Text style={styles.backLinkText}>Choose a different photo</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Privacy picker bottom sheet */}
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
              onPress={() => setPrivacy(opt.value)}
              activeOpacity={0.7}
            >
              <Ionicons name={opt.icon} size={20} color={colors.mid} style={styles.optionIcon} />
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
              </View>
              <View style={[styles.radioOuter, privacy === opt.value && styles.radioOuterActive]}>
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
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: 12,
    padding: 14,
  },
  visibilityIcon: {
    marginRight: 12,
  },
  visibilityText: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 1,
  },
  visibilitySubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.deep,
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
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
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.inputBorder,
    gap: 12,
  },
  optionIcon: {
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.deep,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioOuterActive: {
    borderColor: colors.mid,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.mid,
  },
  doneButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
