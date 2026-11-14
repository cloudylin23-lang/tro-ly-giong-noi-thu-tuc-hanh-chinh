import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { copy } from '@/copy';
import { getProcedure } from '@/data/procedures';
import { counterRows } from '@/lib/flow';
import { stopSpeaking } from '@/lib/speech';
import { useSession } from '@/state/SessionContext';
import { colors, counterFont, layout, space } from '@/theme';

export default function Counter() {
  const { session, hydrated } = useSession();
  const procedure = getProcedure(session?.procedureId);

  useEffect(() => { void stopSpeaking(); }, []);

  if (!hydrated) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  if (!procedure || !session) return <Redirect href="/" />;

  const rows = counterRows(procedure, session);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppHeader subtitle={copy.counter.handOver} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.page}>
          <AppText variant="title" accessibilityRole="header">{procedure.formTitle}</AppText>
          {rows.map((row) => (
            <View key={row.label} style={styles.row}>
              <AppText variant="muted">{row.label}</AppText>
              <AppText selectable style={styles.value}>{row.value}</AppText>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <BigButton label={copy.counter.done} onPress={() => router.back()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  content: { flexGrow: 1, paddingHorizontal: '2%', paddingVertical: space.lg },
  page: { width: '100%', maxWidth: layout.pageWidth, alignSelf: 'center', gap: space.lg },
  row: { gap: space.sm, paddingBottom: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  value: { fontSize: counterFont, lineHeight: counterFont * 1.4, fontWeight: '700' },
  footer: { paddingHorizontal: '2%', paddingVertical: space.sm, backgroundColor: colors.surface },
  footerContent: { width: '100%', maxWidth: layout.pageWidth, alignSelf: 'center' },
});
