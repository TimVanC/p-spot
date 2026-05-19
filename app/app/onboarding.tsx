import { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontNames } from '../constants/theme';

interface Slide {
  icon: string;
  heading: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: '🏔️',
    heading: 'Find your spot.',
    body: "P Spot is the world's first leaderboard for epic outdoor pee locations. The better the view, the higher the score.",
  },
  {
    icon: '📊',
    heading: 'AI scores the view.',
    body: 'Our AI evaluates elevation, scenic quality, remoteness, danger, hydration, and secret easter eggs like wildlife in the background.',
  },
  {
    icon: '💧',
    heading: 'Join The Stream.',
    body: 'Follow Streamers, collect Shakes, drop Drips, and climb the global leaderboard. Connect Strava for effort bonus points.',
  },
  {
    icon: '🛡️',
    heading: 'Keep it clean.',
    body: 'Landscape photos only. No private parts, ever. 3 strikes and you\'re out. You must be 18+ to use P Spot.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const router = useRouter();

  const isLast = currentIndex === SLIDES.length - 1;

  const handleNext = async () => {
    if (isLast) {
      await AsyncStorage.setItem('onboarding_complete', 'true');
      router.replace('/(auth)/signup');
    } else {
      const next = currentIndex + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={[styles.slide, { width }]}>
      <Text style={styles.icon}>{item.icon}</Text>
      <Text style={styles.heading}>{item.heading}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.buttonText}>
            {isLast ? 'Create account' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  icon: {
    fontSize: 64,
    marginBottom: 32,
  },
  heading: {
    fontFamily: fontNames.heading,
    fontSize: 32,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 38,
  },
  body: {
    fontFamily: fontNames.body,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.mid,
  },
  dotInactive: {
    width: 7,
    backgroundColor: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fontNames.heading,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
