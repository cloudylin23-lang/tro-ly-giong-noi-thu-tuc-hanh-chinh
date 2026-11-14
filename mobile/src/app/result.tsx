// Màn 4 — Kết quả: đọc to tóm tắt, PDF điền sẵn, checklist giấy tờ, nơi nộp
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy';
import { getProcedure } from '@/data/procedures';
import { activeFields, documentsFor, reopen, summaryText } from '@/lib/flow';
import { shareFormPdf } from '@/lib/pdf';
import { speak } from '@/lib/speech';
import { displayable } from '@/lib/validate';
import { useSession } from '@/state/SessionContext';
import { colors, radius, space, touch } from '@/theme';

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

  // Chỉ phân nhóm khi hiển thị; dữ liệu gốc và đầu vào PDF giữ nguyên.
  const items = documentsFor(procedure, session);
  const isNote = (text: string) => /^(?:Lưu ý\s*:|Thường không phải chụp ảnh)/iu.test(text.trim());
  const documents = items.filter((text) => !isNote(text));
  const fields = activeFields(procedure, session);
  const missingCount = fields.filter((field) => !field.optional && !session.filled[field.key]).length;
  const notes = [
    ...items.filter(isNote).map((text) => text.replace(/^\s*Lưu ý\s*:\s*/iu, '')),
    ...(procedure.office.note ? [procedure.office.note] : []),
  ];

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
      subtitle={copy.header.result}
      footer={
        <>
          <BigButton variant="important" icon="file" label={making ? 'Đang tạo PDF…' : copy.result.pdf} onPress={pdf} disabled={making} />
          <BigButton variant="secondary" icon="volume" label={copy.result.replay} onPress={readAll} />
        </>
      }
    >
      <View style={styles.heading}>
        <Icon name={missingCount > 0 ? 'warning' : 'check'} size={32} color={missingCount > 0 ? colors.danger : colors.text} />
        <AppText variant="hero" style={styles.listText}>{missingCount > 0 ? copy.result.reviewTitle : copy.result.title}</AppText>
      </View>
      <AppText variant="muted">{procedure.name}</AppText>
      <AppText variant="muted">{copy.result.notSubmitted}</AppText>

      <AppText variant="title">{copy.result.infoTitle}</AppText>
      <AppText variant="muted">{copy.result.editHint}</AppText>
      {missingCount > 0 ? <AppText>{copy.result.missingCount(missingCount)}</AppText> : null}

      <View style={styles.card}>
        {fields.map((f) => {
          const v = session.filled[f.key];
          return (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityLabel={`Sửa ${f.label}`}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              onPress={() => {
                // Sửa một mục → quay lại hỏi đúng mục đó
                setSession(reopen(procedure, session, f.key));
                router.replace('/ask');
              }}
            >
              <AppText variant="muted">{f.label}</AppText>
              <AppText style={[styles.value, !v && !f.optional && { color: colors.danger }]}>
                {v ? displayable(f, v) : f.optional ? copy.ask.optionalEmpty : 'Chưa có — bấm để bổ sung'}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="title">{copy.result.docsTitle}</AppText>
      <View style={styles.card}>
        {documents.map((d, index) => (
          <View key={d} style={styles.listItem}>
            <AppText style={styles.marker}>{index + 1}.</AppText>
            <AppText style={styles.listText}>{d}</AppText>
          </View>
        ))}
      </View>

      {notes.length > 0 ? (
        <View style={[styles.card, styles.notes]}>
          <AppText variant="title">{copy.result.notesTitle}</AppText>
          {notes.map((note) => (
            <View key={note} style={styles.listItem}>
              <AppText style={styles.marker}>•</AppText>
              <AppText style={styles.listText}>{note}</AppText>
            </View>
          ))}
        </View>
      ) : null}

      <AppText variant="title">{copy.result.officeTitle}</AppText>
      <View style={styles.card}>
        <AppText style={styles.value}>{procedure.office.name}</AppText>
        <AppText>{procedure.office.address}</AppText>
        <OfficeLine icon="clock" text={procedure.office.hours} />
        {procedure.office.processing ? <OfficeLine icon="hourglass" text={procedure.office.processing} /> : null}
        {procedure.office.fee ? <OfficeLine icon="money" text={procedure.office.fee} /> : null}
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

function OfficeLine({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.listItem}>
      <Icon name={icon} />
      <AppText variant="muted" style={styles.listText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  row: { minHeight: touch, justifyContent: 'center', gap: 2, paddingVertical: space.xs },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  marker: { minWidth: space.lg, fontWeight: '700' },
  listText: { flex: 1 },
  notes: { borderColor: colors.primaryPressed },
  value: { fontWeight: '700' },
});
