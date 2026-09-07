import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { TypingIndicator } from '@/components/TypingIndicator';
import { streamFreeChat } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

let counter = 0;
function uid(): string {
  counter++;
  return `m-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 9)}`;
}

function MessageBubble({ message }: { message: Message }) {
  const colors = useColors();
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleAssistant, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            {
              color: isUser ? colors.primaryForeground : colors.foreground,
              fontFamily: 'Inter_400Regular',
            },
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || isStreaming) return;

    setDraft('');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: uid(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    let fullContent = '';
    let assistantAdded = false;

    try {
      await streamFreeChat(text, chunk => {
        fullContent += chunk;

        if (!assistantAdded) {
          setShowTyping(false);
          setMessages(prev => [
            ...prev,
            { id: uid(), role: 'assistant', content: fullContent },
          ]);
          assistantAdded = true;
        } else {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: fullContent,
            };
            return updated;
          });
        }
      });
    } catch {
      setShowTyping(false);
      if (!assistantAdded) {
        setMessages(prev => [
          ...prev,
          { id: uid(), role: 'assistant', content: 'Connection error — please try again.' },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      inputRef.current?.focus();
    }
  }, [draft, isStreaming]);

  const reversed = [...messages].reverse();
  const hasMessages = messages.length > 0;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Dot grid texture */}
      <View
        style={[StyleSheet.absoluteFill, styles.dotGrid, { pointerEvents: 'none' }]}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.wordmark, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
          FrameWise
        </Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          precision communication coach
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {/* Messages or empty state */}
        {hasMessages ? (
          <FlatList
            data={reversed}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          />
        ) : (
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={48} color={colors.primary} style={{ opacity: 0.35 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              What do you need to say?
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Paste your draft below. FrameWise will diagnose it and rewrite it to land perfectly.
            </Text>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderColor: colors.border,
                fontFamily: 'Inter_400Regular',
              },
            ]}
            placeholder="Draft a message to coach…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={2000}
            value={draft}
            onChangeText={setDraft}
            blurOnSubmit={false}
            returnKeyType="default"
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || isStreaming}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor:
                  draft.trim() && !isStreaming ? colors.primary : colors.muted,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Feather name="arrow-up" size={20} color={colors.primaryForeground} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dotGrid: {
    opacity: 0.35,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 2,
  },
  wordmark: {
    fontSize: 22,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  kav: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyTitle: {
    fontSize: 22,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    lineHeight: 21,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
