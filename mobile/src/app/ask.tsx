// Màn 3 — Hỏi đáp từng bước: mỗi lần chỉ hỏi 1 câu, trả lời bằng giọng nói hoặc gõ
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { CancelProcedure } from '@/components/CancelProcedure';
import { Bubble } from '@/components/Bubble';
import { MicButton } from '@/components/MicButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { TextFallback } from '@/components/TextFallback';
import { WebBackground } from '@/components/WebBackground';
import { AppHeader } from '@/components/AppHeader';
import { copy } from '@/copy';
import { getProcedure } from '@/data/procedures';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { api, friendlyError, isRetryableError } from '@/lib/api';
import { activeFields, applyTurn, nextField, progress, questionText, remainingFields, reopen, sayAfter, skip } from '@/lib/flow';
import { speak, stopSpeaking } from '@/lib/speech';
import { displayable } from '@/lib/validate';
import { useSession } from '@/state/SessionContext';
import { colors, layout, radius, space, touch } from '@/theme';

export default function Ask() {
  const { session, setSession } = useSession();
  const procedure = getProcedure(session?.procedureId);
  const field = procedure && session ? nextField(procedure, session) : undefined;

  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [retryText, setRetryText] = useState<{ fieldKey: string; text: string } | null>(null);
  const spokenFor = useRef<string | null>(null);
  const choiceLocked = useRef(false);
  const requestPending = useRef(false);
  const requestVersion = useRef(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    choiceLocked.current = false;
    requestPending.current = false;
    setBusy(false);
    setRetryText(null);
    setSubmissionError(null);
    scroll.current?.scrollTo({ y: 0, animated: false });
    return () => { requestVersion.current++; };
  }, [field?.key]);

  // Field mới xuất hiện mà chưa được đọc (lần đầu vào, bấm sửa, bấm bỏ qua) → đọc câu hỏi
  useEffect(() => {
    if (!field || spokenFor.current === field.key) return;
    spokenFor.current = field.key;
    void speak(questionText(field));
  }, [field]);

  // Hết field → sang màn kết quả
  useEffect(() => {
    if (procedure && session && !field && !cancelOpen && !cancelled.current) router.replace('/result');
  }, [procedure, session, field, cancelOpen]);

  const handleText = async (text: string) => {
    if (cancelled.current || !procedure || !session || !field || requestPending.current || choiceLocked.current) return;
    requestPending.current = true;
    const version = requestVersion.current;
    setHeard(text);
    setReply(null);
    setSubmissionError(null);
    setRetryText(null);
    voice.clearError();
    setBusy(true);
    try {
      const res = await api.extract({
        utterance: text,
        procedure,
        current: field,
        others: remainingFields(procedure, session, field.key),
      });
      if (version !== requestVersion.current) return;
      const r = applyTurn(procedure, session, field, res);
      setReply(r.reply || null);
      spokenFor.current = r.next?.key ?? null; // câu hỏi kế đã nằm trong lời đọc dưới đây
      setSession(r.session);
      // Còn câu hỏi → đọc xác nhận + câu kế. Hết → màn kết quả sẽ tự đọc tóm tắt.
      if (r.next) void speak(sayAfter(r));
    } catch (err) {
      if (version !== requestVersion.current) return;
      const msg = friendlyError(err);
      setSubmissionError(msg);
      if (isRetryableError(err)) setRetryText({ fieldKey: field.key, text });
      void speak(msg);
    } finally {
      if (version === requestVersion.current) {
        requestPending.current = false;
        setBusy(false);
      }
    }
  };

  const voice = useVoiceInput(handleText, field?.key);

  const chooseAnswer = (value: string, label: string) => {
    if (!procedure || !session || !field || requestPending.current || voice.state !== 'idle' || choiceLocked.current) return;
    choiceLocked.current = true;

    // Lựa chọn có sẵn không cần AI; applyTurn vẫn kiểm tra qua validate.ts.
    const r = applyTurn(procedure, session, field, {
      act: 'answer',
      values: [{ key: field.key, value }],
      reply: copy.ask.choiceAccepted(label),
    });
    setHeard(null);
    voice.clearError();
    setRetryText(null);
    setSubmissionError(null);
    setReply(r.reply || null);
    spokenFor.current = r.next?.key ?? null;
    setSession(r.session);
    if (r.next) void speak(sayAfter(r));
    if (r.next?.key === field.key) choiceLocked.current = false;
  };

  const skipOptional = () => {
    if (!procedure || !session || !field?.optional || requestPending.current || voice.state !== 'idle' || choiceLocked.current) return;
    choiceLocked.current = true;
    const r = applyTurn(procedure, session, field, {
      act: 'dont_know', values: [], reply: copy.ask.optionalSkipped,
    });
    setHeard(null);
    setRetryText(null);
    setSubmissionError(null);
    voice.clearError();
    setReply(r.reply);
    spokenFor.current = r.next?.key ?? null;
    setSession(r.session);
    if (r.next) void speak(sayAfter(r));
  };

  const cancelControl = (
    <CancelProcedure
      open={cancelOpen}
      onOpenChange={setCancelOpen}
      onConfirm={() => {
        if (cancelled.current) return;
        cancelled.current = true;
        requestVersion.current++;
        choiceLocked.current = true;
        void stopSpeaking();
        setSession(null);
        router.dismissTo('/');
      }}
    />
  );

  if (!procedure || !session) return <Redirect href="/" />;
  if (!field) return <Screen subtitle={procedure.name} footer={cancelControl}>{null}</Screen>;

  const p = progress(procedure, session);
  const inputDisabled = busy || voice.state !== 'idle';
  const choices = field.kind === 'gender'
    ? copy.ask.genderOptions
    : field.kind === 'choice'
      ? (field.options ?? []).map(({ value, label }) => ({
          value,
          label: field.key === 'loai_cho_o' ? copy.ask.housingChoiceLabels[value] ?? label : label,
        }))
      : [];
  const answered = activeFields(procedure, session).filter((f) => f.key in session.filled || session.skipped.includes(f.key));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <WebBackground />
      <AppHeader subtitle={procedure.name} />
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.progress}>
              <ProgressBar {...p} />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.fieldHeader}>
              <AppText variant="title">{field.label}</AppText>
              {field.optional ? <AppText variant="small" style={styles.optional}>{copy.ask.optionalLabel}</AppText> : null}
            </View>

            {reply ? (
              <AppText variant="body" style={styles.reply}>
                {reply}
              </AppText>
            ) : null}
            <Bubble onPress={inputDisabled ? undefined : () => void speak(questionText(field))}>{questionText(field)}</Bubble>
            {choices.length === 0 ? <AppText variant="muted">{copy.ask.autoNextHint}</AppText> : null}
            {field.optional ? (
              <BigButton variant="secondary" label={copy.ask.none} disabled={inputDisabled} onPress={skipOptional} />
            ) : null}

            {choices.length > 0 ? (
              <View style={styles.choices}>
                <AppText variant="muted">{copy.ask.chooseAnswer}</AppText>
                {choices.map((option) => (
                  <BigButton
                    key={`${field.key}:${option.value}`}
                    variant="secondary"
                    label={option.label}
                    disabled={inputDisabled}
                    onPress={() => chooseAnswer(option.value, option.label)}
                  />
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <MicButton
              appearance="recorder"
              state={voice.state}
              busy={busy}
              onPress={() => {
                if (voice.state === 'idle') {
                  setSubmissionError(null);
                  setRetryText(null);
                }
                voice.toggle();
              }}
              durationMs={voice.durationMs}
            />

            {heard ? (
              <Bubble who="user">
                <AppText variant="muted">{copy.ask.youSaid}</AppText>
                <AppText>“{heard}”</AppText>
              </Bubble>
            ) : null}
            {submissionError ? (
              <View style={styles.choices}>
                <Bubble who="warning">{submissionError}</Bubble>
                {retryText?.fieldKey === field.key ? (
                  <BigButton label={copy.errors.retry} disabled={inputDisabled} onPress={() => void handleText(retryText.text)} />
                ) : null}
              </View>
            ) : null}
            {voice.error ? (
              <View style={styles.choices}>
                <Bubble who="warning">{voice.error}</Bubble>
                {voice.canRetry ? (
                  <BigButton label={copy.errors.retry} disabled={inputDisabled} onPress={() => void voice.retry()} />
                ) : null}
              </View>
            ) : null}

            <TextFallback
              key={field.key}
              onSubmit={(text) => {
                if (!inputDisabled) void handleText(text);
              }}
              disabled={inputDisabled}
            />
            <View style={styles.actions}>
              {!field.optional ? (
                <View style={styles.action}>
                  <BigButton
                    variant="ghost"
                    label={copy.ask.skip}
                    disabled={inputDisabled}
                    onPress={() => {
                      setReply(null);
                      setSession(skip(session, field.key));
                    }}
                  />
                </View>
              ) : null}
              <View style={styles.action}>
                <BigButton variant="secondary" icon="repeat" label={copy.ask.repeatQuestion} disabled={inputDisabled} onPress={() => void speak(questionText(field))} />
              </View>
            </View>
          </View>

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
                    disabled={inputDisabled}
                    onPress={() => {
                      setReply(null);
                      setSession(reopen(session, f.key));
                    }}
                    style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
                  >
                    <AppText variant="muted">{f.label}</AppText>
                    <AppText style={styles.value}>{v ? displayable(f, v) : f.optional ? copy.ask.optionalEmpty : copy.ask.skippedValue}</AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.footerContent}>{cancelControl}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  footer: { paddingHorizontal: '2%', paddingBottom: space.sm },
  footerContent: { width: '100%', maxWidth: layout.pageWidth, alignSelf: 'center', backgroundColor: 'transparent' },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: '2%',
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  sheet: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.pageWidth,
    backgroundColor: 'transparent',
    borderRadius: space.xl,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.md,
  },
  header: { gap: space.lg },
  progress: {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xs,
  },
  section: { gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1 },
  fieldHeader: { gap: space.sm, alignItems: 'flex-start' },
  optional: { backgroundColor: colors.primarySoft, borderRadius: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs },
  choices: { gap: space.sm },
  reply: { color: colors.success, fontWeight: '700' },
  filled: { gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.lg },
  item: {
    minHeight: touch,
    backgroundColor: 'transparent',
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 2,
  },
  value: { fontWeight: '700' },
});
