import { StyleSheet, View } from 'react-native';
import { copy } from '@/copy';
import { colors, headerFont, layout, space } from '@/theme';
import { AppText } from './AppText';

/** Header cố định dùng chung: tên app và ngữ cảnh của trang hiện tại. */
export function AppHeader({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AppText accessibilityRole="header" style={styles.title}>{copy.appName}</AppText>
        {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexShrink: 0, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.header, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  content: { width: '100%', maxWidth: layout.pageWidth, alignSelf: 'center', gap: space.xs },
  title: { color: colors.onHeader, fontSize: headerFont.title, lineHeight: headerFont.title * 1.3, fontWeight: '600', textAlign: 'center' },
  subtitle: { color: colors.onHeader, fontSize: headerFont.subtitle, lineHeight: headerFont.subtitle * 1.4, textAlign: 'center' },
});
