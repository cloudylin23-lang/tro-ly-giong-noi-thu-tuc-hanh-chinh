import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors, font, maxFontScale } from '@/theme';

type Variant = 'hero' | 'title' | 'body' | 'muted' | 'small';

export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <Text maxFontSizeMultiplier={maxFontScale} style={[styles.base, styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: { color: colors.text },
  hero: { fontSize: font.xxl, fontWeight: '800', lineHeight: font.xxl * 1.25 },
  title: { fontSize: font.xl, fontWeight: '700', lineHeight: font.xl * 1.3 },
  body: { fontSize: font.md, lineHeight: font.md * 1.4 },
  muted: { fontSize: font.sm, lineHeight: font.sm * 1.4, color: colors.textMuted },
  small: { fontSize: font.sm, lineHeight: font.sm * 1.35 },
});
