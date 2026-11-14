import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { copy } from '@/copy';
import type { VoiceState } from '@/hooks/useVoiceInput';
import { colors, font, recorderDesign, space } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

const SIZE = 188;

/** Micro nét mảnh bằng View native, không phụ thuộc emoji của từng thiết bị. */
function MicrophoneOutline({ size }: { size: number }) {
  const stroke = recorderDesign.stroke;
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <View style={[styles.capsule, {
        width: size * 0.38, height: size * 0.64, top: 0, left: size * 0.31,
        borderWidth: stroke, borderRadius: size * 0.2,
      }]} />
      <View style={[styles.cradle, {
        width: size * 0.62, height: size * 0.46, left: size * 0.19, top: size * 0.32,
        borderWidth: stroke, borderTopWidth: 0, borderBottomLeftRadius: size * 0.32, borderBottomRightRadius: size * 0.32,
      }]} />
      <View style={[styles.iconLine, { width: stroke, height: size * 0.2, top: size * 0.77, left: (size - stroke) / 2 }]} />
      <View style={[styles.iconLine, { width: size * 0.42, height: stroke, top: size * 0.96, left: size * 0.29 }]} />
    </View>
  );
}

/** Nút mic tròn lớn. Đỏ = sẵn sàng / đang nghe (có vòng nhấp nháy). */
export function MicButton({
  state,
  busy,
  onPress,
  durationMs,
  appearance = 'recorder',
  scale = 1,
}: {
  state: VoiceState;
  busy?: boolean; // AI đang xử lý
  onPress: () => void;
  durationMs?: number;
  appearance?: 'compact' | 'recorder';
  scale?: number;
}) {
  const { width, height } = useWindowDimensions();
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

  if (appearance === 'recorder') {
    const preferredDiameter = height <= recorderDesign.compactHeight ? recorderDesign.compactDiameter : recorderDesign.diameter;
    const diameter = Math.min(preferredDiameter * scale, Math.max(0, width - space.lg * 2));
    const buttonSize = diameter * recorderDesign.buttonRatio;
    const seconds = Math.floor(Math.max(0, durationMs ?? 0) / 1000);
    const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
      .map((part) => String(part).padStart(2, '0')).join(':');
    const status = recording ? copy.mic.recording : state === 'transcribing' ? copy.mic.transcribing : busy ? copy.mic.thinking : copy.mic.idle;

    return (
      <View style={styles.recorder}>
        <View style={[styles.outerHalo, { width: diameter, height: diameter, borderRadius: diameter / 2 }]}>
          <View pointerEvents="none" style={[styles.innerHalo, {
            width: diameter * recorderDesign.innerRingRatio,
            height: diameter * recorderDesign.innerRingRatio,
            borderRadius: diameter / 2,
          }]} />
          {recording ? (
            <Animated.View pointerEvents="none" style={[styles.innerHalo, {
              position: 'absolute', width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.36] }) }],
            }]} />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={status}
            accessibilityState={{ disabled: Boolean(working), busy: Boolean(working) }}
            disabled={working}
            onPress={onPress}
            style={({ pressed }) => [styles.recorderButton, {
              width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2,
              backgroundColor: pressed ? colors.recordPressed : colors.record,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            }]}
          >
            {working ? <ActivityIndicator size="large" color={colors.onRecord} />
              : recording ? <View style={styles.stopIcon} />
                : <MicrophoneOutline size={diameter * recorderDesign.iconRatio} />}
          </Pressable>
        </View>

        <View style={styles.recorderMeta}>
          <AppText style={styles.time} accessibilityLabel={`${copy.mic.durationLabel}: ${time}`}>{time}</AppText>
          <AppText style={styles.label} accessibilityLiveRegion="polite">{status}</AppText>
        </View>
      </View>
    );
  }

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
            recording ? <View style={styles.stopIcon} /> : <Icon name="mic" size={76} color={colors.onRecord} />
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
  recorder: { alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  recorderMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  outerHalo: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.recordHaloSoft },
  innerHalo: { position: 'absolute', backgroundColor: colors.recordHalo },
  recorderButton: { alignItems: 'center', justifyContent: 'center' },
  capsule: { position: 'absolute', borderColor: colors.onRecord },
  cradle: { position: 'absolute', borderColor: colors.onRecord },
  iconLine: { position: 'absolute', backgroundColor: colors.onRecord },
  stopIcon: { width: 32, height: 32, borderRadius: 6, backgroundColor: colors.onRecord },
  time: { fontSize: font.sm, lineHeight: font.sm * 1.4, fontVariant: ['tabular-nums'], color: colors.text },
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
    shadowColor: colors.text,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  recording: { borderWidth: 8, borderColor: colors.bg },
  working: { backgroundColor: colors.primary },
  icon: { fontSize: 76, lineHeight: 92, color: colors.onRecord },
  label: { fontSize: font.lg, fontWeight: '700', textAlign: 'center' },
});
