// Màn 2 — AI luôn xác nhận thủ tục trước khi đi tiếp, không tự đoán rồi làm luôn
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { CancelProcedure } from '@/components/CancelProcedure';
import { WebBackground } from '@/components/WebBackground';
import { AppHeader } from '@/components/AppHeader';
import { copy } from '@/copy';
import { getProcedure } from '@/data/procedures';
import { newSession } from '@/lib/flow';
import { speak, stopSpeaking } from '@/lib/speech';
import { useSession } from '@/state/SessionContext';
import { colors, layout, space, touch } from '@/theme';

export default function Confirm() {
  const { procedureId, reply } = useLocalSearchParams<{ procedureId: string; reply?: string }>();
  const procedure = getProcedure(procedureId);
  const { setSession } = useSession();
  const [cancelOpen, setCancelOpen] = useState(false);

  const line = `${reply || `Con hiểu là bác muốn làm thủ tục ${procedure?.name}.`} ${copy.confirm.ask}`;

  useEffect(() => {
    if (procedure) void speak(line);
  }, [procedure, line]);

  if (!procedure) return <Redirect href="/" />;

  const yes = () => {
    setSession(newSession(procedure.id));
    router.replace('/ask');
  };

  const no = () => {
    void speak(copy.confirm.retry);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <WebBackground />
      <AppHeader subtitle={copy.header.confirm} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.sheet}>
          <View accessible={false} style={styles.badge}>
            <View style={styles.badgePetal} />
            <View style={styles.check} />
          </View>
          <AppText variant="hero" style={styles.center}>
            {procedure.name}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${line} ${copy.confirm.replayHint}`}
            onPress={() => void speak(line)}
            style={({ pressed }) => [styles.message, pressed && styles.messagePressed]}
          >
            <AppText style={styles.center}>{line}</AppText>
            <AppText variant="muted" style={styles.center}>
              {copy.confirm.replayHint}
            </AppText>
          </Pressable>
          <View style={styles.buttons}>
            <BigButton variant="important" label={copy.confirm.yes} onPress={yes} />
            <BigButton variant="secondary" label={copy.confirm.no} onPress={no} />
            <CancelProcedure
              open={cancelOpen}
              onOpenChange={setCancelOpen}
              hasDraft={false}
              onConfirm={() => {
                void stopSpeaking();
                router.dismissTo('/');
              }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: space.lg,
    paddingHorizontal: '2%',
    paddingBottom: space.sm,
  },
  sheet: {
    width: '100%',
    maxWidth: layout.pageWidth,
    backgroundColor: 'transparent',
    borderRadius: space.xl,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    alignItems: 'center',
    gap: space.lg,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  badgePetal: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.accent,
    transform: [{ rotate: '45deg' }],
  },
  check: {
    width: 36,
    height: 20,
    borderLeftWidth: 5,
    borderBottomWidth: 5,
    borderColor: colors.text,
    transform: [{ translateY: -4 }, { rotate: '-45deg' }],
  },
  center: { textAlign: 'center' },
  message: { minHeight: touch, alignSelf: 'stretch', gap: space.sm, paddingVertical: space.xs },
  messagePressed: { opacity: 0.7 },
  buttons: { alignSelf: 'stretch', gap: space.sm, marginTop: space.sm },
});
