// Kiểm tra hệ thống trước khi demo: máy chủ, giọng đọc tiếng Việt, micro + STT
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Icon } from '@/components/Icon';
import { MicButton } from '@/components/MicButton';
import { Screen } from '@/components/Screen';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { api, apiBaseUrl, friendlyError } from '@/lib/api';
import { findVietnameseVoice, speak } from '@/lib/speech';
import { colors, radius, space } from '@/theme';

type Status = { ok: boolean | null; text: string };

export default function Check() {
  const [server, setServer] = useState<Status>({ ok: null, text: 'Đang kiểm tra…' });
  const [voice, setVoice] = useState<Status>({ ok: null, text: 'Đang kiểm tra…' });
  const [stt, setStt] = useState<Status>({ ok: null, text: 'Bấm mic, nói một câu, bấm lại để dừng' });

  const checkServer = async () => {
    setServer({ ok: null, text: 'Đang kiểm tra…' });
    const t = Date.now();
    try {
      const h = await api.health();
      setServer({
        ok: h.ok && h.hasKey,
        text: `${h.hasKey ? 'OK' : 'THIẾU OPENAI_API_KEY'} · ${Date.now() - t}ms · ${h.sttModel} / ${h.llmModel}`,
      });
    } catch (err) {
      setServer({ ok: false, text: friendlyError(err) });
    }
  };

  useEffect(() => {
    void checkServer();
    findVietnameseVoice().then((v) =>
      setVoice(
        v
          ? { ok: true, text: `${v.name} (${v.language})` }
          : { ok: false, text: 'Chưa có giọng Tiếng Việt — vào Cài đặt → Chuyển văn bản thành giọng nói → tải Tiếng Việt' },
      ),
    );
  }, []);

  const mic = useVoiceInput(async (text) => setStt({ ok: true, text: `“${text}”` }));

  useEffect(() => {
    if (mic.error) setStt({ ok: false, text: mic.error });
  }, [mic.error]);

  return (
    <Screen footer={<BigButton variant="secondary" label="Về màn hình chính" onPress={() => router.back()} />}>
      <AppText variant="title">Kiểm tra hệ thống</AppText>
      <AppText variant="muted">
        Máy chủ: {apiBaseUrl || '(chưa cấu hình)'} · Bản {Constants.expoConfig?.version ?? '?'}
      </AppText>

      <Row title="1. Máy chủ AI" status={server} />
      <BigButton variant="ghost" label="Kiểm tra lại máy chủ" onPress={checkServer} />

      <Row title="2. Giọng đọc tiếng Việt" status={voice} />
      <BigButton variant="ghost" icon="volume" label="Nghe thử" onPress={() => void speak('Bác cho con biết ngày sinh ạ?')} />

      <Row title="3. Micro + nhận giọng nói" status={stt} />
      <MicButton appearance="recorder" state={mic.state} onPress={mic.toggle} durationMs={mic.durationMs} />
    </Screen>
  );
}

function Row({ title, status }: { title: string; status: Status }) {
  const bg = status.ok === null ? colors.surface : status.ok ? colors.successBg : colors.warningBg;
  const icon = status.ok === null ? 'hourglass' : status.ok ? 'check' : 'warning';
  return (
    <View style={[styles.row, { backgroundColor: bg }]}>
      <View style={styles.heading}>
        <Icon name={icon} color={status.ok === false ? colors.danger : colors.text} />
        <AppText style={styles.title}>{title}</AppText>
      </View>
      <AppText variant="muted">{status.text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: 4 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, fontWeight: '700' },
});
