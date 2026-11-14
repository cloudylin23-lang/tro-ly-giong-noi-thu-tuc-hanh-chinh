import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';
import { colors, font, maxFontScale, radius, space, touch } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'success' | 'secondary' | 'ghost' | 'important';

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: IconName;
  compact?: boolean;
}) {
  const foreground = variant === 'secondary' || variant === 'ghost' ? colors.onSecondary : variant === 'important' ? colors.onImportant : colors.onPrimary;
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
        compact && styles.compact,
        pressed && variant !== 'ghost' && {
          backgroundColor: variant === 'important' ? colors.importantPressed : variant === 'secondary' ? colors.secondaryPressed : colors.primaryPressed,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? <Icon name={icon} color={foreground} size={compact ? 23 : 26} /> : null}
      <AppText
        maxFontSizeMultiplier={maxFontScale}
        style={[styles.label, compact && styles.compactLabel, { color: foreground }]}
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
    flexDirection: 'row',
    gap: space.sm,
  },
  primary: { backgroundColor: colors.primary },
  success: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary, borderWidth: 3, borderColor: colors.primary },
  important: { backgroundColor: colors.important },
  ghost: { backgroundColor: 'transparent' },
  compact: { width: '88%', alignSelf: 'center', minHeight: Math.round(touch * 0.88), borderRadius: radius * 0.88, paddingHorizontal: space.lg * 0.88, paddingVertical: space.sm * 0.88 },
  compactLabel: { fontSize: font.lg },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  label: { flexShrink: 1, color: colors.onPrimary, fontSize: font.lg, fontWeight: '700', textAlign: 'center' },
});
