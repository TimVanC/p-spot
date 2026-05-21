import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Share,
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
import { timeAgo, formatCoords } from '../../lib/utils';
import { buildShareMessage } from '../../lib/scoring-utils';
import { ScoreResult } from '../../types/scoring';

type FilterTab = 'All' | 'Following' | '90+' | 'Nearby';
const FILTERS: FilterTab[] = ['All', 'Following', '90+', 'Nearby'];

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatarCircle, { backgroundColor: '#eee' }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 12, width: 100, backgroundColor: '#eee', borderRadius: 4 }} />
          <View style={{ height: 10, width: 140, backgroundColor: '#f4f4f4', borderRadius: 4 }} />
        </View>
      </View>
      <View style={{ height: 240, backgroundColor: '#eee' }} />
      <View style={[styles.cardFooter, { gap: 8 }]}>
        <View style={{ height: 12, width: 60, backgroundColor: '#eee', borderRadius: 4 }} />
        <View style={{ height: 12, width: 60, backgroundColor: '#eee', borderRadius: 4 }} />
      </View>
    </View>
  );
}

interface CardPost extends Spot {
  poster_username?: string;
  poster_avatar?: string | null;
  is_following?: boolean;
}

function AvatarInitials({ username, size }: { username: string; size: number }) {
  return (
    <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
        {username.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

export default function StreamScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [posts, setPosts] = useState<CardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [shakenIds, setShakenIds] = useState<Set<string>>(new Set());

  useEffect(() => { initUser(); }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) loadFeed(userId, activeFilter, false);
    }, [userId, activeFilter]),
  );

  const initUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUserId(data.user.id);
      await loadFeed(data.user.id, activeFilter, true);
    }
  };

  const loadFeed = async (uid: string, filter: FilterTab, showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      const { data: follows } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', uid);
      const followingIds = (follows ?? []).map((f: { following_id: string }) => f.following_id);

      let query = supabase
        .from('spots')
        .select('*, profiles(username, avatar_url)')
        .eq('moderation_pass', true)
        .order('submitted_at', { ascending: false })
        .limit(50);

      if (filter === 'Following' && followingIds.length > 0) {
        query = query.in('user_id', followingIds);
      } else if (filter === 'Following') {
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      } else if (filter === '90+') {
        query = query.gte('score_total', 90);
        let orClause = `privacy.eq.public,user_id.eq.${uid}`;
        if (followingIds.length > 0) orClause += `,and(privacy.eq.streamers,user_id.in.(${followingIds.join(',')}))`;
        query = query.or(orClause);
      } else {
        let orClause = `privacy.eq.public,user_id.eq.${uid}`;
        if (followingIds.length > 0) orClause += `,and(privacy.eq.streamers,user_id.in.(${followingIds.join(',')}))`;
        query = query.or(orClause);
      }

      const { data } = await query;

      // Get shaken spot IDs
      const { data: shaken } = await supabase
        .from('shakes').select('spot_id').eq('user_id', uid);
      setShakenIds(new Set((shaken ?? []).map((s: { spot_id: string }) => s.spot_id)));

      // Check which posters the user follows
      const followSet = new Set(followingIds);
      const mapped: CardPost[] = (data ?? []).map((row: Record<string, unknown>) => {
        const profile = row.profiles as { username: string; avatar_url: string | null } | null;
        return {
          ...(row as unknown as Spot),
          poster_username: profile?.username ?? 'unknown',
          poster_avatar: profile?.avatar_url ?? null,
          is_following: followSet.has(row.user_id as string),
        };
      });
      setPosts(mapped);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFollow = async (postUserId: string) => {
    if (!userId) return;
    await supabase.from('followers').insert({ follower_id: userId, following_id: postUserId });
    setPosts((prev) =>
      prev.map((p) => (p.user_id === postUserId ? { ...p, is_following: true } : p)),
    );
  };

  const handleShake = async (spotId: string, currentCount: number) => {
    if (!userId) return;
    const alreadyShaken = shakenIds.has(spotId);
    if (alreadyShaken) {
      setShakenIds((prev) => { const s = new Set(prev); s.delete(spotId); return s; });
      setPosts((prev) => prev.map((p) => p.id === spotId ? { ...p, shake_count: p.shake_count - 1 } : p));
      await supabase.from('shakes').delete().eq('user_id', userId).eq('spot_id', spotId);
    } else {
      setShakenIds((prev) => new Set(prev).add(spotId));
      setPosts((prev) => prev.map((p) => p.id === spotId ? { ...p, shake_count: p.shake_count + 1 } : p));
      await supabase.from('shakes').insert({ user_id: userId, spot_id: spotId });
    }
  };

  const handleShare = async (post: CardPost) => {
    const sr: ScoreResult = {
      moderation_pass: true, score_view: post.score_view, score_elevation: post.score_elevation,
      score_remoteness: post.score_remoteness, score_lighting: post.score_lighting,
      bonus_skyline: post.bonus_skyline, bonus_sunrise: post.bonus_sunrise,
      bonus_wildlife: post.bonus_wildlife, bonus_girth: post.bonus_girth,
      bonus_hydration: post.bonus_hydration, bonus_danger: post.bonus_danger,
      bonus_toilet: post.bonus_toilet, bonus_effort: post.bonus_effort,
      wildlife_detected: post.wildlife_detected, pee_detected: post.pee_detected ?? false,
      score_tier: post.score_tier as ScoreResult['score_tier'],
      ai_quote: post.ai_quote ?? '', score_total: post.score_total,
    };
    await Share.share({ message: buildShareMessage(sr, post.share_token) });
  };

  const renderCard = ({ item }: { item: CardPost }) => {
    const isMe = item.user_id === userId;
    const location = item.location_name ?? formatCoords(item.lat, item.lng);
    const shaken = shakenIds.has(item.id);

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <AvatarInitials username={item.poster_username ?? '?'} size={38} />
          <View style={styles.headerText}>
            <Text style={styles.username}>{item.poster_username}</Text>
            <Text style={styles.location} numberOfLines={1}>{location}</Text>
          </View>
          <Text style={styles.timeAgo}>{timeAgo(item.submitted_at)}</Text>
          {!isMe && !item.is_following && (
            <TouchableOpacity
              style={styles.followPill}
              onPress={() => handleFollow(item.user_id)}
              activeOpacity={0.8}
            >
              <Text style={styles.followPillText}>Follow</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Image */}
        <TouchableOpacity onPress={() => router.push(`/spot/${item.id}`)} activeOpacity={0.95}>
          <View>
            <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>{Math.round(item.score_total)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.footerBtn} onPress={() => handleShake(item.id, item.shake_count)} activeOpacity={0.7}>
            <Ionicons name={shaken ? 'water' : 'water-outline'} size={18} color={shaken ? colors.mid : '#999'} />
            <Text style={[styles.footerBtnText, shaken && { color: colors.mid }]}>{item.shake_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn} onPress={() => router.push(`/spot/${item.id}`)} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={18} color="#999" />
            <Text style={styles.footerBtnText}>{item.drip_count}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerBtn, { marginLeft: 'auto' }]} onPress={() => handleShare(item)} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={18} color="#999" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>The Stream</Text>
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
            onPress={() => { setActiveFilter(f); if (userId) loadFeed(userId, f, true); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === f && styles.filterPillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(i) => String(i)}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { if (userId) { setRefreshing(true); loadFeed(userId, activeFilter, false); } }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="water-outline" size={48} color={colors.primary} />
              <Text style={styles.emptyTitle}>Nothing flowing yet.</Text>
              <Text style={styles.emptyBody}>Follow some Streamers or submit your first spot.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9f9f7' },
  topBar: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  filterRow: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: colors.primary,
  },
  filterPillActive: { backgroundColor: colors.primary },
  filterPillText: { fontSize: 13, fontWeight: '600', color: colors.mid },
  filterPillTextActive: { color: colors.text },
  listContent: { paddingBottom: 32 },
  card: {
    backgroundColor: colors.white, marginHorizontal: 14, marginVertical: 6,
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 10,
  },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.light, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: colors.mid },
  headerText: { flex: 1 },
  username: { fontSize: 14, fontWeight: '600', color: colors.text },
  location: { fontSize: 12, color: '#999', marginTop: 1 },
  timeAgo: { fontSize: 11, color: '#bbb' },
  followPill: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: colors.primary, marginLeft: 6,
  },
  followPillText: { fontSize: 12, fontWeight: '600', color: colors.mid },
  cardImage: { width: '100%', height: 240 },
  scoreBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: colors.text, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  scoreBadgeText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 16,
  },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerBtnText: { fontSize: 14, fontWeight: '500', color: '#999' },
  empty: { paddingTop: 80, alignItems: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyBody: { fontSize: 14, color: '#999', textAlign: 'center' },
});
