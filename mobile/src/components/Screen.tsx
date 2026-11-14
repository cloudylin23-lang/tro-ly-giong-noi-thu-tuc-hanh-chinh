import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, space } from '@/theme';
import { WebBackground } from './WebBackground';
import { AppHeader } from './AppHeader';

/** Khung màn hình: nền, lề an toàn, cuộn được; footer luôn nằm dưới cùng. */
export function Screen({ children, footer, subtitle }: { children: ReactNode; footer?: ReactNode; subtitle?: string }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <WebBackground />
      <AppHeader subtitle={subtitle} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.page}>{children}</View>
      </ScrollView>
      {footer ? <View style={styles.footer}><View style={styles.footerContent}>{footer}</View></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingVertical: space.sm, paddingHorizontal: '2%', gap: space.sm },
  page: { flexGrow: 1, width: '100%', maxWidth: layout.pageWidth, alignSelf: 'center', gap: space.md, backgroundColor: 'transparent' },
  footerContent: { width: '100%', maxWidth: layout.pageWidth, alignSelf: 'center', gap: space.sm, backgroundColor: 'transparent' },
  footer: { paddingHorizontal: '2%', paddingBottom: space.sm, paddingTop: space.xs, gap: space.sm },
});
