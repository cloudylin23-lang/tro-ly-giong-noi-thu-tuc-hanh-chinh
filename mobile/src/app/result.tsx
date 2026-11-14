// Màn 4 — Kết quả: đọc to tóm tắt, PDF điền sẵn, checklist giấy tờ, nơi nộp
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { ActionDialog } from '@/components/ActionDialog';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy';
import { getProcedure } from '@/data/procedures';
import { activeFields, documentsFor, feeExemptText, mapsUrl, reopen, summaryText, toggleDoc } from '@/lib/flow';
import { shareFormPdf } from '@/lib/pdf';
import { shareWithFamily } from '@/lib/share';
import { speak, stopSpeaking } from '@/lib/speech';
import { displayable } from '@/lib/validate';
import { useSession } from '@/state/SessionContext';
import { colors, radius, space, touch } from '@/theme';

export default function Result() {
  const { session, hydrated, setSession } = useSession();
  const procedure = getProcedure(session?.procedureId);
  const [making, setMaking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const filePending = useRef(false);
  const readOnce = useRef(false);

  const readAll = useCallback(() => {
    if (!procedure || !session) return;
    void speak(
      [copy.result.intro(procedure.name), summaryText(procedure, session), feeExemptText(procedure, session), copy.result.outro].filter(Boolean).join(' '),
    );
  }, [procedure, session]);

  useEffect(() => {
    if (!hydrated || !procedure || !session || readOnce.current) return;
    readOnce.current = true;
    readAll();
  }, [hydrated, procedure, session, readAll]);

  if (!hydrated) return <Screen subtitle={copy.header.result}><ActivityIndicator color={colors.primary} /></Screen>;
  if (!procedure || !session) return <Redirect href="/" />;

  // Chỉ phân nhóm khi hiển thị; dữ liệu gốc và đầu vào PDF giữ nguyên.
  const items = documentsFor(procedure, session);
  const isNote = (text: string) => /^(?:Lưu ý\s*:|Thường không phải chụp ảnh)/iu.test(text.trim());
  const documents = items.filter((text) => !isNote(text));
  const fields = activeFields(procedure, session);
  const map = mapsUrl(procedure);
  const exempt = feeExemptText(procedure, session);
  const checkedCount = documents.filter((doc) => session.checkedDocs?.includes(doc)).length;
  const fileBusy = making || sharing;
  const missingCount = fields.filter((field) => !field.optional && !session.filled[field.key]).length;
  const notes = [
    ...items.filter(isNote).map((text) => text.replace(/^\s*Lưu ý\s*:\s*/iu, '')),
    ...(procedure.office.note ? [procedure.office.note] : []),
  ];

  const pdf = async () => {
    if (filePending.current) return;
    filePending.current = true;
    setMaking(true);
    void stopSpeaking();
    try {
      await shareFormPdf(procedure, session);
    } catch (err) {
      setNotice({ title: copy.result.pdfError, message: copy.errors.generic });
    } finally {
      setMaking(false);
      filePending.current = false;
    }
  };

  const sendFamily = async () => {
    if (filePending.current) return;
    filePending.current = true;
    setShareOpen(false);
    setSharing(true);
    void stopSpeaking();
    try {
      if (!(await shareWithFamily(procedure, session))) {
        setNotice({ title: copy.share.dialogTitle, message: copy.share.unavailable });
        void speak(copy.share.unavailable);
      }
    } catch {
      setNotice({ title: copy.share.dialogTitle, message: copy.errors.generic });
      void speak(copy.errors.generic);
    } finally {
      filePending.current = false;
      setSharing(false);
    }
  };

  const openMap = async () => {
    if (!map) return;
    try {
      await Linking.openURL(map);
    } catch {
      setNotice({ title: copy.result.officeTitle, message: copy.prepare.mapError });
      void speak(copy.prepare.mapError);
    }
  };

  const officeAddress = (
    <>
      <AppText style={styles.value}>{procedure.office.name}</AppText>
      <AppText>{procedure.office.address}</AppText>
      {map ? (
        <View style={styles.listItem}>
          <Icon name="map" color={colors.primary} />
          <AppText style={[styles.listText, styles.mapLink]}>{copy.prepare.openMap}</AppText>
        </View>
      ) : null}
    </>
  );

  return (
    <>
    <Screen
      subtitle={copy.header.result}
      footer={
        <>
          <BigButton variant="important" icon="file" label={making ? copy.result.makingPdf : copy.result.pdf} onPress={pdf} disabled={fileBusy} />
          <BigButton variant="secondary" icon="idCard" label={copy.counter.handOver} disabled={fileBusy} onPress={() => {
            void stopSpeaking();
            router.push('/counter');
          }} />
        </>
      }
    >
      <View style={styles.heading}>
        <Icon name={missingCount > 0 ? 'warning' : 'check'} size={32} color={missingCount > 0 ? colors.danger : colors.text} />
        <AppText variant="hero" style={styles.listText}>{missingCount > 0 ? copy.result.reviewTitle : copy.result.title}</AppText>
      </View>
      <AppText variant="muted">{procedure.name}</AppText>
      <AppText variant="muted">{copy.result.notSubmitted}</AppText>

      <BigButton variant="secondary" icon="volume" label={copy.result.replay} onPress={readAll} disabled={fileBusy} />
      <BigButton
        variant="secondary"
        icon="share"
        label={sharing ? copy.share.making : copy.share.button}
        disabled={fileBusy}
        onPress={() => {
          if (filePending.current) return;
          setShareOpen(true);
          void speak(copy.share.copied);
        }}
      />

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
              disabled={fileBusy}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              onPress={() => {
                // Sửa một mục → quay lại hỏi đúng mục đó
                setSession(reopen(procedure, session, f.key));
                router.replace('/ask');
              }}
            >
              <AppText variant="muted">{f.label}</AppText>
              <AppText style={[styles.value, !v && !f.optional && { color: colors.danger }]}>
                {v ? displayable(f, v) : f.optional ? copy.ask.optionalEmpty : copy.result.missingValue}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="title">{copy.result.docsTitle}</AppText>
      <AppText variant="muted">{copy.prepare.docsHint}</AppText>
      <AppText accessibilityLiveRegion="polite" style={styles.value}>{copy.prepare.docsProgress(checkedCount, documents.length)}</AppText>
      <View style={styles.card}>
        {documents.map((doc, index) => {
          const checked = session.checkedDocs?.includes(doc) ?? false;
          return (
            <Pressable
              key={doc}
              accessibilityRole="checkbox"
              accessibilityLabel={doc}
              accessibilityState={{ checked, disabled: fileBusy }}
              aria-checked={checked}
              disabled={fileBusy}
              onPress={() => setSession(toggleDoc(session, doc))}
              style={({ pressed }) => [styles.document, checked && styles.documentChecked, pressed && styles.pressed]}
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked ? <Icon name="check" size={space.xl} color={colors.onPrimary} /> : null}
              </View>
              <AppText style={styles.listText}>{index + 1}. {doc}</AppText>
            </Pressable>
          );
        })}
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
        {map ? (
          <Pressable accessibilityRole="link" accessibilityLabel={`${copy.prepare.openMap}: ${procedure.office.name}`} onPress={openMap} style={({ pressed }) => [styles.address, pressed && styles.pressed]}>
            {officeAddress}
          </Pressable>
        ) : <View style={styles.address}>{officeAddress}</View>}
        <OfficeLine icon="clock" text={procedure.office.hours} />
        {procedure.office.processing ? <OfficeLine icon="hourglass" text={procedure.office.processing} /> : null}
        {exempt ? (
          <View style={styles.exemption}>
            <View style={styles.listItem}>
              <Icon name="check" color={colors.success} />
              <AppText style={[styles.listText, styles.exemptionTitle]}>{copy.prepare.feeExempt}</AppText>
            </View>
            <AppText>{exempt}</AppText>
          </View>
        ) : null}
        {procedure.office.fee ? <OfficeLine icon="money" text={procedure.office.fee} /> : null}
      </View>

      <BigButton
        variant="ghost"
        label={copy.result.newCase}
        disabled={fileBusy}
        onPress={() => {
          setSession(null);
          router.replace('/');
        }}
      />
    </Screen>
    <ActionDialog
      open={shareOpen}
      title={copy.share.dialogTitle}
      message={copy.share.copied}
      confirmLabel={copy.share.continue}
      onConfirm={() => void sendFamily()}
      cancelLabel={copy.share.cancel}
      onCancel={() => {
        setShareOpen(false);
        void stopSpeaking();
      }}
    />
    <ActionDialog
      open={notice !== null}
      title={notice?.title ?? ''}
      message={notice?.message ?? ''}
      confirmLabel={copy.counter.done}
      onConfirm={() => {
        setNotice(null);
        void stopSpeaking();
      }}
    />
    </>
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
  document: { minHeight: touch, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius, borderWidth: 1, borderColor: colors.border },
  documentChecked: { backgroundColor: colors.successBg },
  checkbox: { width: space.xl + space.sm, height: space.xl + space.sm, flexShrink: 0, borderWidth: 2, borderColor: colors.primary, borderRadius: space.xs, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary },
  pressed: { opacity: 0.7 },
  address: { minHeight: touch, gap: space.sm, justifyContent: 'center', paddingVertical: space.sm },
  mapLink: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  exemption: { backgroundColor: colors.successBg, borderRadius: radius, padding: space.md, gap: space.sm },
  exemptionTitle: { color: colors.success, fontWeight: '700' },
});
