import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../constants/theme';

type Scope = 'Friends' | 'State' | 'Country' | 'Global';
type Category = 'Top Score' | 'Most Spots' | 'Best Average';
const SCOPES: Scope[] = ['Friends', 'State', 'Country', 'Global'];
const CATEGORIES: Category[] = ['Top Score', 'Most Spots', 'Best Average'];

interface LeaderRow {
  user_id: string;
  username: string;
  level: number;
  metric: number;
}

const RANK_COLORS: Record<number, string> = {
  1: colors.mid,
  2: '#888780',
  3: '#854F0B',
};

function AvatarInitials({ username, size }: { username: string; size: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>
        {username.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>('Global');
  const [category, setCategory] = useState<Category>('Top Score');
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [myRow, setMyRow] = useState<(LeaderRow & { rank: number }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { initUser(); }, []);
  useEffect(() => { if (userId) loadLeaderboard(userId); }, [scope, category, userId]);

  const initUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) { setUserId(data.user.id); await loadLeaderboard(data.user.id); }
  };

  const loadLeaderboard = async (uid: string) => {
    setLoading(true);
    try {
      let data: LeaderRow[] = [];

      if (category === 'Top Score') {
        const { data: raw } = await supabase.rpc
          ? await supabase
              .from('spots')
              .select('user_id, score_total, profiles(username, level)')
              .eq('privacy', 'public')
              .eq('moderation_pass', true)
              .order('score_total', { ascending: false })
              .limit(50)
          : { data: null };

        const seen = new Set<string>();
        data = ((raw ?? []) as Array<Record<string, unknown>>).reduce<LeaderRow[]>((acc, row) => {
          const uid2 = row.user_id as string;
          if (!seen.has(uid2)) {
            seen.add(uid2);
            const profile = row.profiles as { username: string; level: number } | null;
            acc.push({
              user_id: uid2,
              username: profile?.username ?? 'Unknown',
              level: profile?.level ?? 1,
              metric: Math.round(row.score_total as number),
            });
          }
          return acc;
        }, []);
      } else if (category === 'Most Spots') {
        const { data: raw } = await supabase
          .from('spots')
          .select('user_id, profiles(username, level)')
          .eq('privacy', 'public')
          .eq('moderation_pass', true);

        const counts: Record<string, { username: string; level: number; count: number }> = {};
        ((raw ?? []) as Array<Record<string, unknown>>).forEach((row) => {
          const uid2 = row.user_id as string;
          const profile = row.profiles as { username: string; level: number } | null;
          if (!counts[uid2]) counts[uid2] = { username: profile?.username ?? '?', level: profile?.level ?? 1, count: 0 };
          counts[uid2].count++;
        });
        data = Object.entries(counts)
          .map(([user_id, v]) => ({ user_id, username: v.username, level: v.level, metric: v.count }))
          .sort((a, b) => b.metric - a.metric)
          .slice(0, 50);
      } else {
        // Best Average (min 3 spots)
        const { data: raw } = await supabase
          .from('spots')
          .select('user_id, score_total, profiles(username, level)')
          .eq('privacy', 'public')
          .eq('moderation_pass', true);

        const agg: Record<string, { username: string; level: number; total: number; count: number }> = {};
        ((raw ?? []) as Array<Record<string, unknown>>).forEach((row) => {
          const uid2 = row.user_id as string;
          const profile = row.profiles as { username: string; level: number } | null;
          if (!agg[uid2]) agg[uid2] = { username: profile?.username ?? '?', level: profile?.level ?? 1, total: 0, count: 0 };
          agg[uid2].total += row.score_total as number;
          agg[uid2].count++;
        });
        data = Object.entries(agg)
          .filter(([, v]) => v.count >= 3)
          .map(([user_id, v]) => ({ user_id, username: v.username, level: v.level, metric: Math.round(v.total / v.count) }))
          .sort((a, b) => b.metric - a.metric)
          .slice(0, 50);
      }

      setRows(data);
      const myIdx = data.findIndex((r) => r.user_id === uid);
      if (myIdx >= 0) setMyRow({ ...data[myIdx], rank: myIdx + 1 });
      else setMyRow(null);
    } finally {
      setLoading(false);
    }
  };

  const metricLabel = category === 'Top Score' ? 'pts' : category === 'Most Spots' ? 'spots' : 'avg';

  const renderRow = ({ item, index }: { item: LeaderRow; index: number }) => {
    const rank = index + 1;
    const rankColor = RANK_COLORS[rank] ?? '#999';
    const isMe = item.user_id === userId;

    return (
      <TouchableOpacity
        style={[styles.row, isMe && styles.rowMe]}
        onPress={() => router.push(`/profile/${item.user_id}`)}
        activeOpacity={0.75}
      >
        <Text style={[styles.rank, { color: rankColor }]}>{rank}</Text>
        <AvatarInitials username={item.username} size={44} />
        <View style={styles.rowInfo}>
          <Text style={styles.rowUsername}>{item.username}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv {item.level}</Text>
          </View>
        </View>
        <Text style={styles.metric}>{item.metric}</Text>
        <Text style={styles.metricLabel}>{metricLabel}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Leaderboard</Text>
      </View>

      {/* Scope tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {SCOPES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.pill, scope === s && styles.pillActive]}
            onPress={() => setScope(s)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, scope === s && styles.pillTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pillRow, { paddingBottom: 8 }]}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.pill, category === c && styles.pillActive]}
            onPress={() => setCategory(c)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.user_id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No data yet.</Text>
            </View>
          }
        />
      )}

      {/* Your position sticky row */}
      {myRow && (
        <View style={styles.myPosition}>
          <Text style={[styles.rank, { color: colors.mid }]}>{myRow.rank}</Text>
          <AvatarInitials username={myRow.username} size={36} />
          <View style={styles.rowInfo}>
            <Text style={[styles.rowUsername, { color: colors.text }]}>{myRow.username}</Text>
            <Text style={styles.youLabel}>You</Text>
          </View>
          <Text style={styles.metric}>{myRow.metric}</Text>
          <Text style={styles.metricLabel}>{metricLabel}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 6 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  pillRow: { paddingHorizontal: 14, paddingVertical: 6, gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.primary },
  pillActive: { backgroundColor: colors.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.mid },
  pillTextActive: { color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#999' },
  listContent: { paddingBottom: 16 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.light, marginHorizontal: 18 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12, gap: 12,
  },
  rowMe: { backgroundColor: '#FFFBEE' },
  rank: { fontSize: 20, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  avatar: { backgroundColor: colors.light, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', color: colors.mid },
  rowInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowUsername: { fontSize: 14, fontWeight: '600', color: colors.text },
  levelBadge: { backgroundColor: colors.light, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  levelText: { fontSize: 11, fontWeight: '600', color: colors.mid },
  metric: { fontSize: 22, fontWeight: '700', color: colors.mid },
  metricLabel: { fontSize: 11, fontWeight: '500', color: '#999', marginLeft: -8 },
  myPosition: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.light, borderTopWidth: 1, borderTopColor: colors.primary,
    paddingHorizontal: 18, paddingVertical: 12, gap: 12,
  },
  youLabel: { fontSize: 11, fontWeight: '500', color: '#999' },
});
