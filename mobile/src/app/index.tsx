// Màn 1 — Chào: nút mic to, nói điều cần làm → AI phân loại thủ tục
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Bubble } from '@/components/Bubble';
import { MicButton } from '@/components/MicButton';
import { Screen } from '@/components/Screen';
import { TextFallback } from '@/components/TextFallback';
import { copy } from '@/copy';
import { getProcedure, procedures } from '@/data/procedures';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { api, friendlyError, isRetryableError } from '@/lib/api';
import { isComplete } from '@/lib/flow';
import { speak } from '@/lib/speech';
import { useSession } from '@/state/SessionContext';
import { colors, recorderDesign, space } from '@/theme';

export default function Home() {
  const { session, hydrated } = useSession();
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retryText, setRetryText] = useState<string | null>(null);
  const greeted = useRef(false);
  const choosing = useRef(false);
  const requestPending = useRef(false);
  const requestVersion = useRef(0);

  const handleText = async (text: string) => {
    if (requestPending.current || choosing.current) return;
    requestPending.current = true;
    const version = requestVersion.current;
    setHeard(text);
    setMessage(null);
    setRetryText(null);
    voice.clearError();
    setBusy(true);
    try {
      const r = await api.classify(text);
      if (version !== requestVersion.current) return;
      if (!r.procedureId || !getProcedure(r.procedureId)) {
        const msg = r.reply || copy.confirm.notFound;
        setMessage(msg);
        void speak(msg);
        return;
      }
      router.push({ pathname: '/confirm', params: { procedureId: r.procedureId, reply: r.reply } });
    } catch (err) {
      if (version !== requestVersion.current) return;
      const msg = friendlyError(err);
      setMessage(msg);
      if (isRetryableError(err)) setRetryText(text);
      void speak(msg);
    } finally {
      if (version === requestVersion.current) {
        requestPending.current = false;
        setBusy(false);
      }
    }
  };

  const voice = useVoiceInput(handleText);

  const chooseProcedure = (procedureId: string) => {
    if (!hydrated || requestPending.current || voice.state !== 'idle' || choosing.current || !getProcedure(procedureId)) return;
    choosing.current = true;
    voice.clearError();
    router.push({ pathname: '/confirm', params: { procedureId } });
  };

  // Chào bằng giọng nói một lần khi mở app
  useEffect(() => {
    if (!hydrated || greeted.current) return;
    greeted.current = true;
    void speak(copy.home.greeting);
  }, [hydrated]);

  // Quay lại màn này thì xoá lời nhắn cũ
  useFocusEffect(
    useCallback(() => {
      choosing.current = false;
      requestPending.current = false;
      setBusy(false);
      setHeard(null);
      setMessage(null);
      setRetryText(null);
      return () => { requestVersion.current++; };
    }, []),
  );

  const resumeProcedure = session ? getProcedure(session.procedureId) : undefined;
  const canResume = Boolean(resumeProcedure && session && (Object.keys(session.filled).length > 0 || session.skipped.length > 0));
  const error = voice.error;
  const inputDisabled = !hydrated || busy || voice.state !== 'idle';

  return (
    <Screen
      subtitle={copy.home.title}
      footer={
        <View style={styles.footer}>
          {canResume && resumeProcedure && session ? (
            <BigButton
              compact
              variant="secondary"
              icon="return"
              label={`${copy.home.resume}: ${resumeProcedure.name}`}
              onPress={() => router.push(isComplete(resumeProcedure, session) ? '/result' : '/ask')}
            />
          ) : null}
          <BigButton compact variant="ghost" label={copy.home.check} onPress={() => router.push('/check')} />
        </View>
      }
    >
      <View style={styles.page}>
        <MicButton
          scale={0.88}
          appearance="recorder"
          state={voice.state}
          busy={busy}
          onPress={() => {
            if (voice.state === 'idle') {
              setMessage(null);
              setRetryText(null);
            }
            voice.toggle();
          }}
          durationMs={voice.durationMs}
        />

        <AppText variant="muted" style={styles.center}>{copy.home.subtitle}</AppText>
        <View style={styles.procedures}>
          <AppText style={styles.sectionTitle}>{copy.home.chooseProcedure}</AppText>
          {procedures.map((procedure) => (
            <BigButton
              compact
              key={procedure.id}
              variant="secondary"
              icon={procedure.id === 'tam_tru' || procedure.id === 'thuong_tru' ? 'home' : procedure.id === 'cap_lai_can_cuoc' ? 'idCard' : 'file'}
              label={procedure.name}
              disabled={inputDisabled}
              onPress={() => chooseProcedure(procedure.id)}
            />
          ))}
        </View>

        {heard ? (
          <Bubble who="user">
            <AppText variant="muted">{copy.ask.youSaid}</AppText>
            <AppText>“{heard}”</AppText>
          </Bubble>
        ) : null}
        {voice.slow ? <Bubble who="warning">{copy.mic.slow}</Bubble> : null}
        {message || error ? <Bubble who="warning">{message ?? error ?? ''}</Bubble> : null}
        {retryText !== null ? (
          <BigButton compact label={copy.errors.retry} disabled={inputDisabled} onPress={() => void handleText(retryText)} />
        ) : voice.canRetry ? (
          <BigButton compact label={copy.errors.retry} disabled={inputDisabled} onPress={() => void voice.retry()} />
        ) : null}

        <TextFallback
          compact
          onSubmit={(text) => {
            voice.clearRetry();
            if (!inputDisabled) void handleText(text);
          }}
          disabled={inputDisabled}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: recorderDesign.pageWidth, alignSelf: 'center', gap: space.sm },
  footer: { width: '100%', maxWidth: recorderDesign.pageWidth, alignSelf: 'center', gap: space.sm },
  center: { textAlign: 'center' },
  sectionTitle: { fontWeight: '700', textAlign: 'center' },
  procedures: { gap: space.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm },
});
