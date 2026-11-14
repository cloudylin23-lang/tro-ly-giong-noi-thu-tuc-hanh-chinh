import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radius, space, touch } from '@/theme';
import { AppText } from './AppText';

/** Khung lời nói của trợ lý (bấm để nghe lại) hoặc của người dùng. */
export function Bubble({
  children,
  who = 'assistant',
  onPress,
}: {
  children: ReactNode;
  who?: 'assistant' | 'user' | 'warning';
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={[styles.base, styles[who], onPress && { minHeight: touch, justifyContent: 'center' }]}
    >
      {typeof children === 'string' ? (
        <AppText variant={who === 'assistant' ? 'title' : 'body'}>{children}</AppText>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius, padding: space.md },
  assistant: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.border },
  user: { backgroundColor: 'transparent', alignSelf: 'stretch', borderWidth: 1, borderColor: colors.border },
  warning: { backgroundColor: 'transparent', borderLeftWidth: 4, borderLeftColor: colors.danger },
});
