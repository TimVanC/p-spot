import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL from '@rnmapbox/maps';
import { supabase } from '../../lib/supabase';
import { colors, fontNames } from '../../constants/theme';
import { Spot } from '../../types/spot';
import { timeAgo, formatCoords } from '../../lib/utils';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type TabView = 'map' | 'list';

const PRIVACY_ICONS: Record<string, IoniconName> = {
  public: 'earth-outline',
  streamers: 'people-outline',
  private: 'lock-closed-outline',
};

function ScorePin({ score }: { score: number }) {
  return (
    <View style={pinStyles.wrapper}>
      <View style={pinStyles.bubble}>
        <Text style={pinStyles.text}>{Math.round(score ?? 0)}</Text>
      </View>
      <View style={pinStyles.arrow} />
    </View>
  );
}

const pinStyles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  bubble: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    minWidth: 38,
    alignItems: 'center',
  },
  text: { fontSize: 13, fontWeight: '700', color: colors.mid },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    marginTop: -1,
  },
});

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabView>('map');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [mySpots, setMySpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    initUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadData(userId, false);
      }
    }, [userId]),
  );

  const initUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setUserId(data.user.id);
      await loadData(data.user.id, true);
    }
  };

  const loadData = async (uid: string, showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      await Promise.all([fetchSpots(uid), fetchNotificationBadge(uid)]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSpots = async (uid: string) => {
    try {
      const { data: follows } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', uid);

      const followingIds = (follows ?? []).map((f: { following_id: string }) => f.following_id);

      let orClause = `privacy.eq.public,user_id.eq.${uid}`;
      if (followingIds.length > 0) {
        orClause += `,and(privacy.eq.streamers,user_id.in.(${followingIds.join(',')}))`;
      }

      const { data } = await supabase
        .from('spots')
        .select('*')
        .eq('moderation_pass', true)
        .or(orClause)
        .order('submitted_at', { ascending: false })
        .limit(200);

      const all = (data ?? []) as Spot[];
      setSpots(all);
      setMySpots(all.filter((s) => s.user_id === uid));
    } catch (err) {
      console.error('[home] fetchSpots error:', err);
    }
  };

  const fetchNotificationBadge = async (uid: string) => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('read', false);
      setHasUnread((count ?? 0) > 0);
    } catch {}
  };

  const onRefresh = () => {
    if (!userId) return;
    setRefreshing(true);
    loadData(userId, false);
  };

  const renderSpotRow = ({ item }: { item: Spot }) => {
    const locationText = item.location_name ?? formatCoords(item.lat, item.lng);
    const privacyIcon = PRIVACY_ICONS[item.privacy] ?? 'earth-outline';

    return (
      <TouchableOpacity
        style={rowStyles.row}
        onPress={() => router.push(`/spot/${item.id}`)}
        activeOpacity={0.75}
      >
        <Image source={{ uri: item.image_url }} style={rowStyles.thumb} resizeMode="cover" />
        <View style={rowStyles.info}>
          <Text style={rowStyles.location} numberOfLines={1}>{locationText}</Text>
          <View style={rowStyles.meta}>
            <Text style={rowStyles.time}>{timeAgo(item.submitted_at)}</Text>
            <Ionicons name={privacyIcon} size={12} color="#999" style={rowStyles.privacyIcon} />
          </View>
        </View>
        <Text style={rowStyles.score}>{Math.round(item.score_total)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>P Spot.</Text>
        <TouchableOpacity
          style={styles.bellWrapper}
          onPress={() => router.push('/notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {hasUnread && <View style={styles.badge} />}
        </TouchableOpacity>
      </View>

      {/* Toggle pills */}
      <View style={styles.toggleRow}>
        {(['map', 'list'] as TabView[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.pill, activeTab === t && styles.pillActive]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeTab === t && styles.pillTextActive]}>
              {t === 'map' ? 'Map' : 'My Spots'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'map' ? (
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <MapboxGL.MapView
              style={styles.map}
              styleURL={MapboxGL.StyleURL.Light}
              logoEnabled={false}
              attributionEnabled={false}
            >
              <MapboxGL.Camera
                defaultSettings={{ centerCoordinate: [-98.5, 39.5], zoomLevel: 3 }}
              />
              {spots.map((spot) => (
                <MapboxGL.PointAnnotation
                  key={spot.id}
                  id={spot.id}
                  coordinate={[spot.lng, spot.lat]}
                  onSelected={() => router.push(`/spot/${spot.id}`)}
                >
                  <ScorePin score={spot.score_total} />
                </MapboxGL.PointAnnotation>
              ))}
            </MapboxGL.MapView>
          )
        ) : (
          <FlatList
            data={mySpots}
            keyExtractor={(item) => item.id}
            renderItem={renderSpotRow}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No spots yet. Go find one.</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  wordmark: {
    fontFamily: fontNames.syne,
    fontSize: 22,
    color: colors.text,
  },
  bellWrapper: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.mid },
  pillTextActive: { color: colors.text },
  content: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 32 },
  separator: { height: 1, backgroundColor: colors.light, marginVertical: 2 },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '400', color: '#999' },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.light,
  },
  info: { flex: 1, gap: 4 },
  location: { fontSize: 14, fontWeight: '500', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { fontSize: 12, fontWeight: '400', color: '#999' },
  privacyIcon: { marginLeft: 2 },
  score: {
    fontFamily: fontNames.syne,
    fontSize: 22,
    fontWeight: '700',
    color: colors.mid,
    minWidth: 40,
    textAlign: 'right',
  },
});
