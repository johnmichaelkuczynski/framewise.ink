import React, { useState } from 'react';
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

interface Conversation {
  id: number;
  mode: 'free' | 'real' | 'virtual';
  personId: number | null;
  virtualPersonId: number | null;
  title: string | null;
  personName: string | null;
  createdAt: string;
  updatedAt: string;
}

const MODE_LABELS: Record<string, string> = {
  free: 'Free coach',
  real: 'Person',
  virtual: 'Virtual',
};

const MODE_ICONS: Record<string, string> = {
  free: 'zap',
  real: 'user',
  virtual: 'cpu',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ConversationRow({
  convo,
  colors,
}: {
  convo: Conversation;
  colors: ReturnType<typeof useColors>;
}) {
  const iconName = (MODE_ICONS[convo.mode] ?? 'message-circle') as React.ComponentProps<typeof Feather>['name'];

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={iconName} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text
          style={[styles.rowTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
          numberOfLines={1}
        >
          {convo.title ?? (convo.personName ? `Chat with ${convo.personName}` : 'Coaching session')}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {MODE_LABELS[convo.mode] ?? convo.mode}
          {convo.personName ? ` · ${convo.personName}` : ''}
        </Text>
      </View>
      <Text style={[styles.rowDate, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {formatDate(convo.createdAt)}
      </Text>
    </View>
  );
}

function AuthGate({ login }: { login: () => Promise<void> }) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

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
        <Feather name="clock" size={28} color={colors.primary} />
      </View>
      <Text style={[styles.gateTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        Sign in to view History
      </Text>
      <Text style={[styles.gateSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        Every coaching session is saved so you can review and learn from past messages.
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

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading, login } = useAuth();

  const {
    data: conversations,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<Conversation[]>('/api/conversations'),
    enabled: !!user,
    retry: false,
  });

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          History
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
            Could not load history
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
      ) : !conversations?.length ? (
        <View style={styles.center}>
          <Feather name="clock" size={48} color={colors.primary} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            No history yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Conversations from the FrameWise web app will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <ConversationRow convo={item} colors={colors} />}
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
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15 },
  rowMeta: { fontSize: 12 },
  rowDate: { fontSize: 12, flexShrink: 0 },
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
