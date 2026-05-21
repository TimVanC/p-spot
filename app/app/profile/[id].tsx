import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors } from '../../constants/theme';
import { Spot } from '../../types/spot';
import { getLevelName } from '../../constants/levels';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const PRIVACY_ICONS: Record<string, IoniconName> = {
  public: 'earth-outline', streamers: 'people-outline', private: 'lock-closed-outline',
};

interface Profile {
  id: string; username: string; display_name: string | null;
  avatar_url: string | null; level: number; xp: number;
}

export default function OtherProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cellSize = (width - 3) / 3;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    const { data: ud } = await supabase.auth.getUser();
    const myId = ud.user?.id ?? null;
    setCurrentUserId(myId);

    const [profileRes, followersRes, followCheckRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', id),
      myId
        ? supabase.from('followers').select('*').eq('follower_id', myId).eq('following_id', id).single()
        : Promise.resolve({ data: null }),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    setFollowerCount(followersRes.count ?? 0);
    setIsFollowing(!!followCheckRes.data);

    // Fetch spots: public + streamers if following
    let spotsQuery = supabase
      .from('spots')
      .select('*')
      .eq('user_id', id)
      .eq('moderation_pass', true)
      .order('submitted_at', { ascending: false });

    if (followCheckRes.data) {
      spotsQuery = spotsQuery.in('privacy', ['public', 'streamers']);
    } else {
      spotsQuery = spotsQuery.eq('privacy', 'public');
    }

    const { data: spotsData } = await spotsQuery;
    setSpots((spotsData ?? []) as Spot[]);
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!currentUserId) return;
    if (isFollowing) {
      setIsFollowing(false);
      setFollowerCount((c) => c - 1);
      await supabase.from('followers').delete().eq('follower_id', currentUserId).eq('following_id', id);
    } else {
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
      await supabase.from('followers').upsert({ follower_id: currentUserId, following_id: id });
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (!profile) {
    return <View style={styles.center}><Text style={{ color: '#999' }}>User not found.</Text></View>;
  }

  const bestScore = spots.reduce((max, s) => Math.max(max, s.score_total), 0);
  const isMe = currentUserId === id;

  const header = (
    <View>
      {/* Floating back button */}
      <View style={[styles.floatingBack, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileHeader}>
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
          {!isMe && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={toggleFollow}
              activeOpacity={0.85}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.levelLabel}>Lv {profile.level} · {getLevelName(profile.level)}</Text>
      </View>
    </View>
  );

  if (spots.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        {header}
        <View style={styles.empty}>
          <Ionicons name="camera-outline" size={48} color={colors.primary} />
          <Text style={styles.emptyTitle}>No public spots yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <FlatList
        data={spots}
        numColumns={3}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap: 1.5 }}
        ItemSeparatorComponent={() => <View style={{ height: 1.5 }} />}
        renderItem={({ item }) => (
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
              <Ionicons name={PRIVACY_ICONS[item.privacy] ?? 'earth-outline'} size={12} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  floatingBack: { paddingHorizontal: 16, paddingBottom: 4 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  profileHeader: { padding: 20 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  bigAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.light, alignItems: 'center', justifyContent: 'center',
  },
  bigAvatarText: { fontSize: 28, fontWeight: '700', color: colors.mid },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  followBtn: {
    paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: colors.primary, alignSelf: 'flex-start', marginTop: 4,
  },
  followBtnActive: { backgroundColor: colors.primary },
  followBtnText: { fontSize: 13, fontWeight: '600', color: colors.mid },
  followBtnTextActive: { color: colors.text },
  username: { fontSize: 18, fontWeight: '700', color: colors.text },
  levelLabel: { fontSize: 13, fontWeight: '500', color: colors.mid, marginTop: 4 },
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
});
