// Màn 3 — Hỏi đáp từng bước: mỗi lần chỉ hỏi 1 câu, trả lời bằng giọng nói hoặc gõ
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Bubble } from '@/components/Bubble';
import { MicButton } from '@/components/MicButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { TextFallback } from '@/components/TextFallback';
import { copy } from '@/copy';
import { getProcedure } from '@/data/procedures';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { api, friendlyError } from '@/lib/api';
import { activeFields, applyTurn, localNumberTurn, nextField, progress, remainingFields, reopen, sayAfter, skip } from '@/lib/flow';
import { speak } from '@/lib/speech';
import { displayable, maskLongDigitRuns } from '@/lib/validate';
import { useSession } from '@/state/SessionContext';
import { colors, radius, space } from '@/theme';

export default function Ask() {
  const { session, setSession } = useSession();
  const procedure = getProcedure(session?.procedureId);
  const field = procedure && session ? nextField(procedure, session) : undefined;

  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const spokenFor = useRef<string | null>(null);

  // Field mới xuất hiện mà chưa được đọc (lần đầu vào, bấm sửa, bấm bỏ qua) → đọc câu hỏi
  useEffect(() => {
    if (!field || spokenFor.current === field.key) return;
    spokenFor.current = field.key;
    void speak(field.question);
  }, [field]);

  // Hết field → sang màn kết quả
  useEffect(() => {
    if (procedure && session && !field) router.replace('/result');
  }, [procedure, session, field]);

  const handleText = async (text: string) => {
    if (!procedure || !session || !field) return;
    setHeard(text);
    setBusy(true);
    try {
      // Số căn cước / SĐT: code tự đổi, không gửi cho AI. Câu khác: che dãy số dài trước khi gửi.
      const res =
        localNumberTurn(field, text) ??
        (await api.extract({
          utterance: maskLongDigitRuns(text),
          procedure,
          current: field,
          others: remainingFields(procedure, session, field.key),
        }));
      const r = applyTurn(procedure, session, field, res, text);
      setReply(r.reply || null);
      spokenFor.current = r.next?.key ?? null; // câu hỏi kế đã nằm trong lời đọc dưới đây
      setSession(r.session);
      // Còn câu hỏi → đọc xác nhận + câu kế. Hết → màn kết quả sẽ tự đọc tóm tắt.
      if (r.next) void speak(sayAfter(r));
    } catch (err) {
      const msg = friendlyError(err);
      setReply(msg);
      void speak(msg);
    } finally {
      setBusy(false);
    }
  };

  const voice = useVoiceInput(handleText);

  if (!procedure || !session) return <Redirect href="/" />;
  if (!field) return <Screen>{null}</Screen>;

  // Đang ghi âm / chờ STT cũng phải khoá: câu trả lời về sau sẽ được áp vào câu đang hỏi
  const locked = busy || voice.state !== 'idle';
  const p = progress(procedure, session);
  const answered = activeFields(procedure, session).filter((f) => f.key in session.filled || session.skipped.includes(f.key));

  return (
    <Screen
      footer={
        <View style={styles.row}>
          <View style={styles.flex}>
            <BigButton variant="secondary" label={`🔁  ${copy.ask.repeatQuestion}`} onPress={() => void speak(field.question)} />
          </View>
        </View>
      }
    >
      <ProgressBar {...p} />
      <AppText variant="muted">{procedure.name}</AppText>

      {reply ? (
        <AppText variant="body" style={styles.reply}>
          {reply}
        </AppText>
      ) : null}
      <Bubble onPress={() => void speak(field.question)}>{field.question}</Bubble>

      <MicButton state={voice.state} busy={busy} onPress={voice.toggle} durationMs={voice.durationMs} />

      {heard ? (
        <Bubble who="user">
          <AppText variant="muted">{copy.ask.youSaid}</AppText>
          <AppText>“{heard}”</AppText>
        </Bubble>
      ) : null}
      {voice.error ? <Bubble who="warning">{voice.error}</Bubble> : null}

      <TextFallback onSubmit={handleText} disabled={locked} />
      <BigButton
        variant="ghost"
        label={copy.ask.skip}
        disabled={locked}
        onPress={() => {
          setReply(null);
          setSession(skip(session, field.key));
        }}
      />

      {answered.length > 0 ? (
        <View style={styles.filled}>
          <AppText variant="muted">{copy.ask.filledTitle}</AppText>
          {answered.map((f) => {
            const v = session.filled[f.key];
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityLabel={`Sửa ${f.label}`}
                disabled={locked}
                onPress={() => {
                  setReply(null);
                  setSession(reopen(procedure, session, f.key));
                }}
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
              >
                <AppText variant="muted">{f.label}</AppText>
                <AppText style={styles.value}>{v ? displayable(f, v) : copy.ask.skippedValue}</AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  reply: { color: colors.success, fontWeight: '700' },
  filled: { gap: space.sm, marginTop: space.md },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 2,
  },
  value: { fontWeight: '700' },
});
