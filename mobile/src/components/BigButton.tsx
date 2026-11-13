import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';
import { colors, font, maxFontScale, radius, space, touch } from '@/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'success' | 'secondary' | 'ghost';

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <AppText
        maxFontSizeMultiplier={maxFontScale}
        style={[styles.label, (variant === 'secondary' || variant === 'ghost') && { color: colors.primary }]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch,
    borderRadius: radius,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  success: { backgroundColor: colors.success },
  secondary: { backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.primary },
  ghost: { backgroundColor: 'transparent', minHeight: 56 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  label: { color: colors.onPrimary, fontSize: font.lg, fontWeight: '700', textAlign: 'center' },
});
