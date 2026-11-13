// Màn 4 — Kết quả: đọc to tóm tắt, PDF điền sẵn, checklist giấy tờ, nơi nộp
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy';
import { getProcedure } from '@/data/procedures';
import { reopen, summaryText } from '@/lib/flow';
import { shareFormPdf } from '@/lib/pdf';
import { speak } from '@/lib/speech';
import { displayable } from '@/lib/validate';
import { useSession } from '@/state/SessionContext';
import { colors, radius, space } from '@/theme';

export default function Result() {
  const { session, setSession } = useSession();
  const procedure = getProcedure(session?.procedureId);
  const [making, setMaking] = useState(false);

  const readAll = useCallback(() => {
    if (!procedure || !session) return;
    void speak(
      [copy.result.intro(procedure.name), summaryText(procedure, session), copy.result.outro].join(' '),
    );
  }, [procedure, session]);

  useEffect(() => {
    readAll();
    // chỉ đọc một lần khi vào màn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!procedure || !session) return <Redirect href="/" />;

  const pdf = async () => {
    setMaking(true);
    try {
      await shareFormPdf(procedure, session);
    } catch (err) {
      Alert.alert('Không tạo được PDF', err instanceof Error ? err.message : String(err));
    } finally {
      setMaking(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <BigButton label={making ? 'Đang tạo PDF…' : `📄  ${copy.result.pdf}`} onPress={pdf} disabled={making} />
          <BigButton variant="secondary" label={`🔊  ${copy.result.replay}`} onPress={readAll} />
        </>
      }
    >
      <AppText variant="hero" style={{ color: colors.success }}>
        ✅ {copy.result.title}
      </AppText>
      <AppText variant="muted">{procedure.name}</AppText>

      <View style={styles.card}>
        {procedure.fields.map((f) => {
          const v = session.filled[f.key];
          return (
            <View key={f.key} style={styles.row}>
              <AppText variant="muted">{f.label}</AppText>
              <AppText
                style={[styles.value, !v && { color: colors.danger }]}
                onPress={() => {
                  // Sửa một mục → quay lại hỏi đúng mục đó
                  setSession(reopen(session, f.key));
                  router.replace('/ask');
                }}
              >
                {v ? displayable(f.kind, v) : 'Chưa có — bấm để bổ sung'}
              </AppText>
            </View>
          );
        })}
      </View>

      <AppText variant="title">{copy.result.docsTitle}</AppText>
      <View style={styles.card}>
        {procedure.documents.map((d) => (
          <AppText key={d}>☐ {d}</AppText>
        ))}
      </View>

      <AppText variant="title">{copy.result.officeTitle}</AppText>
      <View style={[styles.card, { backgroundColor: colors.successBg }]}>
        <AppText style={styles.value}>{procedure.office.name}</AppText>
        <AppText>{procedure.office.address}</AppText>
        <AppText variant="muted">{procedure.office.hours}</AppText>
        {procedure.office.note ? <AppText variant="muted">{procedure.office.note}</AppText> : null}
      </View>

      <BigButton
        variant="ghost"
        label={copy.result.newCase}
        onPress={() => {
          setSession(null);
          router.replace('/');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  row: { gap: 2, paddingVertical: space.xs },
  value: { fontWeight: '700' },
});
