import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

// Each dot is its own component so hooks are called at the top level of a component
function Dot({ delay }: { delay: number }) {
  const colors = useColors();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withDelay(delay, withTiming(1, { duration: 350 })),
        withTiming(0.3, { duration: 350 }),
      ),
      -1,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: opacity.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: colors.mutedForeground },
        animStyle,
      ]}
    />
  );
}

export function TypingIndicator() {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Dot delay={0} />
      <Dot delay={200} />
      <Dot delay={400} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
