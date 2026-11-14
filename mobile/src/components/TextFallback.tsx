import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { copy } from '@/copy';
import { colors, font, fontFamily, maxFontScale, radius, space, touch } from '@/theme';
import { BigButton } from './BigButton';

/** Ô gõ chữ dự phòng khi ồn hoặc STT nghe sai. Mặc định thu gọn. */
export function TextFallback({ onSubmit, disabled, compact = false }: { onSubmit: (text: string) => void; disabled?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  if (!open) return <BigButton compact={compact} variant="ghost" icon="keyboard" label={copy.home.typeInstead} disabled={disabled} onPress={() => setOpen(true)} />;

  const send = () => {
    const t = text.trim();
    if (!t || disabled) return; // Enter không đi qua nút Gửi nên vẫn phải chặn tại đây.
    setText('');
    onSubmit(t);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={text}
        editable={!disabled}
        onChangeText={setText}
        placeholder="Gõ câu trả lời…"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        maxFontSizeMultiplier={maxFontScale}
        multiline
        autoFocus
        returnKeyType="send"
        submitBehavior="submit"
        onSubmitEditing={send}
      />
      <BigButton compact={compact} label="Gửi" onPress={send} disabled={disabled || !text.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  input: {
    minHeight: touch,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: font.md,
    fontFamily,
    color: colors.text,
  },
});
