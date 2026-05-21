import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors } from '../../constants/theme';
import { Spot } from '../../types/spot';
import { getLevelName } from '../../constants/levels';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type SortFilter = 'Most Recent' | 'Best Score' | 'Elevation' | 'Hydration' | 'Danger';
type PrivacyFilter = 'All' | 'Public' | 'Streamers' | 'Private';

const SORT_FILTERS: SortFilter[] = ['Most Recent', 'Best Score', 'Elevation', 'Hydration', 'Danger'];
const PRIVACY_FILTERS: PrivacyFilter[] = ['All', 'Public', 'Streamers', 'Private'];
const PRIVACY_ICONS: Record<string, IoniconName> = {
  public: 'earth-outline', streamers: 'people-outline', private: 'lock-closed-outline',
};

const LEVEL_XP_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 9400, 12000];
function nextLevelXP(level: number): number {
  return LEVEL_XP_THRESHOLDS[level] ?? LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1] * 1.5;
}

interface Profile {
  id: string; username: string; display_name: string | null;
  avatar_url: string | null; level: number; xp: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cellSize = (width - 3) / 3;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [filteredSpots, setFilteredSpots] = useState<Spot[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortFilter, setSortFilter] = useState<SortFilter>('Most Recent');
  const [privacyFilter, setPrivacyFilter] = useState<PrivacyFilter>('All');

  useEffect(() => { initProfile(); }, []);

  useFocusEffect(
    useCallback(() => { initProfile(); }, []),
  );

  const initProfile = async () => {
    const { data: ud } = await supabase.auth.getUser();
    if (!ud.user) return;
    const uid = ud.user.id;
    setLoading(true);
    try {
      const [profileRes, spotsRes, followersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('spots').select('*').eq('user_id', uid).order('submitted_at', { ascending: false }),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', uid),
      ]);
      if (profileRes.data) setProfile(profileRes.data as Profile);
      const allSpots = (spotsRes.data ?? []) as Spot[];
      setSpots(allSpots);
      applyFilters(allSpots, sortFilter, privacyFilter);
      setFollowerCount(followersRes.count ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (allSpots: Spot[], sort: SortFilter, privacy: PrivacyFilter) => {
    let result = [...allSpots];
    if (privacy !== 'All') result = result.filter((s) => s.privacy === privacy.toLowerCase());
    switch (sort) {
      case 'Best Score':   result.sort((a, b) => b.score_total - a.score_total); break;
      case 'Elevation':    result.sort((a, b) => (b.altitude_ft ?? 0) - (a.altitude_ft ?? 0)); break;
      case 'Hydration':    result.sort((a, b) => b.bonus_hydration - a.bonus_hydration); break;
      case 'Danger':       result.sort((a, b) => b.bonus_danger - a.bonus_danger); break;
      default:             break; // Most Recent — already ordered
    }
    setFilteredSpots(result);
  };

  const handleSortChange = (s: SortFilter) => { setSortFilter(s); applyFilters(spots, s, privacyFilter); };
  const handlePrivacyChange = (p: PrivacyFilter) => { setPrivacyFilter(p); applyFilters(spots, sortFilter, p); };

  const bestScore = spots.reduce((max, s) => Math.max(max, s.score_total), 0);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (!profile) {
    return <View style={styles.center}><Text style={{ color: '#999' }}>Could not load profile.</Text></View>;
  }

  const xpForNext = nextLevelXP(profile.level);
  const xpProgress = Math.min(profile.xp / xpForNext, 1);

  const renderHeader = () => (
    <View>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        {/* Top row: avatar + stats + settings */}
        <View style={styles.headerTopRow}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{profile.username.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.statsRow}>
            {[
              { value: spots.length, label: 'Spots' },
              { value: followerCount, label: 'Streamers' },
              { value: Math.round(bestScore), label: 'Best' },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.levelLabel}>Lv {profile.level} · {getLevelName(profile.level)}</Text>

        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpProgress * 100}%` }]} />
        </View>
        <Text style={styles.xpLabel}>{profile.xp} / {xpForNext} XP</Text>
      </View>

      {/* Sort filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {SORT_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, sortFilter === f && styles.pillActive]}
            onPress={() => handleSortChange(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, sortFilter === f && styles.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Privacy filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pillRow, { paddingBottom: 6 }]}>
        {PRIVACY_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, privacyFilter === f && styles.pillActive]}
            onPress={() => handlePrivacyChange(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, privacyFilter === f && styles.pillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (filteredSpots.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {renderHeader()}
        <View style={styles.empty}>
          <Ionicons name="camera-outline" size={48} color={colors.primary} />
          <Text style={styles.emptyTitle}>No spots yet.</Text>
          <Text style={styles.emptyBody}>Submit your first spot.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={filteredSpots}
        numColumns={3}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={{ gap: 1.5 }}
        ItemSeparatorComponent={() => <View style={{ height: 1.5 }} />}
        renderItem={({ item }) => {
          const privacyIcon = PRIVACY_ICONS[item.privacy] ?? 'earth-outline';
          return (
            <TouchableOpacity
              style={{ width: cellSize, height: cellSize }}
              onPress={() => router.push(`/spot/${item.id}`)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.image_url }} style={styles.gridImage} resizeMode="cover" />
              <View style={styles.gridScoreBadge}>
                <Text style={styles.gridScoreText}>{Math.round(item.score_total)}</Text>
              </View>
              <View style={styles.gridPrivacyIcon}>
                <Ionicons name={privacyIcon} size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileHeader: { padding: 20 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  bigAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.light, alignItems: 'center', justifyContent: 'center',
  },
  bigAvatarText: { fontSize: 28, fontWeight: '700', color: colors.mid },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, fontWeight: '400', color: '#999', marginTop: 2 },
  settingsBtn: { paddingLeft: 12, paddingTop: 4 },
  username: { fontSize: 18, fontWeight: '700', color: colors.text },
  levelLabel: { fontSize: 13, fontWeight: '500', color: colors.mid, marginTop: 4 },
  xpTrack: {
    height: 4, backgroundColor: colors.light, borderRadius: 4,
    marginTop: 8, overflow: 'hidden',
  },
  xpFill: { height: 4, backgroundColor: colors.primary, borderRadius: 4 },
  xpLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  pillRow: { paddingHorizontal: 14, paddingVertical: 6, gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.primary },
  pillActive: { backgroundColor: colors.primary },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.mid },
  pillTextActive: { color: colors.text },
  gridImage: { width: '100%', height: '100%' },
  gridScoreBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  gridScoreText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  gridPrivacyIcon: { position: 'absolute', top: 4, left: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyBody: { fontSize: 14, color: '#999' },
});
