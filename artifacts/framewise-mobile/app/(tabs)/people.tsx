import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

interface Person {
  id: number;
  name: string;
  relationship: string | null;
  gender: string | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: string;
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLORS = [
  '#D91E5A', '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444',
];

function avatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function PersonRow({ person, colors }: { person: Person; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarColor(person.id) }]}>
        <Text style={[styles.avatarText, { fontFamily: 'Inter_600SemiBold' }]}>
          {initials(person.name)}
        </Text>
      </View>
      {/* Info */}
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          {person.name}
        </Text>
        {person.relationship ? (
          <Text style={[styles.rowSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {person.relationship}
          </Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </View>
  );
}

function AuthGate({ login }: { login: () => Promise<void> }) {
  const colors = useColors();
  const [loading, setLoading] = React.useState(false);

  async function handleLogin() {
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await login();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.gate}>
      <View style={[styles.gateIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="lock" size={28} color={colors.primary} />
      </View>
      <Text style={[styles.gateTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        Sign in to view People
      </Text>
      <Text style={[styles.gateSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Build psychological profiles for the people you communicate with most.
      </Text>
      <Pressable
        onPress={handleLogin}
        disabled={loading}
        style={({ pressed }) => [
          styles.gateBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[styles.gateBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
            Sign in with Google
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function PeopleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading, login } = useAuth();

  const {
    data: persons,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<Person[]>({
    queryKey: ['persons'],
    queryFn: () => apiFetch<Person[]>('/api/persons'),
    enabled: !!user,
    retry: false,
  });

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          People
        </Text>
      </View>

      {authLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !user ? (
        <AuthGate login={login} />
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Could not load people
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.retryText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : !persons?.length ? (
        <View style={styles.center}>
          <Feather name="users" size={48} color={colors.primary} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            No people yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Add people from the FrameWise web app to start building profiles.
          </Text>
        </View>
      ) : (
        <FlatList
          data={persons}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <PersonRow person={item} colors={colors} />}
          contentContainerStyle={[
            styles.list,
            {
              paddingBottom:
                Platform.OS === 'web' ? 34 : insets.bottom + 16,
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 28 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 40,
  },
  errorText: { fontSize: 15, textAlign: 'center' },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { fontSize: 15 },
  emptyTitle: { fontSize: 20, textAlign: 'center' },
  emptySub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  list: { paddingTop: 8, paddingHorizontal: 16, gap: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16 },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 16 },
  rowSub: { fontSize: 13 },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  gateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gateTitle: { fontSize: 22, textAlign: 'center' },
  gateSub: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  gateBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  gateBtnText: { color: '#fff', fontSize: 16 },
});
