import { StyleSheet, View } from 'react-native';
import { copy } from '@/copy';
import { colors, space } from '@/theme';
import { AppText } from './AppText';

export function ProgressBar({ current, total, done }: { current: number; total: number; done: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <View style={styles.wrap} accessibilityLabel={copy.ask.step(current, total)}>
      <AppText variant="small" style={styles.label}>
        {copy.ask.step(current, total)}
      </AppText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  label: { fontWeight: '700', color: colors.text },
  track: { height: 14, borderRadius: 7, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 7 },
});
