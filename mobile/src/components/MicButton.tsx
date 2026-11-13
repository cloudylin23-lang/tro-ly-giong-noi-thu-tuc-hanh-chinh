import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { copy } from '@/copy';
import type { VoiceState } from '@/hooks/useVoiceInput';
import { colors, font, space } from '@/theme';
import { AppText } from './AppText';

const SIZE = 188;

/** Nút mic tròn lớn. Đỏ = sẵn sàng / đang nghe (có vòng nhấp nháy). */
export function MicButton({
  state,
  busy,
  onPress,
  durationMs,
}: {
  state: VoiceState;
  busy?: boolean; // AI đang xử lý
  onPress: () => void;
  durationMs?: number;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const recording = state === 'recording';
  const working = state === 'transcribing' || busy;

  useEffect(() => {
    if (!recording) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [recording, pulse]);

  const label = recording
    ? `${copy.mic.recording} ${Math.floor((durationMs ?? 0) / 1000)}s`
    : state === 'transcribing'
      ? copy.mic.transcribing
      : busy
        ? copy.mic.thinking
        : copy.mic.idle;

  return (
    <View style={styles.wrap}>
      <View style={styles.circleWrap}>
        {recording && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
              },
            ]}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          disabled={working}
          onPress={onPress}
          style={({ pressed }) => [
            styles.circle,
            { backgroundColor: pressed ? colors.recordPressed : colors.record },
            recording && styles.recording,
            working && styles.working,
          ]}
        >
          {working ? (
            <ActivityIndicator size="large" color={colors.onPrimary} />
          ) : (
            <AppText style={styles.icon}>{recording ? '■' : '🎤'}</AppText>
          )}
        </Pressable>
      </View>
      <AppText style={styles.label} accessibilityLiveRegion="polite">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md, paddingVertical: space.md },
  circleWrap: { width: SIZE * 1.5, height: SIZE * 1.5, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.record,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  recording: { borderWidth: 8, borderColor: '#FFD5D5' },
  working: { backgroundColor: colors.textMuted },
  icon: { fontSize: 76, lineHeight: 92, color: colors.onPrimary },
  label: { fontSize: font.lg, fontWeight: '700', textAlign: 'center' },
});
