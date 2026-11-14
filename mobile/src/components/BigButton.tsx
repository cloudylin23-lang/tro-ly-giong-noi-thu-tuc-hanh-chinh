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
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: IconName;
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
        pressed && variant !== 'ghost' && {
          backgroundColor: variant === 'important' ? colors.importantPressed : colors.primaryPressed,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? <Icon name={icon} color={variant === 'important' ? colors.onImportant : colors.onPrimary} /> : null}
      <AppText
        maxFontSizeMultiplier={maxFontScale}
        style={[styles.label, variant === 'important' && { color: colors.onImportant }]}
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
  secondary: { backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.primary },
  important: { backgroundColor: colors.important },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  label: { flexShrink: 1, color: colors.onPrimary, fontSize: font.lg, fontWeight: '700', textAlign: 'center' },
});
