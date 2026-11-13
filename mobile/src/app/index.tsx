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
import { getProcedure } from '@/data/procedures';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { api, friendlyError } from '@/lib/api';
import { isComplete } from '@/lib/flow';
import { speak } from '@/lib/speech';
import { useSession } from '@/state/SessionContext';
import { colors, space } from '@/theme';

export default function Home() {
  const { session, hydrated } = useSession();
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const greeted = useRef(false);

  const handleText = async (text: string) => {
    setHeard(text);
    setMessage(null);
    setBusy(true);
    try {
      const r = await api.classify(text);
      if (!r.procedureId || !getProcedure(r.procedureId)) {
        const msg = r.reply || copy.confirm.notFound;
        setMessage(msg);
        void speak(msg);
        return;
      }
      router.push({ pathname: '/confirm', params: { procedureId: r.procedureId, reply: r.reply } });
    } catch (err) {
      const msg = friendlyError(err);
      setMessage(msg);
      void speak(msg);
    } finally {
      setBusy(false);
    }
  };

  const voice = useVoiceInput(handleText);

  // Chào bằng giọng nói một lần khi mở app
  useEffect(() => {
    if (!hydrated || greeted.current) return;
    greeted.current = true;
    void speak(copy.home.greeting);
  }, [hydrated]);

  // Quay lại màn này thì xoá lời nhắn cũ
  useFocusEffect(
    useCallback(() => {
      setHeard(null);
      setMessage(null);
    }, []),
  );

  const resumeProcedure = session ? getProcedure(session.procedureId) : undefined;
  const canResume = Boolean(resumeProcedure && session && Object.keys(session.filled).length > 0);
  const error = voice.error;

  return (
    <Screen
      footer={
        <>
          {canResume && resumeProcedure && session ? (
            <BigButton
              variant="secondary"
              label={`↩️  ${copy.home.resume}: ${resumeProcedure.name}`}
              onPress={() => router.push(isComplete(resumeProcedure, session) ? '/result' : '/ask')}
            />
          ) : null}
          <BigButton variant="ghost" label={copy.home.check} onPress={() => router.push('/check')} />
        </>
      }
    >
      <View style={styles.header}>
        <AppText variant="muted" style={styles.app}>
          {copy.appName}
        </AppText>
        <AppText variant="hero" style={styles.center}>
          {copy.home.title}
        </AppText>
        <AppText variant="muted" style={styles.center}>
          {copy.home.subtitle}
        </AppText>
      </View>

      <MicButton state={voice.state} busy={busy} onPress={voice.toggle} durationMs={voice.durationMs} />

      {heard ? (
        <Bubble who="user">
          <AppText variant="muted">{copy.ask.youSaid}</AppText>
          <AppText>“{heard}”</AppText>
        </Bubble>
      ) : null}
      {message || error ? <Bubble who="warning">{message ?? error ?? ''}</Bubble> : null}

      <TextFallback onSubmit={handleText} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm, alignItems: 'center', marginTop: space.md },
  app: { fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
  center: { textAlign: 'center' },
});
