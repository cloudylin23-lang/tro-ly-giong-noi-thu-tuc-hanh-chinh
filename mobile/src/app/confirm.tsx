// Màn 2 — AI luôn xác nhận thủ tục trước khi đi tiếp, không tự đoán rồi làm luôn
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Bubble } from '@/components/Bubble';
import { Screen } from '@/components/Screen';
import { copy } from '@/copy';
import { getProcedure } from '@/data/procedures';
import { newSession } from '@/lib/flow';
import { speak } from '@/lib/speech';
import { useSession } from '@/state/SessionContext';
import { space } from '@/theme';

export default function Confirm() {
  const { procedureId, reply } = useLocalSearchParams<{ procedureId: string; reply?: string }>();
  const procedure = getProcedure(procedureId);
  const { setSession } = useSession();

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
    <Screen
      footer={
        <View style={styles.buttons}>
          <BigButton variant="success" label={`✅  ${copy.confirm.yes}`} onPress={yes} />
          <BigButton variant="secondary" label={`✖️  ${copy.confirm.no}`} onPress={no} />
        </View>
      }
    >
      <View style={styles.body}>
        <Bubble onPress={() => void speak(line)}>{line}</Bubble>
        <AppText variant="hero" style={styles.name}>
          {procedure.name}
        </AppText>
        <AppText variant="muted" style={styles.center}>
          Bấm vào khung chữ để nghe lại
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', gap: space.lg },
  name: { textAlign: 'center' },
  center: { textAlign: 'center' },
  buttons: { gap: space.sm },
});
