import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, space } from '@/theme';

/** Khung màn hình: nền, lề an toàn, cuộn được; footer luôn nằm dưới cùng. */
export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.page}>{children}</View>
      </ScrollView>
      {footer ? <View style={styles.footer}><View style={styles.footerContent}>{footer}</View></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, padding: space.lg, gap: space.md },
  page: { flexGrow: 1, width: '100%', maxWidth: layout.pageWidth, alignSelf: 'center', gap: space.md },
  footerContent: { width: '100%', maxWidth: layout.pageWidth, alignSelf: 'center', gap: space.sm },
  footer: { paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm, gap: space.sm },
});
